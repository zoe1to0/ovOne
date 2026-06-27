import type { AppRuntime } from "../app/index.js";
import type { ChatId, ChatKernelEvent } from "../chat-kernel/index.js";
import type { UiRenderModel } from "../ui/index.js";
import type { WorldSnapshot } from "../world-domain/index.js";

export type AppScreen = "chat" | "world" | "contacts";
export type ChatScreenMode = "list" | "view";

export type AppShellView = Readonly<{
  readonly screen: AppScreen;
  readonly chatMode: ChatScreenMode;
  readonly snapshot: WorldSnapshot;
  readonly ui: UiRenderModel;
  readonly worlds: readonly Readonly<{
    readonly worldId: string;
    readonly title: string;
    readonly type: string;
  }>[];
  readonly contacts: readonly Readonly<{
    readonly worldId: string;
    readonly actorId: string;
    readonly displayName: string;
    readonly kind: string;
  }>[];
}>;

export type AppShellInteraction =
  | Readonly<{
      readonly type: "screen.opened";
      readonly screen: AppScreen;
    }>
  | Readonly<{
      readonly type: "chat.list.opened";
    }>
  | Readonly<{
      readonly type: "chat.view.opened";
      readonly chatId?: ChatId;
    }>;

export type AppShellRuntime = Readonly<{
  readonly app: AppRuntime;
  readonly openScreen: (screen: AppScreen) => AppShellView;
  readonly getCurrentScreen: () => AppScreen;
  readonly openChatList: () => AppShellView;
  readonly openChatView: (chatId?: ChatId) => AppShellView;
  readonly getChatMode: () => ChatScreenMode;
  readonly handleInteraction: (interaction: AppShellInteraction) => AppShellView;
  readonly dispatch: (event: ChatKernelEvent) => AppShellView;
  readonly view: () => AppShellView;
}>;
