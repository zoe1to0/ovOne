import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  App
} from "../src/app/index.js";
import {
  PersistenceLayer,
  createWorldPersistence,
  createMemoryWorldStorage,
  createPersistentMinimalUiShell,
  createPersistentApp,
  createPersistentProductRuntime,
  deserializeSnapshot,
  serializeSnapshot
} from "../src/persistence/index.js";
import { MinimalUiShell } from "../src/minimal-ui-shell/index.js";
import { toWorldId } from "../src/world-domain/index.js";

describe("Persistence Layer", () => {
  it("serializes WorldSnapshot with the full required persistence shape", () => {
    const app = App.init();
    const snapshot = app.snapshot();
    const serialized = serializeSnapshot(snapshot);

    assert.deepEqual(Object.keys(serialized).sort(), [
      "chatState",
      "contacts",
      "groups",
      "memorySummary",
      "runtimeState",
      "worldMeta"
    ]);
    assert.equal(Array.isArray(serialized.chatState.chats), true);
    assert.equal(serialized.worldMeta.id, snapshot.worldMeta.id);
  });

  it("saves and loads a world snapshot from storage", () => {
    const app = App.init();
    const shell = MinimalUiShell.init(app);
    shell.sendMessage("persist me");

    const storage = createMemoryWorldStorage();
    const persistence = createWorldPersistence({ app, storage });
    const saved = persistence.saveWorld(shell.view().activeWorldId);
    const loaded = persistence.loadWorld(shell.view().activeWorldId);

    assert.equal(saved.chatState.chats[0]?.messages.at(-1)?.text, "persist me");
    assert.equal(loaded?.chatState.chats.get(shell.view().product.chat.chatId!)?.messages.at(-1)?.text, "persist me");
  });

  it("restores a persisted snapshot into a fresh app startup", () => {
    const original = App.init();
    const originalShell = MinimalUiShell.init(original);
    originalShell.sendMessage("recover me");

    const storage = createMemoryWorldStorage();
    const persistence = PersistenceLayer.create({ app: original, storage });
    persistence.saveWorld(originalShell.view().activeWorldId);

    const recovered = createPersistentApp({ storage });
    const recoveredSnapshot = recovered.app.snapshot();

    assert.equal(recovered.restoredWorlds.length, 1);
    assert.equal(recoveredSnapshot.chatState.chats.get(recoveredSnapshot.chatState.activeChatId!)?.messages.at(-1)?.text, "recover me");
  });

  it("auto-saves after chat messages and world switches in the persistent UI shell", () => {
    const app = App.init();
    const storage = createMemoryWorldStorage();
    const persistence = createWorldPersistence({ app, storage });
    const shell = createPersistentMinimalUiShell(app, persistence);
    const defaultWorldId = shell.view().activeWorldId;
    const realityWorldId = shell.view().availableWorlds.find((world) => world.worldId !== defaultWorldId)!.worldId;

    shell.sendMessage("autosave default");
    shell.switchWorld(realityWorldId);

    assert.equal(persistence.loadWorld(defaultWorldId)?.chatState.chats.get(`chat:${defaultWorldId}`)?.messages.at(-1)?.text, "autosave default");
    assert.equal(persistence.loadWorld(realityWorldId)?.worldMeta.id, realityWorldId);
  });

  it("recovers from corrupt latest storage by falling back to the latest valid snapshot", () => {
    const app = App.init();
    const shell = MinimalUiShell.init(app);
    const storage = createMemoryWorldStorage();
    const persistence = createWorldPersistence({ app, storage });
    const worldId = shell.view().activeWorldId;

    shell.sendMessage("valid before corruption");
    persistence.saveWorld(worldId);
    storage.writeRawWorld(worldId, { corrupt: true });

    const fresh = createPersistentApp({ storage });
    const recovered = fresh.app.snapshot();

    assert.equal(recovered.chatState.chats.get(recovered.chatState.activeChatId!)?.messages.at(-1)?.text, "valid before corruption");
    assert.equal(fresh.persistence.notifications()[0]?.type, "corruption-recovered");
  });

  it("starts a persistent product runtime with restored UI snapshot", () => {
    const storage = createMemoryWorldStorage();
    const first = createPersistentProductRuntime({ storage });
    first.shell.sendMessage("product restart");

    const second = createPersistentProductRuntime({ storage });

    assert.equal(second.shell.view().product.chat.messages.at(-1)?.text, "product restart");
    assert.equal(second.restoredWorlds.length >= 1, true);
  });

  it("persists and restores chat appearance settings", () => {
    const storage = createMemoryWorldStorage();
    const first = createPersistentProductRuntime({ storage });
    const worldId = first.shell.view().activeWorldId;
    const chatId = first.shell.view().product.snapshot.chatState.activeChatId!;

    first.shell.saveChatAppearanceSettings({
      worldId,
      chatId,
      backgroundImageRef: "",
      backgroundColor: "#123456",
      myBubbleColor: "#abcdef",
      otherBubbleColor: ""
    });

    const second = createPersistentProductRuntime({ storage });
    const restored = second.shell.view().product.snapshot.chatState.chats.get(chatId);

    assert.deepEqual(restored?.appearance, {
      backgroundImageRef: "",
      backgroundColor: "#123456",
      myBubbleColor: "#abcdef",
      otherBubbleColor: ""
    });
  });

  it("restores structural and persona snapshot state without changing core layers", () => {
    const app = App.init();
    const worldId = app.snapshot().worldMeta.id;
    app.worldDomain.applyStructuralPatch({
      type: "world.settings.adjusted",
      worldId,
      timestamp: 5000,
      settings: { persistence: "enabled" }
    });
    app.worldDomain.applyPersonaOverlay({
      type: "contact.persona.overlayed",
      worldId,
      actorId: app.snapshot().worldMeta.assistantActorId,
      timestamp: 5001,
      overlay: { tone: { warmth: "stable" } }
    });

    const snapshot = deserializeSnapshot(serializeSnapshot(app.worldDomain.generateSnapshot(worldId)));
    const fresh = App.init();
    const restored = PersistenceLayer.create({ app: fresh }).restoreFromSnapshot(snapshot);

    assert.equal(restored.runtimeState.metadata.settings.persistence, "enabled");
    assert.equal(restored.runtimeState.metadata.personaOverlays.ovone?.tone?.warmth, "stable");
  });

  it("persists and restores custom worlds created from drafts into the shell world list", () => {
    const storage = createMemoryWorldStorage();
    const first = createPersistentProductRuntime({ storage });
    const created = first.shell.createWorldFromDraft({
      worldName: "Persisted Draft World",
      worldviewSourceType: "blank",
      worldviewText: "",
      selectedAIModelIds: ["ovone"],
      nextMode: "random-role"
    });

    const second = createPersistentProductRuntime({ storage });

    assert.equal(created.activeWorldId, toWorldId("custom:persisted-draft-world"));
    assert.equal(second.shell.view().availableWorlds.some((world) => world.worldId === created.activeWorldId), true);
    assert.equal(second.restoredWorlds.some((world) => world.worldMeta.id === created.activeWorldId), true);
  });
});
