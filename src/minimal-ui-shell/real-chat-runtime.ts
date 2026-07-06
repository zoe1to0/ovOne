import type { AppRuntime } from "../app/index.js";
import { toChatEventId, toMessageId, transition } from "../chat-kernel/index.js";
import type { ChatId, MessageId } from "../chat-kernel/index.js";
import { callAIProviderChat, createAIProviderBridge } from "../domain/index.js";
import type { AIProviderBridge, AIProviderChatRequest, AIProviderMessage } from "../domain/index.js";
import type { WorldChatMessage, WorldChatSession, WorldContact, WorldId, WorldState } from "../world-domain/index.js";

export const REAL_CHAT_PROVIDER_FAILURE_PREFIX = "AI provider error:";
export const GROUP_BURST_MAX_REPLY_TURNS = 3;

export type RealChatRuntimeInput = Readonly<{
  readonly app: AppRuntime;
  readonly worldId: WorldId;
  readonly text: string;
  readonly bridge?: AIProviderBridge;
  readonly random?: () => number;
  readonly nextSequence: () => number;
}>;

export type RealChatRuntimeAssistantTurn = Readonly<{
  readonly responderActorId: string;
  readonly providerStatus: "ok" | "provider-not-configured" | "provider-error";
  readonly messageText: string;
}>;

export type RealChatRuntimeResult = Readonly<{
  readonly worldId: WorldId;
  readonly chatId: string;
  readonly responderActorId: string;
  readonly providerStatus: "ok" | "provider-not-configured" | "provider-error";
  readonly userMessageText: string;
  readonly assistantMessageText: string;
  readonly replyTurnCount: number;
  readonly assistantTurns: readonly RealChatRuntimeAssistantTurn[];
}>;

export async function sendMessageThroughRealChatRuntime(input: RealChatRuntimeInput): Promise<RealChatRuntimeResult> {
  const trimmed = input.text.trim();
  if (!trimmed) {
    throw new Error("RealChatRuntime: message text cannot be empty.");
  }

  const initialState = input.app.worldDomain.getWorldState(input.worldId);
  const chatId = initialState.chat.activeChatId;
  if (!chatId) {
    throw new Error(`RealChatRuntime: world "${input.worldId}" does not have an active chat.`);
  }

  const userMessageState = appendMessage({
    app: input.app,
    state: initialState,
    worldId: input.worldId,
    chatId,
    authorActorId: initialState.world.ownerActorId,
    text: trimmed,
    sequence: input.nextSequence()
  });
  const bridge = input.bridge ?? createAIProviderBridge({ provider: "mock", model: "mock-trial" });
  const assistantTurns = isGroupChat(userMessageState, chatId)
    ? await runGroupBurst({
        ...input,
        bridge,
        chatId,
        state: userMessageState
      })
    : [await runSingleAssistantTurn({
        app: input.app,
        worldId: input.worldId,
        chatId,
        bridge,
        responder: resolveResponder(userMessageState, chatId),
        nextSequence: input.nextSequence
      })];
  const firstTurn = assistantTurns[0];
  if (!firstTurn) {
    throw new Error(`RealChatRuntime: no AI response was produced for chat "${chatId}".`);
  }

  return Object.freeze({
    worldId: input.worldId,
    chatId,
    responderActorId: firstTurn.responderActorId,
    providerStatus: firstTurn.providerStatus,
    userMessageText: trimmed,
    assistantMessageText: firstTurn.messageText,
    replyTurnCount: assistantTurns.length,
    assistantTurns: Object.freeze(assistantTurns)
  });
}

export function buildProviderRequest(
  state: WorldState,
  chatId: string,
  responder: WorldContact
): AIProviderChatRequest {
  const chat = activeChat(state, chatId);
  const messages = chat.messages.slice(-12).map((message) => providerMessageForChatMessage(state, responder, message));
  return Object.freeze({
    messages: Object.freeze([
      Object.freeze({
        role: "system",
        content: systemPromptForResponder(state, chat, responder)
      }),
      ...messages
    ] satisfies AIProviderMessage[]),
    temperature: 0.7,
    maxTokens: 600
  });
}

