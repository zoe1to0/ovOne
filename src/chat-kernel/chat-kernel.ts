import { enqueuePatch, queueForWorldState, reducePatchQueue } from "../patch-queue/index.js";
import type {
  ChatEventId,
  ChatId,
  ChatKernelEvent,
  ChatKernelState,
  ChatMessage,
  ChatSession,
  MessageId
} from "./types.js";

export function createInitialChatState(state: ChatKernelState): ChatKernelState {
  return state;
}

export function transition(state: ChatKernelState, event: ChatKernelEvent): ChatKernelState {
  const queue = queueForWorldState(state);
  if (event.worldId !== state.world.id) {
    throw new Error("ChatKernel: event belongs to a different world.");
  }
  if (state.world.lifecycle === "paused" || state.world.lifecycle === "archived") {
    throw new Error(`ChatKernel: ${state.world.lifecycle} worlds do not process events.`);
  }

  switch (event.type) {
    case "chat.started": {
      if (state.chat.chats.has(event.payload.chatId)) {
        throw new Error(`ChatKernel: chat "${event.payload.chatId}" already exists.`);
      }

      const chat = Object.freeze({
        id: event.payload.chatId,
        worldId: event.worldId,
        title: event.payload.title,
        messages: []
      }) satisfies ChatSession;

      return reducePatchQueue(
        enqueuePatch(
          enqueuePatch(queue, {
            source: "kernel",
            targetField: "chat.chats",
            operation: "upsert",
            timestamp: event.timestamp,
            value: chat
          }),
          {
            source: "kernel",
            targetField: "chat.activeChatId",
            operation: "set",
            timestamp: event.timestamp,
            value: event.payload.chatId
          }
        )
      );
    }

    case "chat.selected": {
      assertChatExists(state, event.payload.chatId);
      return reducePatchQueue(
        enqueuePatch(queue, {
          source: "kernel",
          targetField: "chat.activeChatId",
          operation: "set",
          timestamp: event.timestamp,
          value: event.payload.chatId
        })
      );
    }

    case "message.submitted": {
      const chat = assertChatExists(state, event.payload.chatId);
      if (!state.contacts.some((contact) => contact.actorId === event.payload.authorActorId)) {
        throw new Error("ChatKernel: message author actor is not defined in WorldState.");
      }

      const message = Object.freeze({
        id: event.payload.messageId,
        authorActorId: event.payload.authorActorId,
        text: event.payload.text,
        createdAt: event.payload.createdAt
      }) satisfies ChatMessage;

      return reducePatchQueue(
        enqueuePatch(queue, {
          source: "kernel",
          targetField: "chat.chats",
          operation: "upsert",
          timestamp: event.timestamp,
          value: Object.freeze({
            ...chat,
            messages: [...chat.messages, message]
          })
        })
      );
    }
  }
}

export function transitionAll(
  state: ChatKernelState,
  events: readonly ChatKernelEvent[]
): ChatKernelState {
  return sortEvents(events).reduce((nextState, event) => transition(nextState, event), state);
}

export function toChatId(value: string): ChatId {
  if (!value.trim()) {
    throw new Error("ChatKernel: chat id cannot be empty.");
  }
  return value as ChatId;
}

export function toMessageId(value: string): MessageId {
  if (!value.trim()) {
    throw new Error("ChatKernel: message id cannot be empty.");
  }
  return value as MessageId;
}

export function toChatEventId(value: string): ChatEventId {
  if (!value.trim()) {
    throw new Error("ChatKernel: event id cannot be empty.");
  }
  return value as ChatEventId;
}

export function sortEvents(events: readonly ChatKernelEvent[]): readonly ChatKernelEvent[] {
  return Object.freeze(
    [...events].sort((left, right) => {
      if (left.timestamp !== right.timestamp) {
        return left.timestamp - right.timestamp;
      }
      return left.id.localeCompare(right.id);
    })
  );
}

function assertChatExists(state: ChatKernelState, chatId: ChatId): ChatSession {
  const chat = state.chat.chats.get(chatId) as ChatSession | undefined;
  if (!chat) {
    throw new Error(`ChatKernel: unknown chat "${chatId}".`);
  }
  return chat;
}
