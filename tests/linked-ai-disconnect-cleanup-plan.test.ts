import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createLinkedAIDisconnectCleanupPlan,
  validateLinkedAIDisconnectCleanupPlan
} from "../src/domain/index.js";
import type { WorldScopedSnapshot } from "../src/domain/index.js";
import { toWorldId } from "../src/world-domain/index.js";

describe("Me Settings linked AI disconnect cleanup plan", () => {
  it("plans cleanup for every world containing the linked AI only", () => {
    const snapshot = createSnapshot();
    const before = JSON.stringify(toPlain(snapshot));

    const plan = createLinkedAIDisconnectCleanupPlan({ globalAILinkId: "link:target" }, snapshot);

    assert.equal(plan.globalAILinkId, "link:target");
    assert.equal(plan.globalAIModelId, "model:target");
    assert.equal(plan.status, "planned");
    assert.equal(plan.providerConnectionAction, "not-executed-yet");
    assert.equal(plan.globalLinkAction, "not-executed-yet");
    assert.deepEqual(plan.affectedWorlds.map((world) => world.worldId), [realityWorldId, customWorldId]);
    assert.equal(plan.affectedWorlds.some((world) => world.worldId === absentWorldId), false);
    assert.deepEqual(plan.affectedWorlds[0]?.worldContactIds, ["reality-target-contact"]);
    assert.deepEqual(plan.affectedWorlds[0]?.privateChatIds, ["reality-target-chat"]);
    assert.deepEqual(plan.affectedWorlds[0]?.memoryScopeIds, ["reality-target-contact", "reality-target-chat"]);
    assert.deepEqual(plan.affectedWorlds[1]?.worldContactIds, ["custom-target-contact"]);
    assert.deepEqual(plan.affectedWorlds[1]?.privateChatIds, ["custom-target-chat"]);
    assert.deepEqual(plan.affectedWorlds[1]?.memoryScopeIds, ["custom-target-contact", "custom-target-chat"]);
    assert.equal(plan.affectedWorlds.every((world) => world.worldContactIds.every((id) => !id.includes("other"))), true);
    assert.equal(JSON.stringify(toPlain(snapshot)), before);
  });

  it("marks future group member removal as unsupported only when affected AI is in groups", () => {
    const plan = createLinkedAIDisconnectCleanupPlan({ globalAILinkId: "link:target" }, createSnapshot());

    assert.equal(plan.affectedWorlds.find((world) => world.worldId === realityWorldId)?.groupMemberRemovalStatus, "not-supported-yet");
    assert.equal(plan.affectedWorlds.find((world) => world.worldId === customWorldId)?.groupMemberRemovalStatus, "none-needed");
  });

  it("validates planned cleanup and still rejects unlinked or disconnected AI", () => {
    const snapshot = createSnapshot();
    const plan = createLinkedAIDisconnectCleanupPlan({ globalAILinkId: "link:target" }, snapshot);
    const disconnectedPlan = createLinkedAIDisconnectCleanupPlan({ globalAILinkId: "link:disconnected" }, snapshot);
    const missingPlan = createLinkedAIDisconnectCleanupPlan({ globalAILinkId: "link:missing" }, snapshot);

    assert.equal(validateLinkedAIDisconnectCleanupPlan(plan, snapshot).valid, true);
    assert.equal(validateLinkedAIDisconnectCleanupPlan(disconnectedPlan, snapshot).valid, false);
    assert.equal(validateLinkedAIDisconnectCleanupPlan(missingPlan, snapshot).valid, false);
    assert.deepEqual(disconnectedPlan.affectedWorlds, []);
    assert.deepEqual(missingPlan.affectedWorlds, []);
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
