import type { ChatId } from "../chat-kernel/index.js";
import type { WorldChatMessage, WorldSnapshot } from "../world-domain/index.js";
import type {
  ChatView,
  ExperienceLayerView,
  InputPanelView,
  MessagePresentationView,
  MinimalProductView,
  WorldListView,
  WorldView
} from "./types.js";

export type ExperienceRenderOptions = Readonly<{
  readonly showEntryMoment?: boolean;
}>;

export function renderMinimalProductView(
  snapshot: WorldSnapshot,
  options: ExperienceRenderOptions = Object.freeze({})
): MinimalProductView {
  return Object.freeze({
    snapshot,
    worldList: renderWorldListView(snapshot),
    chat: renderChatView(snapshot),
    world: renderWorldView(snapshot),
    inputPanel: renderInputPanel(snapshot),
    experience: renderExperienceLayer(snapshot, options)
  });
}

export function renderWorldListView(snapshot: WorldSnapshot): WorldListView {
  return Object.freeze({
    activeWorld: Object.freeze({
      worldId: snapshot.worldMeta.id,
      title: snapshot.worldMeta.title,
      type: snapshot.worldMeta.type,
      lifecycle: snapshot.worldMeta.lifecycle,
      memoryNamespace: snapshot.memorySummary.namespace
    })
  });
}

export function renderChatView(snapshot: WorldSnapshot): ChatView {
  const activeChat = snapshot.chatState.activeChatId
    ? snapshot.chatState.chats.get(snapshot.chatState.activeChatId) ?? null
    : null;

  if (!activeChat) {
    return Object.freeze({
      chatId: null,
      title: snapshot.worldMeta.title,
      messages: []
    });
  }

  return Object.freeze({
    chatId: activeChat.id as ChatId,
    title: activeChat.title,
    messages: activeChat.messages.map((message) =>
      Object.freeze({
        messageId: message.id,
        authorName: contactName(snapshot, message.authorActorId),
        outputMode: contactOutputMode(snapshot, message.authorActorId),
        presentation: renderMessagePresentation(message.text, contactOutputMode(snapshot, message.authorActorId)),
        text: message.text,
        createdAt: message.createdAt
      })
    )
  });
}

export function renderWorldView(snapshot: WorldSnapshot): WorldView {
  return Object.freeze({
    worldMeta: snapshot.worldMeta,
    contacts: snapshot.contacts,
    groups: snapshot.groups,
    memorySummary: snapshot.memorySummary,
    runtimeState: snapshot.runtimeState
  });
}

export function renderInputPanel(snapshot: WorldSnapshot): InputPanelView {
  return Object.freeze({
    targetWorldId: snapshot.worldMeta.id,
    targetChatId: snapshot.chatState.activeChatId as ChatId | null,
    ownerActorId: snapshot.worldMeta.ownerActorId,
    placeholder: `Message ${snapshot.worldMeta.title}`,
    canSubmit: snapshot.worldMeta.lifecycle !== "paused" && snapshot.worldMeta.lifecycle !== "archived" && Boolean(snapshot.chatState.activeChatId)
  });
}

