import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  LINKED_AI_DISCONNECT_CONFIRMATION_MISMATCH_MESSAGE,
  LINKED_AI_DISCONNECT_CONFIRMATION_REQUIRED_MESSAGE,
  LINKED_AI_DISCONNECT_DRY_RUN_CONFIRMED_MESSAGE,
  LINKED_AI_DISCONNECT_PREVIEW_REQUIRED_MESSAGE,
  buildLinkedAIDisconnectPreview,
  guardLinkedAIDisconnectExecution
} from "../src/domain/index.js";
import type { LinkedAIDisconnectPreviewViewModel, WorldScopedSnapshot } from "../src/domain/index.js";
import { toWorldId } from "../src/world-domain/index.js";

describe("Me Settings linked AI disconnect guarded executor", () => {
  it("rejects missing confirmation, mismatched target, and missing preview", () => {
    const snapshot = createSnapshot();
    const preview = buildLinkedAIDisconnectPreview({ globalAILinkId: "link:target" }, snapshot);

    assert.equal(
      guardLinkedAIDisconnectExecution({
        command: { globalAILinkId: "link:target" },
        confirmation: null,
        snapshot
      }).error,
      LINKED_AI_DISCONNECT_CONFIRMATION_REQUIRED_MESSAGE
    );
    assert.equal(
      guardLinkedAIDisconnectExecution({
        command: { globalAILinkId: "link:other" },
        confirmation: { globalAILinkId: "link:target", preview },
        snapshot
      }).error,
      LINKED_AI_DISCONNECT_CONFIRMATION_MISMATCH_MESSAGE
    );
    assert.equal(
      guardLinkedAIDisconnectExecution({
        command: { globalAILinkId: "link:target" },
        confirmation: { globalAILinkId: "link:target", preview: null },
        snapshot
      }).error,
      LINKED_AI_DISCONNECT_PREVIEW_REQUIRED_MESSAGE
    );
  });

  it("rejects invalid execution contracts without mutating runtime data", () => {
    const snapshot = createSnapshot();
    const before = JSON.stringify(toPlain(snapshot));
    const preview = buildLinkedAIDisconnectPreview({ globalAILinkId: "link:target" }, snapshot);
    const tamperedPreview = {
      ...preview,
      executionPlan: {
        ...preview.executionPlan,
        status: "executed"
      }
    } as unknown as LinkedAIDisconnectPreviewViewModel;

    const result = guardLinkedAIDisconnectExecution({
      command: { globalAILinkId: "link:target" },
      confirmation: { globalAILinkId: "link:target", preview: tamperedPreview },
      snapshot
    });

    assert.equal(result.status, "guard-failed");
    assert.match(result.error ?? "", /execution plan must remain planned/);
    assert.equal(JSON.stringify(toPlain(snapshot)), before);
  });

  it("marks a valid guarded confirmation as dry-run-confirmed without mutating runtime data", () => {
    const snapshot = createSnapshot();
    const before = JSON.stringify(toPlain(snapshot));
    const preview = buildLinkedAIDisconnectPreview({ globalAILinkId: "link:target" }, snapshot);

    const result = guardLinkedAIDisconnectExecution({
      command: { globalAILinkId: "link:target" },
      confirmation: { globalAILinkId: "link:target", preview },
      snapshot
    });

    assert.equal(result.status, "dry-run-confirmed");
    assert.equal(result.notice, LINKED_AI_DISCONNECT_DRY_RUN_CONFIRMED_MESSAGE);
    assert.equal(result.error, null);
    assert.equal(JSON.stringify(toPlain(snapshot)), before);
  });
});

const realityWorldId = toWorldId("reality");
const customWorldId = toWorldId("custom:target-world");

function createSnapshot(): WorldScopedSnapshot {
  return {
    currentWorldId: realityWorldId,
    globalAIModels: [
      { modelId: "model:target", displayName: "Target AI" },
      { modelId: "model:other", displayName: "Other AI" }
    ],
    globalAILinks: [
      { linkId: "link:target", modelId: "model:target", connectedAt: 1, status: "connected" },
      { linkId: "link:other", modelId: "model:other", connectedAt: 2, status: "connected" }
    ],
    worlds: new Map([
      [
        realityWorldId,
        {
          world: world(realityWorldId, "Reality", "reality"),
          contacts: [contact(realityWorldId, "reality-target-contact", "actor:target:reality", "model:target")],
          chats: [chat(realityWorldId, "reality-target-chat", "reality-target-contact")],
          groups: [{ id: "reality-group", title: "Reality Group", actorIds: ["actor:target:reality"] }],
          memory: memory(realityWorldId, "reality-target-contact", "reality-target-chat")
        }
      ],
      [
        customWorldId,
        {
          world: world(customWorldId, "Target World", "custom"),
          contacts: [contact(customWorldId, "custom-target-contact", "actor:target:custom", "model:target")],
          chats: [chat(customWorldId, "custom-target-chat", "custom-target-contact")],
          groups: [],
          memory: memory(customWorldId, "custom-target-contact", "custom-target-chat")
        }
      ]
    ])
  };
}

function world(worldId: typeof realityWorldId, title: string, type: "reality" | "custom") {
  return {
    worldId,
    title,
    type,
    lifecycle: "active" as const,
    ownerActorId: "user",
    assistantActorId: "ovo",
    worldView: {},
    settings: {}
  };
}

function contact(worldId: typeof realityWorldId, contactId: string, actorId: string, baseModelId: string) {
  return {
    worldId,
    contactId,
    actorId,
    baseModelId,
    displayName: contactId,
    kind: "assistant" as const,
    outputMode: "Dialogue" as const,
    persona: {}
  };
}

function chat(worldId: typeof realityWorldId, chatId: string, contactId: string) {
  return {
    worldId,
    chatId,
    title: chatId,
    participantContactIds: [contactId],
    messages: []
  };
}

function memory(worldId: typeof realityWorldId, contactId: string, chatId: string) {
  return {
    worldId,
    namespace: `memory:${worldId}`,
    contactMemoryKeys: [contactId],
    chatMemoryKeys: [chatId]
  };
}

function toPlain(snapshot: WorldScopedSnapshot) {
  return {
    ...snapshot,
    worlds: [...snapshot.worlds.entries()]
  };
}
