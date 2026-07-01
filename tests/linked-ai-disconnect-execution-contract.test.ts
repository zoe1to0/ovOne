import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createLinkedAIDisconnectCleanupPlan,
  createLinkedAIDisconnectExecutionPlan,
  validateLinkedAIDisconnectExecutionCommand,
  validateLinkedAIDisconnectExecutionPlan
} from "../src/domain/index.js";
import type { LinkedAIDisconnectCleanupPlan, WorldScopedSnapshot } from "../src/domain/index.js";
import { toWorldId } from "../src/world-domain/index.js";

describe("Me Settings linked AI disconnect execution contract", () => {
  it("accepts a valid connected linked AI with its exact cleanup plan", () => {
    const snapshot = createSnapshot();
    const cleanupPlan = createLinkedAIDisconnectCleanupPlan({ globalAILinkId: "link:target" }, snapshot);
    const executionPlan = createLinkedAIDisconnectExecutionPlan({ globalAILinkId: "link:target" }, snapshot);

    const validation = validateLinkedAIDisconnectExecutionCommand(
      { globalAILinkId: "link:target", cleanupPlan },
      snapshot
    );
    const planValidation = validateLinkedAIDisconnectExecutionPlan(executionPlan, snapshot);

    assert.equal(validation.valid, true);
    assert.equal(planValidation.valid, true);
    assert.equal(executionPlan.globalLinkAction, "disable-or-remove-later");
    assert.equal(executionPlan.providerConnectionAction, "not-executed-yet");
    assert.equal(executionPlan.status, "planned");
    assert.deepEqual(executionPlan.allowedFutureMutations, [
      "SelectedGlobalAILinkStatusOrRemovalFlag",
      "SelectedAIWorldContact",
      "SelectedAIPrivateWorldChat",
      "SelectedAIWorldMemoryScope",
      "ProviderConnectionStatusLater"
    ]);
    assert.equal(executionPlan.forbiddenFutureMutations.includes("World"), true);
    assert.equal(executionPlan.forbiddenFutureMutations.includes("GroupChat"), true);
    assert.equal(executionPlan.warnings.includes("Group cleanup remains unsupported for linked AI disconnect execution."), true);
  });

  it("rejects unlinked or disconnected AI", () => {
    const snapshot = createSnapshot();
    const disconnectedCleanupPlan = createLinkedAIDisconnectCleanupPlan({ globalAILinkId: "link:disconnected" }, snapshot);
    const missingCleanupPlan = createLinkedAIDisconnectCleanupPlan({ globalAILinkId: "link:missing" }, snapshot);

    assert.equal(
      validateLinkedAIDisconnectExecutionCommand(
        { globalAILinkId: "link:disconnected", cleanupPlan: disconnectedCleanupPlan },
        snapshot
      ).valid,
      false
    );
    assert.equal(
      validateLinkedAIDisconnectExecutionCommand(
        { globalAILinkId: "link:missing", cleanupPlan: missingCleanupPlan },
        snapshot
      ).valid,
      false
    );
  });

  it("rejects plans that include other AI or unrelated worlds", () => {
    const snapshot = createSnapshot();
    const cleanupPlan = createLinkedAIDisconnectCleanupPlan({ globalAILinkId: "link:target" }, snapshot);
    const withOtherAI = {
      ...cleanupPlan,
      affectedWorlds: [
        {
          ...cleanupPlan.affectedWorlds[0]!,
          worldContactIds: ["reality-target-contact", "reality-other-contact"]
        },
        cleanupPlan.affectedWorlds[1]!
      ]
    } as LinkedAIDisconnectCleanupPlan;
    const withUnrelatedWorld = {
      ...cleanupPlan,
      affectedWorlds: [
        ...cleanupPlan.affectedWorlds,
        {
          worldId: absentWorldId,
          worldTitle: "Absent World",
          worldContactIds: ["absent-other-contact"],
          privateChatIds: ["absent-other-chat"],
          memoryScopeIds: ["absent-other-contact", "absent-other-chat"],
          groupCleanupStatus: "none-needed"
        }
      ]
    } as LinkedAIDisconnectCleanupPlan;

    assert.equal(
      validateLinkedAIDisconnectExecutionCommand({ globalAILinkId: "link:target", cleanupPlan: withOtherAI }, snapshot).valid,
      false
    );
    assert.equal(
      validateLinkedAIDisconnectExecutionCommand({ globalAILinkId: "link:target", cleanupPlan: withUnrelatedWorld }, snapshot).valid,
      false
    );
  });

  it("rejects plans attempting world deletion, group cleanup execution, or global setting mutation", () => {
    const snapshot = createSnapshot();
    const cleanupPlan = createLinkedAIDisconnectCleanupPlan({ globalAILinkId: "link:target" }, snapshot);
    const worldDeletionPlan = {
      ...cleanupPlan,
      worldDeletionAction: "delete-worlds"
    } as LinkedAIDisconnectCleanupPlan;
    const groupExecutionPlan = {
      ...cleanupPlan,
      affectedWorlds: [
        {
          ...cleanupPlan.affectedWorlds[0]!,
          groupCleanupAction: "delete-group-chats"
        },
        cleanupPlan.affectedWorlds[1]!
      ]
    } as LinkedAIDisconnectCleanupPlan;
    const globalMutationExecutionPlan = {
      ...createLinkedAIDisconnectExecutionPlan({ globalAILinkId: "link:target" }, snapshot),
      weatherTimePermissionAction: "revoke",
      userProfileAction: "mutate"
    };

    assert.match(
      validateLinkedAIDisconnectExecutionCommand({ globalAILinkId: "link:target", cleanupPlan: worldDeletionPlan }, snapshot).error ?? "",
      /unsupported mutation fields/
    );
    assert.match(
      validateLinkedAIDisconnectExecutionCommand({ globalAILinkId: "link:target", cleanupPlan: groupExecutionPlan }, snapshot).error ?? "",
      /unsupported mutation fields/
    );
    assert.match(
      validateLinkedAIDisconnectExecutionPlan(globalMutationExecutionPlan, snapshot).error ?? "",
      /unsupported mutation fields/
    );
  });

  it("does not mutate runtime data while validating or planning execution", () => {
    const snapshot = createSnapshot();
    const before = JSON.stringify(toPlain(snapshot));
    const executionPlan = createLinkedAIDisconnectExecutionPlan({ globalAILinkId: "link:target" }, snapshot);

    validateLinkedAIDisconnectExecutionPlan(executionPlan, snapshot);

    assert.equal(JSON.stringify(toPlain(snapshot)), before);
  });
});