export function renderExperienceLayer(
  snapshot: WorldSnapshot,
  options: ExperienceRenderOptions = Object.freeze({})
): ExperienceLayerView {
  const messages = activeMessages(snapshot);
  const lastMessage = messages.at(-1) ?? null;
  const lastAuthor = lastMessage ? snapshot.contacts.find((contact) => contact.actorId === lastMessage.authorActorId) ?? null : null;
  const assistant = snapshot.contacts.find((contact) => contact.actorId === snapshot.worldMeta.assistantActorId)
    ?? snapshot.contacts.find((contact) => contact.kind === "assistant")
    ?? null;
  const hasHumanMessage = messages.some((message) =>
    snapshot.contacts.find((contact) => contact.actorId === message.authorActorId)?.kind === "human"
  );
  const hasUnreadAssistantMessage = Boolean(lastAuthor?.kind === "assistant" && !hasHumanMessage);
  const state = aiPresenceState(snapshot, lastAuthor?.kind ?? null);

  return Object.freeze({
    worldEntrance: Object.freeze({
      state: options.showEntryMoment === true ? "entering" : "settled",
      visible: options.showEntryMoment === true,
      text: `Entering ${snapshot.worldMeta.title}`
    }),
    contextualPresence: Object.freeze({
      situation: `${snapshot.worldMeta.title} is ${snapshot.worldMeta.lifecycle}.`,
      narrativeState: snapshot.worldMeta.type === "reality"
        ? "Reality is available for clear answers and grounded tasks."
        : "A quiet conversational world is already in motion."
    }),
    firstInteractionHint: Object.freeze({
      kind: hasUnreadAssistantMessage ? "unread-message" : hasHumanMessage ? "world-status-event" : "ai-prompt",
      text: hasUnreadAssistantMessage
        ? `${assistant?.displayName ?? "Someone"} left you a message.`
        : hasHumanMessage
          ? "The world is listening."
          : `${assistant?.displayName ?? "ovOne"} is ready when you are.`
    }),
    aiPresence: Object.freeze({
      state,
      text: presenceText(state, assistant?.displayName ?? "ovOne")
    })
  });
}

export function renderMessagePresentation(
  text: string,
  outputMode: "QA" | "Dialogue"
): MessagePresentationView {
  if (outputMode === "QA") {
    return Object.freeze({
      mode: "QA",
      rhythm: "single-block",
      segments: Object.freeze([
        Object.freeze({
          text,
          pauseAfterMs: 0
        })
      ])
    });
  }

  return Object.freeze({
    mode: "Dialogue",
    rhythm: "conversational",
    segments: splitDialogue(text).map((segment, index) =>
      Object.freeze({
        text: segment,
        pauseAfterMs: dialoguePauseAfter(index, segment)
      })
    )
  });
}

function contactName(snapshot: WorldSnapshot, actorId: string): string {
  const contact = snapshot.contacts.find((candidate) => candidate.actorId === actorId);
  if (!contact) {
    throw new Error(`MinimalUiShell: actor "${actorId}" is not present in WorldSnapshot.`);
  }
  return contact.displayName;
}

function contactOutputMode(snapshot: WorldSnapshot, actorId: string): "QA" | "Dialogue" {
  const contact = snapshot.contacts.find((candidate) => candidate.actorId === actorId);
  if (!contact) {
    throw new Error(`MinimalUiShell: actor "${actorId}" is not present in WorldSnapshot.`);
  }
  return contact.outputMode;
}

function activeMessages(snapshot: WorldSnapshot): readonly WorldChatMessage[] {
  const activeChat = snapshot.chatState.activeChatId
    ? snapshot.chatState.chats.get(snapshot.chatState.activeChatId) ?? null
    : null;
  return activeChat?.messages ?? [];
}

function splitDialogue(text: string): readonly string[] {
  const segments = text
    .split(/(?<=[.!?])\s+/u)
    .map((segment) => segment.trim())
    .filter(Boolean);
  return segments.length > 0 ? segments : [text];
}

function dialoguePauseAfter(index: number, segment: string): number {
  const lengthOffset = Math.min(180, Math.max(0, segment.length - 18) * 4);
  const cadence = [180, 340, 260, 420][index % 4] ?? 240;
  return cadence + lengthOffset;
}

function aiPresenceState(
  snapshot: WorldSnapshot,
  lastAuthorKind: string | null
): "ACTIVE" | "IDLE" | "REACTIVE" {
  if (lastAuthorKind === "human") {
    return "ACTIVE";
  }
  if (snapshot.worldMeta.lifecycle !== "active") {
    return "REACTIVE";
  }
  if (activeMessages(snapshot).length === 0) {
    return "REACTIVE";
  }
  return "IDLE";
}

function presenceText(state: "ACTIVE" | "IDLE" | "REACTIVE", name: string): string {
  switch (state) {
    case "ACTIVE":
      return `${name} is responding.`;
    case "REACTIVE":
      return `${name} noticed a world event.`;
    case "IDLE":
      return `${name} is present.`;
  }
}
