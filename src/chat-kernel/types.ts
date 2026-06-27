import type {
  WorldChatMessage,
  WorldChatSession,
  WorldId,
  WorldState
} from "../world-domain/index.js";

export type ChatId = string & { readonly __brand: "ChatId" };
export type MessageId = string & { readonly __brand: "MessageId" };
export type ChatEventId = string & { readonly __brand: "ChatEventId" };

export type ChatMessage = WorldChatMessage & Readonly<{ readonly id: MessageId }>;
export type ChatSession = WorldChatSession & Readonly<{ readonly id: ChatId }>;
export type ChatKernelState = WorldState;

export type ChatKernelEvent =
  | Readonly<{
      readonly id: ChatEventId;
      readonly type: "chat.started";
      readonly worldId: WorldId;
      readonly timestamp: number;
      readonly payload: Readonly<{
        readonly chatId: ChatId;
        readonly title: string;
      }>;
    }>
  | Readonly<{
      readonly id: ChatEventId;
      readonly type: "chat.selected";
      readonly worldId: WorldId;
      readonly timestamp: number;
      readonly payload: Readonly<{
        readonly chatId: ChatId;
      }>;
    }>
  | Readonly<{
      readonly id: ChatEventId;
      readonly type: "message.submitted";
      readonly worldId: WorldId;
      readonly timestamp: number;
      readonly payload: Readonly<{
        readonly chatId: ChatId;
        readonly messageId: MessageId;
        readonly authorActorId: string;
        readonly text: string;
        readonly createdAt: number;
      }>;
    }>;