export function resolveResponder(state: WorldState, chatId: string): WorldContact {
  const group = state.groups.find((candidate) => candidate.id === chatId) ?? null;
  if (group) {
    const groupResponder = resolveGroupResponders(state, chatId)[0];
    if (groupResponder) {
      return groupResponder;
    }
  }

  const privateResponder = state.contacts.find((contact) =>
    contact.kind === "assistant" &&
    contact.actorId !== state.world.assistantActorId &&
    chatId.endsWith(`:${contact.actorId}`)
  );
  if (privateResponder) {
    return privateResponder;
  }

  const systemAssistant = state.contacts.find((contact) => contact.actorId === state.world.assistantActorId);
  if (systemAssistant) {
    return systemAssistant;
  }

  const fallbackAssistant = state.contacts.find((contact) => contact.kind === "assistant");
  if (!fallbackAssistant) {
    throw new Error(`RealChatRuntime: no AI responder is available in world "${state.world.id}".`);
  }
  return fallbackAssistant;
}

export function resolveGroupResponders(state: WorldState, chatId: string): readonly WorldContact[] {
  const group = state.groups.find((candidate) => candidate.id === chatId) ?? null;
  if (!group) {
    return Object.freeze([]);
  }
  return Object.freeze(group.actorIds.flatMap((actorId) => {
    const contact = state.contacts.find((candidate) => candidate.actorId === actorId) ?? null;
    return contact && contact.kind === "assistant" && contact.actorId !== state.world.assistantActorId
      ? [contact]
      : [];
  }));
}

function isGroupChat(state: WorldState, chatId: string): boolean {
  return state.groups.some((group) => group.id === chatId);
}

async function runGroupBurst(input: Readonly<{
  readonly app: AppRuntime;
  readonly worldId: WorldId;
  readonly chatId: string;
  readonly bridge: AIProviderBridge;
  readonly state: WorldState;
  readonly random?: () => number;
  readonly nextSequence: () => number;
}>): Promise<readonly RealChatRuntimeAssistantTurn[]> {
  const responders = resolveGroupResponders(input.state, input.chatId);
  if (responders.length === 0) {
    throw new Error(`RealChatRuntime: no group AI responder is available in chat "${input.chatId}".`);
  }
  const replyTurnCount = responders.length === 1
    ? 1
    : randomReplyTurnCount(input.random ?? Math.random);
  const turns: RealChatRuntimeAssistantTurn[] = [];
  let previousResponderActorId: string | null = null;
  for (let turn = 0; turn < replyTurnCount; turn += 1) {
    const state = input.app.worldDomain.getWorldState(input.worldId);
    const eligible = resolveGroupResponders(state, input.chatId);
    if (eligible.length === 0) {
      break;
    }
    const responder = chooseGroupResponder(eligible, previousResponderActorId, input.random ?? Math.random);
    const assistantTurn = await runSingleAssistantTurn({
      app: input.app,
      worldId: input.worldId,
      chatId: input.chatId,
      bridge: input.bridge,
      responder,
      nextSequence: input.nextSequence
    });
    turns.push(assistantTurn);
    previousResponderActorId = responder.actorId;
    if (assistantTurn.providerStatus !== "ok") {
      break;
    }
  }
  return Object.freeze(turns);
}

