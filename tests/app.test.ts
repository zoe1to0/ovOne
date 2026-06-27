import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { App, toChatEventId, toMessageId } from "../src/index.js";
import type { ChatId } from "../src/index.js";

describe("App bootstrap", () => {
  it("initializes WorldDomain snapshots, ChatKernel, UI renderer, and initial screen", () => {
    const app = App.init();

    assert.equal(app.realityState.world.title, "Reality");
    assert.equal(app.defaultState.world.title, "Default World");
    assert.equal(app.getState().chat.chats.size, 1);
    assert.equal(app.initialView.chatList.length, 1);
    assert.equal(app.initialView.chatPage?.title, "Default World");
  });

  it("binds dispatch through UI renderer into ChatKernel transition and renders next view", () => {
    const app = App.init();
    const defaultChat = app.getState().chat.chats.get(app.initialView.chatPage!.chatId)!;

    const nextView = app.dispatch({
      id: toChatEventId("event:app:1"),
      type: "message.submitted",
      worldId: app.snapshot().worldMeta.id,
      timestamp: 10,
      payload: {
        chatId: defaultChat.id as ChatId,
        messageId: toMessageId("message:app:1"),
        authorActorId: app.snapshot().worldMeta.assistantActorId,
        text: "Bootstrapped runtime is alive.",
        createdAt: 10
      }
    });

    assert.equal(nextView.chatList.find((item) => item.chatId === defaultChat.id)?.lastMessagePreview, "Bootstrapped runtime is alive.");
    assert.equal(nextView.chatPage?.messages[0]?.authorName, "ovOne");
    assert.equal(app.view().chatPage?.messages.length, 1);
  });

  it("rejects UI-dispatched actor ids that are not in the active WorldState", () => {
    const app = App.init();
    const defaultChat = app.getState().chat.chats.get(app.initialView.chatPage!.chatId)!;

    assert.throws(
      () =>
        app.dispatch({
          id: toChatEventId("event:app:forged"),
          type: "message.submitted",
          worldId: app.snapshot().worldMeta.id,
          timestamp: 11,
          payload: {
            chatId: defaultChat.id as ChatId,
            messageId: toMessageId("message:app:forged"),
            authorActorId: "not-in-world",
            text: "This should not enter the kernel.",
            createdAt: 11
          }
        }),
      /WorldState/
    );
  });
});
