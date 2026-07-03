import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createLinkedAIDisconnectExecutionPlan,
  createLinkedAIDisconnectRollbackPlan,
  createLinkedAIDisconnectSnapshot,
  validateLinkedAIDisconnectSnapshot
} from "../src/domain/index.js";
import type { LinkedAIDisconnectExecutionSnapshot, WorldScopedSnapshot } from "../src/domain/index.js";
import { toWorldId } from "../src/world-domain/index.js";

describe("Me Settings linked AI disconnect execution snapshot contract", () => {
  it("captures only selected AI resources and excludes unrelated worlds", () => {
    const snapshot = createSnapshot();
    const before = JSON.stringify(toPlain(snapshot));
    const executionPlan = createLinkedAIDisconnectExecutionPlan({ globalAILinkId: "link:target" }, snapshot);

    const executionSnapshot = createLinkedAIDisconnectSnapshot(executionPlan, snapshot);

    assert.equal(executionSnapshot.globalAILinkId, "link:target");
    assert.equal(executionSnapshot.globalAIModelId, "model:target");
    assert.equal(executionSnapshot.targetGlobalAILink.linkId, "link:target");
    assert.deepEqual(executionSnapshot.affectedWorlds.map((world) => world.worldId), [realityWorldId, customWorldId]);
    assert.equal(executionSnapshot.affectedWorlds.some((world) => world.worldId === absentWorldId), false);
    assert.deepEqual(executionSnapshot.affectedWorlds[0]?.worldContactIds, ["reality-target-contact"]);
    assert.deepEqual(executionSnapshot.affectedWorlds[0]?.privateChatIds, ["reality-target-chat"]);
    assert.deepEqual(executionSnapshot.affectedWorlds[0]?.memoryScopeIds, ["reality-target-contact", "reality-target-chat"]);
    assert.deepEqual(executionSnapshot.affectedWorlds[1]?.worldContactIds, ["custom-target-contact"]);
    assert.deepEqual(executionSnapshot.affectedWorlds[1]?.privateChatIds, ["custom-target-chat"]);
    assert.deepEqual(executionSnapshot.affectedWorlds[1]?.memoryScopeIds, ["custom-target-contact", "custom-target-chat"]);
    assert.equal(
      executionSnapshot.affectedWorlds.every((world) => world.worldContactIds.every((id) => !id.includes("other"))),
      true
    );
    assert.equal(JSON.stringify(toPlain(snapshot)), before);
  });

  it("records group membership only and preserves group chats, history, and historical AI messages", () => {
    const snapshot = createSnapshot();
    const executionPlan = createLinkedAIDisconnectExecutionPlan({ globalAILinkId: "link:target" }, snapshot);

    const executionSnapshot = createLinkedAIDisconnectSnapshot(executionPlan, snapshot);
    const membership = executionSnapshot.affectedWorlds[0]?.groupMembershipsPlannedForFutureRemoval[0];

    assert.equal(membership?.groupId, "reality-group");
    assert.deepEqual(membership?.targetActorIds, ["actor:target:reality"]);
    assert.equal(membership?.action, "future-member-removal-only");
    assert.equal(membership?.groupChatPreservation, "preserve");
    assert.equal(membership?.groupMessagePreservation, "preserve");
    assert.equal(membership?.historicalTargetMessagesPreservation, "preserve");
    assert.equal(executionSnapshot.explicitNonMutatedResources.includes("GroupChats"), true);
    assert.equal(executionSnapshot.explicitNonMutatedResources.includes("GroupMessages"), true);
  });

  it("creates a rollback plan from the captured execution snapshot", () => {
    const snapshot = createSnapshot();
    const executionPlan = createLinkedAIDisconnectExecutionPlan({ globalAILinkId: "link:target" }, snapshot);
    const executionSnapshot = createLinkedAIDisconnectSnapshot(executionPlan, snapshot);

    const rollbackPlan = createLinkedAIDisconnectRollbackPlan(executionSnapshot);

    assert.equal(rollbackPlan.status, "planned");
    assert.equal(rollbackPlan.restoreGlobalAILink.linkId, "link:target");
    assert.deepEqual(rollbackPlan.restoreWorldContactIds, ["reality-target-contact", "custom-target-contact"]);
    assert.deepEqual(rollbackPlan.restorePrivateChatIds, ["reality-target-chat", "custom-target-chat"]);
    assert.deepEqual(rollbackPlan.restoreMemoryScopeIds, [
      "reality-target-contact",
      "reality-target-chat",
      "custom-target-contact",
      "custom-target-chat"
    ]);
    assert.equal(rollbackPlan.restoreGroupMemberships[0]?.groupId, "reality-group");
    assert.equal(rollbackPlan.preservedResources.includes("ProviderConnection"), true);
  });

  it("rejects invalid snapshots that include unrelated AI, unrelated worlds, or destructive group semantics", () => {
    const snapshot = createSnapshot();
    const executionPlan = createLinkedAIDisconnectExecutionPlan({ globalAILinkId: "link:target" }, snapshot);
    const executionSnapshot = createLinkedAIDisconnectSnapshot(executionPlan, snapshot);
    const withOtherAI = {
      ...executionSnapshot,
      affectedWorlds: [
        {
          ...executionSnapshot.affectedWorlds[0]!,
          worldContactIds: ["reality-target-contact", "reality-other-contact"]
        },
        executionSnapshot.affectedWorlds[1]!
      ]
    } as LinkedAIDisconnectExecutionSnapshot;
    const withUnrelatedWorld = {
      ...executionSnapshot,
      affectedWorlds: [
        ...executionSnapshot.affectedWorlds,
        {
          worldId: absentWorldId,
          worldTitle: "Absent World",
          worldContactIds: ["absent-other-contact"],
          privateChatIds: ["absent-other-chat"],
          memoryScopeIds: ["absent-other-contact", "absent-other-chat"],
          groupMembershipsPlannedForFutureRemoval: []
        }
      ]
    } as LinkedAIDisconnectExecutionSnapshot;
    const destructiveGroupSnapshot = {
      ...executionSnapshot,
      affectedWorlds: [
        {
          ...executionSnapshot.affectedWorlds[0]!,
          groupMembershipsPlannedForFutureRemoval: [
            {
              ...executionSnapshot.affectedWorlds[0]!.groupMembershipsPlannedForFutureRemoval[0]!,
              groupMessagePreservation: "delete"
            }
          ]
        },
        executionSnapshot.affectedWorlds[1]!
      ]
    } as unknown as LinkedAIDisconnectExecutionSnapshot;

    assert.equal(validateLinkedAIDisconnectSnapshot(executionSnapshot, snapshot).valid, true);
    assert.equal(validateLinkedAIDisconnectSnapshot(withOtherAI, snapshot).valid, false);
    assert.equal(validateLinkedAIDisconnectSnapshot(withUnrelatedWorld, snapshot).valid, false);
    assert.match(
      validateLinkedAIDisconnectSnapshot(destructiveGroupSnapshot, snapshot).error ?? "",
      /must be preserved/
    );
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
