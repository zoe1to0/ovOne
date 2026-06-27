import type { ChatId, ChatKernelEvent } from "../chat-kernel/index.js";
import type { WorldSnapshot } from "../world-domain/index.js";

export type ChatListItemView = Readonly<{
  readonly chatId: ChatId;
  readonly title: string;
  readonly worldId: string;
  readonly active: boolean;
  readonly lastMessagePreview: string | null;
}>;

export type ChatPageView = Readonly<{
  readonly chatId: ChatId;
  readonly title: string;
  readonly messages: readonly Readonly<{
    readonly messageId: string;
    readonly authorName: string;
    readonly authorKind: string;
    readonly text: string;
    readonly createdAt: number;
  }>[];
}>;

export type UiRenderModel = Readonly<{
  readonly chatList: readonly ChatListItemView[];
  readonly chatPage: ChatPageView | null;
}>;

export type Renderer = Readonly<{
  readonly render: (snapshot: WorldSnapshot) => UiRenderModel;
  readonly dispatch: (event: ChatKernelEvent) => ChatKernelEvent;
}>;
