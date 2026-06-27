import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { App } from "../src/app/index.js";
import { AppShell } from "../src/app-shell/index.js";
import { toChatEventId, toMessageId } from "../src/chat-kernel/index.js";

describe("AppShell product layer", () => {
  it("starts on chat screen in chat list mode", () => {
    const shell = AppShell.init(App.init());
    const view = shell.view();

    assert.equal(shell.getCurrentScreen(), "chat");
    assert.equal(shell.getChatMode(), "list");
    assert.equal(view.screen, "chat");
    assert.equal(view.chatMode, "list");
    assert.equal(view.ui.chatList.length, 1);
  });

  it("renders chat, world, and contacts from one WorldSnapshot", () => {
    const shell = AppShell.init(App.init());
    const view = shell.view();
    const chat = view.snapshot.chatState.chats.get(view.ui.chatList[0]!.chatId)!;

    assert.equal(view.ui.chatList[0]?.title, chat.title);
    assert.equal(view.ui.chatPage?.title, chat.title);
    assert.equal(view.worlds[0]?.title, view.snapshot.worldMeta.title);
    assert.equal(view.contacts[0]?.displayName, view.snapshot.contacts[0]?.displayName);
  });

  it("switches between chat, world, and contacts screens without kernel mutation", () => {
    const shell = AppShell.init(App.init());
    const before = shell.app.getState();

    assert.equal(shell.openScreen("world").screen, "world");
    assert.equal(shell.getCurrentScreen(), "world");
    assert.equal(shell.openScreen("contacts").screen, "contacts");
    assert.equal(shell.getCurrentScreen(), "contacts");
    assert.equal(shell.openScreen("chat").screen, "chat");
    assert.equal(shell.app.getState(), before);
  });

  it("maps chat selection to chat view and kernel selection through App dispatch", () => {
    const shell = AppShell.init(App.init());
    const chatId = shell.view().ui.chatList[0]!.chatId;

    const view = shell.dispatch({
      id: toChatEventId("event:shell:select"),
      type: "chat.selected",
      worldId: shell.app.snapshot().worldMeta.id,
      timestamp: 1,
      payload: { chatId }
    });

    assert.equal(view.screen, "chat");
    assert.equal(view.chatMode, "view");
    assert.equal(shell.app.getState().chat.activeChatId, chatId);
  });

  it("switches between chat list and chat view as product navigation", () => {
    const shell = AppShell.init(App.init());
    const chatId = shell.view().ui.chatList[0]!.chatId;

    shell.openChatView(chatId);
    assert.equal(shell.getChatMode(), "view");

    const view = shell.openChatList();
    assert.equal(view.screen, "chat");
    assert.equal(view.chatMode, "list");
  });

  it("keeps message submission in kernel flow while preserving current screen", () => {
    const shell = AppShell.init(App.init());
    const chatId = shell.view().ui.chatList[0]!.chatId;
    shell.dispatch({
      id: toChatEventId("event:shell:select"),
      type: "chat.selected",
      worldId: shell.app.snapshot().worldMeta.id,
      timestamp: 1,
      payload: { chatId }
    });

    const view = shell.dispatch({
      id: toChatEventId("event:shell:message"),
      type: "message.submitted",
      worldId: shell.app.snapshot().worldMeta.id,
      timestamp: 12,
      payload: {
        chatId,
        messageId: toMessageId("message:shell:1"),
        authorActorId: shell.app.snapshot().worldMeta.ownerActorId,
        text: "Shell keeps this on the chat view.",
        createdAt: 12
      }
    });

    assert.equal(view.screen, "chat");
    assert.equal(view.chatMode, "view");
    assert.equal(view.ui.chatPage?.messages[0]?.text, "Shell keeps this on the chat view.");
  });
});
