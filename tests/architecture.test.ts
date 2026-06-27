import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  WorldDomain,
  createInitialChatState,
  toChatEventId,
  toChatId,
  toMessageId,
  toWorldId,
  transition
} from "../src/index.js";
import { render } from "../src/ui/index.js";

describe("ovOne v2 architecture", () => {
  it("uses WorldState as the single identity source for chat list and page state", () => {
    const domain = createDomain();
    const chatId = toChatId("chat:reality");

    let state = createInitialChatState(domain.getWorldState(toWorldId("reality")));
    state = transition(state, {
      id: toChatEventId("event:1"),
      type: "chat.started",
      worldId: state.world.id,
      timestamp: 1,
      payload: { chatId, title: state.world.title }
    });
    state = transition(state, {
      id: toChatEventId("event:2"),
      type: "message.submitted",
      worldId: state.world.id,
      timestamp: 2,
      payload: {
        chatId,
        messageId: toMessageId("message:1"),
        authorActorId: state.world.assistantActorId,
        text: "I am resolved by WorldState contacts.",
        createdAt: 1
      }
    });

    domain.commitState(state);
    const model = render(domain.generateSnapshot(state.world.id));

    assert.equal(model.chatList[0]?.title, "Reality");
    assert.equal(model.chatList[0]?.lastMessagePreview, "I am resolved by WorldState contacts.");
    assert.equal(model.chatPage?.messages[0]?.authorName, "ovOne");
    assert.equal(model.chatPage?.messages[0]?.authorKind, "assistant");
  });

  it("rejects actor ids that are not present in the WorldState snapshot", () => {
    const domain = createDomain();
    const chatId = toChatId("chat:reality");

    let state = createInitialChatState(domain.getWorldState(toWorldId("reality")));
    state = transition(state, {
      id: toChatEventId("event:1"),
      type: "chat.started",
      worldId: state.world.id,
      timestamp: 1,
      payload: { chatId, title: state.world.title }
    });

    assert.throws(
      () =>
        transition(state, {
          id: toChatEventId("event:2"),
          type: "message.submitted",
          worldId: state.world.id,
          timestamp: 2,
          payload: {
            chatId,
            messageId: toMessageId("message:unknown-actor"),
            authorActorId: "unknown",
            text: "Wrong actor.",
            createdAt: 2
          }
        }),
      /WorldState/
    );
  });

  it("does not let UI manufacture identity outside WorldState contacts", () => {
    const domain = createDomain();
    const chatId = toChatId("chat:reality");
    const state = transition(createInitialChatState(domain.getWorldState(toWorldId("reality"))), {
      id: toChatEventId("event:1"),
      type: "chat.started",
      worldId: toWorldId("reality"),
      timestamp: 1,
      payload: { chatId, title: "Reality" }
    });

    domain.commitState(state);
    const model = render(domain.generateSnapshot(state.world.id));

    assert.equal(model.chatPage?.messages.length, 0);
    assert.equal(state.contacts[0]?.displayName, "You");
  });

  it("returns immutable WorldState snapshots from WorldDomain", () => {
    const domain = createDomain();
    const state = domain.getWorldState(toWorldId("reality"));

    assert.throws(
      () => (state.contacts as unknown as { push: (value: unknown) => void }).push({}),
      /object is not extensible|read only|Cannot add/
    );
    assert.throws(
      () => (state.chat.chats as Map<string, unknown>).set("chat:bad", {}),
      /immutable/
    );
  });

  it("generates final WorldSnapshot schema only through WorldDomain", () => {
    const domain = createDomain();
    const snapshot = domain.generateSnapshot(toWorldId("reality"));

    assert.deepEqual(Object.keys(snapshot).sort(), [
      "chatState",
      "contacts",
      "groups",
      "memorySummary",
      "runtimeState",
      "worldMeta"
    ]);
    assert.equal(snapshot.worldMeta.title, "Reality");
    assert.equal(snapshot.memorySummary.namespace, "world:reality");
    assert.equal(snapshot.runtimeState.activeChatId, null);
  });
});

function createDomain(): WorldDomain {
  return WorldDomain.create({
    reality: {
      ownerActorId: "user",
      assistantActorId: "ovone"
    }
  });
}
