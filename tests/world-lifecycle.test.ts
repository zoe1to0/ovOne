import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  AiAdapter,
  App,
  WorldDomain,
  WorldLifecycleController,
  toChatEventId,
  toMessageId,
  toWorldId
} from "../src/index.js";
import type { ChatId } from "../src/index.js";

describe("WorldLifecycleController", () => {
  it("stores lifecycle state in WorldSnapshot worldMeta", () => {
    const domain = createDomain();
    const controller = WorldLifecycleController.create({ worldDomain: domain });
    const paused = controller.pauseWorld(toWorldId("reality"));

    assert.equal(paused.worldMeta.lifecycle, "paused");
    assert.equal(controller.startWorld(toWorldId("reality")).worldMeta.lifecycle, "active");
    assert.equal(controller.archiveWorld(toWorldId("reality")).worldMeta.lifecycle, "archived");
    assert.equal(controller.restoreWorld(toWorldId("reality")).worldMeta.lifecycle, "restored");
  });

  it("paused worlds do not process ChatKernel events", () => {
    const app = App.init();
    const chat = app.getState().chat.chats.get(app.initialView.chatPage!.chatId)!;
    app.lifecycle.pauseWorld(app.snapshot().worldMeta.id);

    assert.throws(
      () =>
        app.dispatch({
          id: toChatEventId("event:lifecycle:paused"),
          type: "message.submitted",
          worldId: app.snapshot().worldMeta.id,
          timestamp: 30,
          payload: {
            chatId: chat.id as ChatId,
            messageId: toMessageId("message:lifecycle:paused"),
            authorActorId: app.snapshot().worldMeta.ownerActorId,
            text: "Should not process.",
            createdAt: 30
          }
        }),
      /paused/
    );
  });

  it("archived worlds reject new structural and persona patches", () => {
    const domain = createDomain();
    const controller = WorldLifecycleController.create({ worldDomain: domain });
    const worldId = toWorldId("reality");
    controller.archiveWorld(worldId);

    assert.throws(
      () =>
        domain.applyStructuralPatch({
          type: "world.settings.adjusted",
          worldId,
          settings: { theme: "quiet" }
        }),
      /archived/
    );
    assert.throws(
      () =>
        domain.applyPersonaOverlay({
          type: "contact.persona.overlayed",
          worldId,
          actorId: "ovone",
          overlay: { tone: { warmth: "high" } }
        }),
      /archived/
    );
  });

  it("restore rehydrates from WorldSnapshot and marks restored", () => {
    const domain = createDomain();
    const controller = WorldLifecycleController.create({ worldDomain: domain });
    const worldId = toWorldId("reality");

    domain.applyStructuralPatch({
      type: "world.settings.adjusted",
      worldId,
      settings: { continuity: "kept" }
    });
    controller.archiveWorld(worldId);
    const restored = controller.restoreWorld(worldId);

    assert.equal(restored.worldMeta.lifecycle, "restored");
    assert.equal(restored.runtimeState.metadata.settings.continuity, "kept");
  });

  it("UI snapshot and AI Adapter respect lifecycle state", () => {
    const app = App.init();
    app.lifecycle.pauseWorld(app.snapshot().worldMeta.id);
    const view = app.view();
    const adapter = AiAdapter.create();

    assert.equal(app.snapshot().worldMeta.lifecycle, "paused");
    assert.equal(view.chatPage?.title, "Default World");
    assert.throws(
      () =>
        adapter.prepareModelRequest({
          snapshot: app.snapshot(),
          actorId: "ovone",
          prompt: "Hello"
        }),
      /paused/
    );
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
