import type { ChatId, ChatKernelEvent } from "../chat-kernel/index.js";
import type { Renderer, UiRenderModel } from "./types.js";
import type { WorldSnapshot } from "../world-domain/index.js";

export function createRenderer(): Renderer {
  return Object.freeze({
    render,
    dispatch
  });
}

export function render(snapshot: WorldSnapshot): UiRenderModel {
  const activeChat = snapshot.chatState.activeChatId ? snapshot.chatState.chats.get(snapshot.chatState.activeChatId) ?? null : null;

  return Object.freeze({
    chatList: [...snapshot.chatState.chats.values()].map((chat) =>
      Object.freeze({
        chatId: chat.id as ChatId,
        title: chat.title,
        worldId: chat.worldId,
        active: chat.id === snapshot.chatState.activeChatId,
        lastMessagePreview: chat.messages.at(-1)?.text ?? null
      })
    ),
    chatPage: activeChat
      ? Object.freeze({
          chatId: activeChat.id as ChatId,
          title: activeChat.title,
          messages: activeChat.messages.map((message) =>
            Object.freeze({
              messageId: message.id,
              authorName: getContact(snapshot, message.authorActorId).displayName,
              authorKind: getContact(snapshot, message.authorActorId).kind,
              text: message.text,
              createdAt: message.createdAt
            })
          )
        })
      : null
  });
}

export function dispatch(event: ChatKernelEvent): ChatKernelEvent {
  return event;
}

function getContact(snapshot: WorldSnapshot, actorId: string): WorldSnapshot["contacts"][number] {
  const contact = snapshot.contacts.find((candidate) => candidate.actorId === actorId);
  if (!contact) {
    throw new Error(`UI: actor "${actorId}" is not present in WorldState contacts.`);
  }
  return contact;
}
