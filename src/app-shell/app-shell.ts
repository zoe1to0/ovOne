import type { AppRuntime } from "../app/index.js";
import { toChatEventId } from "../chat-kernel/index.js";
import type { ChatId, ChatKernelEvent } from "../chat-kernel/index.js";
import type { AppScreen, AppShellInteraction, AppShellRuntime, AppShellView, ChatScreenMode } from "./types.js";

export const AppShell = Object.freeze({
  init
});

function init(app: AppRuntime): AppShellRuntime {
  let currentScreen: AppScreen = "chat";
  let chatMode: ChatScreenMode = "list";

  const buildView = (): AppShellView => {
    const snapshot = app.snapshot();
    return Object.freeze({
      screen: currentScreen,
      chatMode,
      snapshot,
      ui: app.renderer.render(snapshot),
      worlds: [snapshot].map((worldSnapshot) =>
        Object.freeze({
          worldId: worldSnapshot.worldMeta.id,
          title: worldSnapshot.worldMeta.title,
          type: worldSnapshot.worldMeta.type
        })
      ),
      contacts: [snapshot].flatMap((worldSnapshot) =>
        worldSnapshot.contacts.map((contact) =>
          Object.freeze({
            worldId: worldSnapshot.worldMeta.id,
            actorId: contact.actorId,
            displayName: contact.displayName,
            kind: contact.kind
          })
        )
      )
    });
  };

  const openScreen = (screen: AppScreen): AppShellView => {
    currentScreen = screen;
    return buildView();
  };

  const openChatList = (): AppShellView => {
    currentScreen = "chat";
    chatMode = "list";
    return buildView();
  };

  const openChatView = (chatId?: ChatId): AppShellView => {
    currentScreen = "chat";
    chatMode = "view";
    if (chatId) {
      const snapshot = app.snapshot();
      app.dispatch({
        id: toChatEventId(`event:chat-selected:${chatId}`),
        type: "chat.selected",
        worldId: snapshot.worldMeta.id,
        timestamp: 0,
        payload: { chatId }
      });
    }
    return buildView();
  };

  const handleInteraction = (interaction: AppShellInteraction): AppShellView => {
    switch (interaction.type) {
      case "screen.opened":
        return openScreen(interaction.screen);
      case "chat.list.opened":
        return openChatList();
      case "chat.view.opened":
        return openChatView(interaction.chatId);
    }
  };

  const dispatch = (event: ChatKernelEvent): AppShellView => {
    if (event.type === "chat.selected") {
      currentScreen = "chat";
      chatMode = "view";
    }
    app.dispatch(event);
    return buildView();
  };

  return Object.freeze({
    app,
    openScreen,
    getCurrentScreen: () => currentScreen,
    openChatList,
    openChatView,
    getChatMode: () => chatMode,
    handleInteraction,
    dispatch,
    view: buildView
  });
}
