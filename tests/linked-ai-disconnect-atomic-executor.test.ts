import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createLinkedAIDisconnectExecutionPlan,
  createLinkedAIDisconnectPreflightPlan,
  simulateLinkedAIDisconnectExecution,
  validateAtomicExecutionResult
} from "../src/domain/index.js";
import type { WorldScopedSnapshot } from "../src/domain/index.js";
import { toWorldId } from "../src/world-domain/index.js";

describe("Me Settings linked AI disconnect atomic executor scaffold", () => {
  it("returns disabled without operations or mutation in disabled mode", () => {
    const snapshot = createSnapshot();
    const before = JSON.stringify(toPlain(snapshot));
    const preflight = createPreflight(snapshot);

    const result = simulateLinkedAIDisconnectExecution({
      mode: "disabled",
      preflightPlan: preflight,
      runtimeSnapshot: snapshot
    });

    assert.equal(result.status, "disabled");
    assert.equal(result.mutated, false);
    assert.deepEqual(result.simulatedOperations, []);
    assert.deepEqual(result.rollbackSteps, []);
    assert.equal(validateAtomicExecutionResult(result, preflight).valid, true);
    assert.equal(JSON.stringify(toPlain(snapshot)), before);
  });

  it("simulates ordered operations and rollback steps without mutation", () => {
    const snapshot = createSnapshot();
    const before = JSON.stringify(toPlain(snapshot));
    const preflight = createPreflight(snapshot);

    const result = simulateLinkedAIDisconnectExecution({
      mode: "simulate",
      preflightPlan: preflight,
      runtimeSnapshot: snapshot
    });

    assert.equal(result.status, "simulated");
    assert.equal(result.mutated, false);
    assert.deepEqual(
      result.simulatedOperations.map((operation) => operation.type),
      preflight.operations.map((operation) => operation.type)
    );
    assert.deepEqual(result.simulatedOperations.map((operation) => operation.order), preflight.operations.map((operation) => operation.order));
    assert.equal(result.rollbackSteps[0]?.type, "restore-global-link");
    assert.equal(result.rollbackSteps.some((step) => step.type === "restore-world-contact"), true);
    assert.equal(result.rollbackSteps.some((step) => step.type === "restore-private-chat"), true);
    assert.equal(result.rollbackSteps.some((step) => step.type === "restore-memory-scope"), true);
    assert.equal(result.rollbackSteps.some((step) => step.type === "restore-group-membership"), true);
    assert.equal(validateAtomicExecutionResult(result, preflight).valid, true);
    assert.equal(JSON.stringify(toPlain(snapshot)), before);
  });

  it("rejects execute mode as unavailable", () => {
    const snapshot = createSnapshot();
    const preflight = createPreflight(snapshot);

    const result = simulateLinkedAIDisconnectExecution({
      mode: "execute",
      preflightPlan: preflight,
      runtimeSnapshot: snapshot
    });

    assert.equal(result.status, "rejected");
    assert.match(result.error ?? "", /unavailable/);
    assert.equal(result.mutated, false);
    assert.deepEqual(result.simulatedOperations, []);
    assert.deepEqual(result.rollbackSteps, []);
    assert.equal(validateAtomicExecutionResult(result, preflight).valid, true);
  });

  it("keeps group history preserved and group membership/provider mutation deferred during simulation", () => {
    const snapshot = createSnapshot();
    const preflight = createPreflight(snapshot);

    const result = simulateLinkedAIDisconnectExecution({
      mode: "simulate",
      preflightPlan: preflight,
      runtimeSnapshot: snapshot
    });
    const preserveGroupHistory = result.simulatedOperations.find((operation) => operation.type === "preserve-group-history");
    const removeGroupLater = result.simulatedOperations.find((operation) => operation.type === "remove-group-membership-later");
    const providerDeferred = result.simulatedOperations.find((operation) => operation.type === "provider-connection-deferred");

    assert.equal(preserveGroupHistory?.status, "preserved");
    assert.match(preserveGroupHistory?.note ?? "", /historical removed-AI messages remain preserved/);
    assert.equal(removeGroupLater?.status, "deferred");
    assert.equal(providerDeferred?.status, "deferred");
  });

  it("rejects simulation when preflight validation fails", () => {
    const snapshot = createSnapshot();
    const preflight = createPreflight(snapshot);
    const invalidPreflight = {
      ...preflight,
      rollbackPlan: {
        ...preflight.rollbackPlan,
        restoreWorldContactIds: ["reality-target-contact"]
      }
    };

    const result = simulateLinkedAIDisconnectExecution({
      mode: "simulate",
      preflightPlan: invalidPreflight,
      runtimeSnapshot: snapshot
    });

    assert.equal(result.status, "rejected");
    assert.match(result.error ?? "", /rollback plan must match/);
    assert.equal(result.mutated, false);
  });
});

const realityWorldId = toWorldId("reality");
const customWorldId = toWorldId("custom:target-world");

function createPreflight(snapshot: WorldScopedSnapshot) {
  return createLinkedAIDisconnectPreflightPlan(
    createLinkedAIDisconnectExecutionPlan({ globalAILinkId: "link:target" }, snapshot),
    snapshot
  );
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
