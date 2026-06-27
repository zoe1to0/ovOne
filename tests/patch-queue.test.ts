import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  App,
  createPatchQueue,
  queueForWorldState,
  reducePatchQueue,
  toChatEventId,
  toMessageId,
  toWorldId
} from "../src/index.js";
import type { ChatId, PatchQueue, WorldState } from "../src/index.js";

describe("PatchQueue priority system", () => {
  it("records source, priority, timestamp, target, operation, and value on every patch", () => {
    const queue = createPatchQueue();
    queue.enqueue({
      source: "creation",
      targetField: "world",
      operation: "initialize",
      timestamp: 1,
      value: baseline()
    });

    const patch = queue.snapshot().patches[0]!;
    assert.equal(patch.source, "creation");
    assert.equal(patch.priority, 400);
    assert.equal(patch.timestamp, 1);
    assert.equal(patch.targetField, "world");
    assert.equal(patch.operation, "initialize");
    assert.equal((patch.value as WorldState).world.title, "Patch World");
  });

  it("reduces patches by priority first, then timestamp", () => {
    const queue: PatchQueue = {
      patches: [
        {
          source: "creation",
          priority: 400,
          timestamp: 1,
          targetField: "world",
          operation: "initialize",
          value: baseline()
        },
        {
          source: "kernel",
          priority: 100,
          timestamp: 2,
          targetField: "metadata.settings",
          operation: "merge",
          value: { mode: "kernel" }
        },
        {
          source: "ovo",
          priority: 300,
          timestamp: 3,
          targetField: "metadata.settings",
          operation: "merge",
          value: { mode: "ovo" }
        }
      ]
    };

    const state = reducePatchQueue(queue);

    assert.equal(state.metadata.settings.mode, "ovo");
  });

  it("keeps same-source patches timestamp ordered", () => {
    const queue: PatchQueue = {
      patches: [
        {
          source: "creation",
          priority: 400,
          timestamp: 1,
          targetField: "world",
          operation: "initialize",
          value: baseline()
        },
        {
          source: "kernel",
          priority: 100,
          timestamp: 2,
          targetField: "chat.activeChatId",
          operation: "set",
          value: "chat:one"
        },
        {
          source: "kernel",
          priority: 100,
          timestamp: 3,
          targetField: "chat.activeChatId",
          operation: "set",
          value: "chat:two"
        }
      ]
    };

    const state = reducePatchQueue(queue);

    assert.equal(state.chat.activeChatId, "chat:two");
  });

  it("routes ChatKernel runtime events into kernel patches", () => {
    const app = App.init();
    const chat = app.getState().chat.chats.get(app.initialView.chatPage!.chatId)!;

    app.dispatch({
      id: toChatEventId("event:patch-queue:1"),
      type: "message.submitted",
      worldId: app.snapshot().worldMeta.id,
      timestamp: 20,
      payload: {
        chatId: chat.id as ChatId,
        messageId: toMessageId("message:patch-queue:1"),
        authorActorId: app.snapshot().worldMeta.ownerActorId,
        text: "Kernel writes through PatchQueue.",
        createdAt: 20
      }
    });

    const queue = queueForWorldState(app.getState());

    assert.equal(queue.patches.some((patch) => patch.source === "kernel"), true);
    assert.equal(app.view().chatPage?.messages[0]?.text, "Kernel writes through PatchQueue.");
  });
});

function baseline(): WorldState {
  const worldId = toWorldId("custom:patch");
  return {
    world: {
      id: worldId,
      title: "Patch World",
      type: "custom",
      ownerActorId: "user",
      assistantActorId: "ovone",
      lifecycle: "active"
    },
    contacts: [],
    groups: [],
    memoryScope: {
      worldId,
      namespace: "world:custom:patch"
    },
    metadata: {
      title: "Patch World",
      type: "custom",
      worldView: {},
      settings: {},
      personaOverlays: {}
    },
    chat: {
      activeChatId: null,
      chats: new Map()
    }
  };
}
