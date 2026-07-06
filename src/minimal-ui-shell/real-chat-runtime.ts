import type { AppRuntime } from "../app/index.js";
import { toChatEventId, toMessageId, transition } from "../chat-kernel/index.js";
import type { ChatId, MessageId } from "../chat-kernel/index.js";
import { callAIProviderChat, createAIProviderBridge } from "../domain/index.js";
import type { AIProviderBridge, AIProviderChatRequest, AIProviderMessage } from "../domain/index.js";
import type { WorldChatMessage, WorldChatSession, WorldContact, WorldId, WorldState } from "../world-domain/index.js";

export const REAL_CHAT_PROVIDER_FAILURE_PREFIX = "AI provider error:";

export type RealChatRuntimeInput = Readonly<{
  readonly app: AppRuntime;
  readonly worldId: WorldId;
  readonly text: string;
  readonly bridge?: AIProviderBridge;
  readonly nextSequence: () => number;
}>;

export type RealChatRuntimeResult = Readonly<{
  readonly worldId: WorldId;
  readonly chatId: string;
  readonly responderActorId: string;
  readonly providerStatus: "ok" | "provider-not-configured" | "provider-error";
  readonly userMessageText: string;
  readonly assistantMessageText: string;
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
  const responder = resolveResponder(userMessageState, chatId);
  const request = buildProviderRequest(userMessageState, chatId, responder);
  const bridge = input.bridge ?? createAIProviderBridge({ provider: "mock", model: "mock-trial" });
  const response = await callAIProviderChat(bridge, request);
  const assistantText = response.ok
    ? response.text
    : `${REAL_CHAT_PROVIDER_FAILURE_PREFIX} ${response.error?.message ?? "Provider call failed."}`;
  appendMessage({
    app: input.app,
    state: input.app.worldDomain.getWorldState(input.worldId),
    worldId: input.worldId,
    chatId,
    authorActorId: responder.actorId,
    text: assistantText,
    sequence: input.nextSequence()
  });

  return Object.freeze({
    worldId: input.worldId,
    chatId,
    responderActorId: responder.actorId,
    providerStatus: response.status,
    userMessageText: trimmed,
    assistantMessageText: assistantText
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
    const groupResponder = group.actorIds
      .map((actorId) => state.contacts.find((contact) => contact.actorId === actorId) ?? null)
      .find((contact): contact is WorldContact =>
        Boolean(contact && contact.kind === "assistant" && contact.actorId !== state.world.assistantActorId)
      );
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
    group ? `This is group chat ${chat.title}; respond as the first available AI member only.` : `This is a private chat.`
  ];
  if (responder.worldRoleName?.trim()) {
    identity.push(`World role: ${responder.worldRoleName}.`);
  }
  if (responder.worldPersonaNotes?.trim()) {
    identity.push(`World persona notes: ${responder.worldPersonaNotes}.`);
  }
  return identity.join(" ");
}
