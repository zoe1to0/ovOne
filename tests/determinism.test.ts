import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { runEvents } from "../src/index.js";
import type {
  RuntimeHarnessLog,
  RuntimeHarnessResult,
  SimulatedRuntimeEvent,
  StatePatch,
  WorldSnapshot
} from "../src/index.js";

describe("ovOne v2 runtime determinism", () => {
  it("keeps create world -> message -> switch world deterministic", () => {
    assertDeterministic([
      { type: "create_world" },
      { type: "message", payload: "hello" },
      { type: "switch_world", payload: "reality" }
    ]);
  });

  it("keeps multiple message bursts deterministic", () => {
    assertDeterministic([
      { type: "create_world" },
      { type: "message", payload: "first" },
      { type: "message", payload: "second" },
      { type: "message", payload: "third" },
      { type: "message", payload: "fourth" }
    ]);
  });

  it("keeps mixed contact and world events deterministic", () => {
    assertDeterministic([
      { type: "create_world" },
      {
        type: "world_patch",
        payload: {
          worldView: { era: "near-future", weather: "rain" },
          settings: { memoryMode: "world-scoped" }
        }
      },
      {
        type: "contact_persona",
        payload: {
          actorId: "ovone",
          tone: { warmth: "steady" },
          personality: { patience: "high" },
          relationshipPerception: { user: "trusted" }
        }
      },
      { type: "message", payload: "mixed flow" }
    ]);
  });

  it("keeps repeated execution of the same event list deterministic", () => {
    assertDeterministic(
      [
        { type: "create_world" },
        { type: "message", payload: "repeatable" },
        {
          type: "world_patch",
          payload: {
            settings: { audit: "deterministic" }
          }
        },
        { type: "message", payload: "still repeatable" },
        { type: "switch_world", payload: "reality" },
        { type: "message", payload: "reality repeatable" }
      ],
      5
    );
  });
});

function assertDeterministic(
  events: readonly SimulatedRuntimeEvent[],
  runCount = 3
): void {
  const outputs = Array.from({ length: runCount }, () =>
    normalizeResult(runEvents(events, { print: false }))
  );
  const baseline = outputs[0]!;

  outputs.slice(1).forEach((output, index) => {
    assert.deepEqual(
      output.kernel,
      baseline.kernel,
      failure("Kernel", index + 1, baseline.kernel, output.kernel)
    );
    assert.deepEqual(
      output.patches,
      baseline.patches,
      failure("Patch", index + 1, baseline.patches, output.patches)
    );
    assert.deepEqual(
      output.snapshots,
      baseline.snapshots,
      failure("Snapshot", index + 1, baseline.snapshots, output.snapshots)
    );
  });
}

function normalizeResult(result: RuntimeHarnessResult): Readonly<{
  readonly kernel: readonly unknown[];
  readonly patches: readonly unknown[];
  readonly snapshots: readonly unknown[];
}> {
  return {
    kernel: result.logs
      .filter((log) => log.kind === "kernel")
      .map((log) => normalizeKernelLog(log)),
    patches: result.logs
      .filter((log) => log.kind === "patches")
      .map((log) => log.patches.map(normalizePatch)),
    snapshots: result.logs
      .filter((log) => log.kind === "snapshot")
      .map((log) => normalizeSnapshot(log.snapshot))
  };
}

function normalizeKernelLog(log: Extract<RuntimeHarnessLog, { readonly kind: "kernel" }>): unknown {
  return {
    transition: log.transition,
    reason: log.reason ?? null,
    event: log.event ? toPlainValue(log.event) : null
  };
}

function normalizePatch(patch: StatePatch): unknown {
  return {
    source: patch.source,
    priority: patch.priority,
    timestamp: patch.timestamp,
    targetField: patch.targetField,
    operation: patch.operation,
    value: toPlainValue(patch.value)
  };
}

function normalizeSnapshot(snapshot: WorldSnapshot): unknown {
  return {
    worldMeta: toPlainValue(snapshot.worldMeta),
    contacts: toPlainValue(snapshot.contacts),
    groups: toPlainValue(snapshot.groups),
    chatState: {
      activeChatId: snapshot.chatState.activeChatId,
      chats: [...snapshot.chatState.chats.values()].map(toPlainValue)
    },
    memorySummary: toPlainValue(snapshot.memorySummary),
    runtimeState: toPlainValue(snapshot.runtimeState)
  };
}

function toPlainValue(value: unknown): unknown {
  if (value instanceof Map) {
    return [...value.entries()].map(([key, nested]) => [key, toPlainValue(nested)]);
  }
  if (Array.isArray(value)) {
    return value.map(toPlainValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, toPlainValue(nested)])
    );
  }
  return value;
}

function failure(layer: "Kernel" | "Patch" | "Snapshot", runIndex: number, expected: unknown, actual: unknown): string {
  return [
    `Non-determinism detected in ${layer} layer on repeated run ${runIndex}.`,
    `expected=${JSON.stringify(expected)}`,
    `actual=${JSON.stringify(actual)}`
  ].join("\n");
}
