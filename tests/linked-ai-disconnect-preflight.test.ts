import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createLinkedAIDisconnectExecutionPlan,
  createLinkedAIDisconnectPreflightPlan,
  validateLinkedAIDisconnectPreflightPlan
} from "../src/domain/index.js";
import type { LinkedAIDisconnectPreflightPlan, WorldScopedSnapshot } from "../src/domain/index.js";
import { toWorldId } from "../src/world-domain/index.js";

describe("Me Settings linked AI disconnect execution preflight", () => {
  it("creates a deterministic read-only preflight plan", () => {
    const snapshot = createSnapshot();
    const before = JSON.stringify(toPlain(snapshot));
    const executionPlan = createLinkedAIDisconnectExecutionPlan({ globalAILinkId: "link:target" }, snapshot);

    const first = createLinkedAIDisconnectPreflightPlan(executionPlan, snapshot);
    const second = createLinkedAIDisconnectPreflightPlan(executionPlan, snapshot);

    assert.equal(first.readOnly, true);
    assert.equal(first.status, "planned");
    assert.equal(JSON.stringify(first), JSON.stringify(second));
    assert.equal(JSON.stringify(toPlain(snapshot)), before);
  });

  it("orders validation, snapshot, rollback, and future mutation operations safely", () => {
    const snapshot = createSnapshot();
    const executionPlan = createLinkedAIDisconnectExecutionPlan({ globalAILinkId: "link:target" }, snapshot);

    const preflight = createLinkedAIDisconnectPreflightPlan(executionPlan, snapshot);
    const operationTypes = preflight.operations.map((operation) => operation.type);

    assert.deepEqual(operationTypes.slice(0, 4), [
      "validate-command",
      "create-snapshot",
      "create-rollback-plan",
      "mark-global-link-disconnecting"
    ]);
    assert.ok(indexOf(operationTypes, "create-snapshot") < indexOf(operationTypes, "mark-global-link-disconnecting"));
    assert.ok(indexOf(operationTypes, "create-rollback-plan") < indexOf(operationTypes, "mark-global-link-disconnecting"));
    assert.ok(indexOf(operationTypes, "remove-world-contact") < indexOf(operationTypes, "remove-private-chat"));
    assert.ok(indexOf(operationTypes, "remove-private-chat") < indexOf(operationTypes, "remove-memory-scope"));
  });

  it("preserves group history before deferred group membership removal and defers provider connection mutation", () => {
    const snapshot = createSnapshot();
    const executionPlan = createLinkedAIDisconnectExecutionPlan({ globalAILinkId: "link:target" }, snapshot);

    const preflight = createLinkedAIDisconnectPreflightPlan(executionPlan, snapshot);
    const preserveGroupHistory = preflight.operations.find((operation) => operation.type === "preserve-group-history");
    const removeGroupLater = preflight.operations.find((operation) => operation.type === "remove-group-membership-later");
    const providerDeferred = preflight.operations.find((operation) => operation.type === "provider-connection-deferred");

    assert.equal(preserveGroupHistory?.status, "preserve");
    assert.match(preserveGroupHistory?.note ?? "", /historical removed-AI messages remain preserved/);
    assert.equal(removeGroupLater?.status, "deferred");
    assert.ok((preserveGroupHistory?.order ?? 0) < (removeGroupLater?.order ?? 0));
    assert.equal(providerDeferred?.status, "deferred");
    assert.match(providerDeferred?.note ?? "", /future\/separate/);
  });

  it("rejects invalid snapshot and rollback state", () => {
    const snapshot = createSnapshot();
    const executionPlan = createLinkedAIDisconnectExecutionPlan({ globalAILinkId: "link:target" }, snapshot);
    const preflight = createLinkedAIDisconnectPreflightPlan(executionPlan, snapshot);
    const invalidSnapshotPlan = {
      ...preflight,
      executionSnapshot: {
        ...preflight.executionSnapshot,
        affectedWorlds: [
          {
            ...preflight.executionSnapshot.affectedWorlds[0]!,
            worldContactIds: ["reality-target-contact", "reality-other-contact"]
          },
          preflight.executionSnapshot.affectedWorlds[1]!
        ]
      }
    } as LinkedAIDisconnectPreflightPlan;
    const invalidRollbackPlan = {
      ...preflight,
      rollbackPlan: {
        ...preflight.rollbackPlan,
        restoreWorldContactIds: ["reality-target-contact"]
      }
    } as LinkedAIDisconnectPreflightPlan;

    assert.equal(validateLinkedAIDisconnectPreflightPlan(preflight, snapshot).valid, true);
    assert.equal(validateLinkedAIDisconnectPreflightPlan(invalidSnapshotPlan, snapshot).valid, false);
    assert.match(
      validateLinkedAIDisconnectPreflightPlan(invalidRollbackPlan, snapshot).error ?? "",
      /rollback plan must match/
    );
  });
});

const realityWorldId = toWorldId("reality");
const customWorldId = toWorldId("custom:target-world");

function indexOf(values: readonly string[], value: string): number {
  const index = values.indexOf(value);
  assert.notEqual(index, -1);
  return index;
}

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