async function runSingleAssistantTurn(input: Readonly<{
  readonly app: AppRuntime;
  readonly worldId: WorldId;
  readonly chatId: string;
  readonly bridge: AIProviderBridge;
  readonly responder: WorldContact;
  readonly nextSequence: () => number;
}>): Promise<RealChatRuntimeAssistantTurn> {
  const state = input.app.worldDomain.getWorldState(input.worldId);
  const request = buildProviderRequest(state, input.chatId, input.responder);
  const response = await callAIProviderChat(input.bridge, request);
  const assistantText = response.ok
    ? response.text
    : `${REAL_CHAT_PROVIDER_FAILURE_PREFIX} ${response.error?.message ?? "Provider call failed."}`;
  appendMessage({
    app: input.app,
    state: input.app.worldDomain.getWorldState(input.worldId),
    worldId: input.worldId,
    chatId: input.chatId,
    authorActorId: input.responder.actorId,
    text: assistantText,
    sequence: input.nextSequence()
  });
  return Object.freeze({
    responderActorId: input.responder.actorId,
    providerStatus: response.status,
    messageText: assistantText
  });
}

function randomReplyTurnCount(random: () => number): number {
  return 1 + Math.floor(clampRandom(random()) * GROUP_BURST_MAX_REPLY_TURNS);
}

function chooseGroupResponder(
  responders: readonly WorldContact[],
  previousResponderActorId: string | null,
  random: () => number
): WorldContact {
  const eligible = responders.length > 1 && previousResponderActorId
    ? responders.filter((responder) => responder.actorId !== previousResponderActorId)
    : responders;
  const index = Math.min(eligible.length - 1, Math.floor(clampRandom(random()) * eligible.length));
  const responder = eligible[index];
  if (!responder) {
    throw new Error("RealChatRuntime: failed to choose group responder.");
  }
  return responder;
}

function clampRandom(value: number): number {
  return Number.isFinite(value)
    ? Math.min(0.999999, Math.max(0, value))
    : 0;
}

function appendMessage(input: Readonly<{
  readonly app: AppRuntime;
  readonly state: WorldState;
  readonly worldId: WorldId;
  readonly chatId: string;
  readonly authorActorId: string;
  readonly text: string;
  readonly sequence: number;
}>): WorldState {
  const timestamp = 10000 + input.sequence;
  const nextState = transition(input.state, {
    id: toChatEventId(`event:real-chat:${input.worldId}:${input.chatId}:${input.sequence}`),
    type: "message.submitted",
    worldId: input.worldId,
    timestamp,
    payload: {
      chatId: input.chatId as ChatId,
      messageId: toMessageId(`message:real-chat:${input.worldId}:${input.chatId}:${input.sequence}`) as MessageId,
      authorActorId: input.authorActorId,
      text: input.text,
      createdAt: timestamp
    }
  });
  input.app.worldDomain.commitState(nextState);
  return nextState;
}

function activeChat(state: WorldState, chatId: string): WorldChatSession {
  const chat = state.chat.chats.get(chatId);
  if (!chat) {
    throw new Error(`RealChatRuntime: chat "${chatId}" does not exist in world "${state.world.id}".`);
  }
  return chat;
}

function providerMessageForChatMessage(
  state: WorldState,
  responder: WorldContact,
  message: WorldChatMessage
): AIProviderMessage {
  const author = state.contacts.find((contact) => contact.actorId === message.authorActorId);
  if (author?.kind === "human") {
    return Object.freeze({ role: "user", content: message.text });
  }
  return Object.freeze({
    role: message.authorActorId === responder.actorId ? "assistant" : "user",
    content: message.text
  });
}

function systemPromptForResponder(state: WorldState, chat: WorldChatSession, responder: WorldContact): string {
  const group = state.groups.find((candidate) => candidate.id === chat.id) ?? null;
  const identity = [
    `You are ${responder.displayName}.`,
    `You are replying inside world ${state.world.title}.`,
    group ? `This is group chat ${chat.title}; respond only for your current burst turn.` : `This is a private chat.`
  ];
  if (responder.worldRoleName?.trim()) {
    identity.push(`World role: ${responder.worldRoleName}.`);
  }
  if (responder.worldPersonaNotes?.trim()) {
    identity.push(`World persona notes: ${responder.worldPersonaNotes}.`);
  }
  return identity.join(" ");
}