const realityWorldId = toWorldId("reality");
const customWorldId = toWorldId("custom:target-world");
const absentWorldId = toWorldId("custom:absent-world");

function createSnapshot(): WorldScopedSnapshot {
  return {
    currentWorldId: realityWorldId,
    globalAIModels: [
      { modelId: "model:target", displayName: "Target AI" },
      { modelId: "model:other", displayName: "Other AI" },
      { modelId: "model:disconnected", displayName: "Disconnected AI" }
    ],
    globalAILinks: [
      { linkId: "link:target", modelId: "model:target", connectedAt: 1, status: "connected" },
      { linkId: "link:other", modelId: "model:other", connectedAt: 2, status: "connected" },
      { linkId: "link:disconnected", modelId: "model:disconnected", connectedAt: 3, status: "disconnected" }
    ],
    worlds: new Map([
      [
        realityWorldId,
        {
          world: world(realityWorldId, "Reality", "reality"),
          contacts: [
            contact(realityWorldId, "reality-target-contact", "actor:target:reality", "model:target"),
            contact(realityWorldId, "reality-other-contact", "actor:other:reality", "model:other")
          ],
          chats: [
            chat(realityWorldId, "reality-target-chat", "reality-target-contact"),
            chat(realityWorldId, "reality-other-chat", "reality-other-contact")
          ],
          groups: [{ id: "reality-group", title: "Reality Group", actorIds: ["actor:target:reality", "actor:other:reality"] }],
          memory: {
            worldId: realityWorldId,
            namespace: "memory:reality",
            contactMemoryKeys: ["reality-target-contact", "reality-other-contact"],
            chatMemoryKeys: ["reality-target-chat", "reality-other-chat"]
          }
        }
      ],
      [
        customWorldId,
        {
          world: world(customWorldId, "Target World", "custom"),
          contacts: [
            contact(customWorldId, "custom-target-contact", "actor:target:custom", "model:target"),
            contact(customWorldId, "custom-other-contact", "actor:other:custom", "model:other")
          ],
          chats: [
            chat(customWorldId, "custom-target-chat", "custom-target-contact"),
            chat(customWorldId, "custom-other-chat", "custom-other-contact")
          ],
          groups: [],
          memory: {
            worldId: customWorldId,
            namespace: "memory:custom",
            contactMemoryKeys: ["custom-target-contact", "custom-other-contact"],
            chatMemoryKeys: ["custom-target-chat", "custom-other-chat"]
          }
        }
      ],
      [
        absentWorldId,
        {
          world: world(absentWorldId, "Absent World", "custom"),
          contacts: [contact(absentWorldId, "absent-other-contact", "actor:other:absent", "model:other")],
          chats: [chat(absentWorldId, "absent-other-chat", "absent-other-contact")],
          groups: [],
          memory: {
            worldId: absentWorldId,
            namespace: "memory:absent",
            contactMemoryKeys: ["absent-other-contact"],
            chatMemoryKeys: ["absent-other-chat"]
          }
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

function toPlain(snapshot: WorldScopedSnapshot) {
  return {
    ...snapshot,
    worlds: [...snapshot.worlds.entries()]
  };
}
