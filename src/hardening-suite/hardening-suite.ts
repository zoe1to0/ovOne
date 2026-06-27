import { runWithComparison } from "../drift-detector/index.js";
import { runEvents } from "../runtime-harness/index.js";
import type { RuntimeHarnessLog, SimulatedRuntimeEvent } from "../runtime-harness/index.js";
import type { WorldSnapshot } from "../world-domain/index.js";
import type {
  HardeningFailure,
  HardeningLayer,
  HardeningModuleName,
  HardeningSuiteOptions,
  HardeningSuiteReport,
  HardeningTestResult
} from "./types.js";

type HardeningCheck = () => readonly HardeningFailure[];

const deterministicFlow: readonly SimulatedRuntimeEvent[] = Object.freeze([
  { type: "create_world" },
  { type: "message", payload: "hello" },
  { type: "switch_world", payload: "reality" }
]);

const mixedFlow: readonly SimulatedRuntimeEvent[] = Object.freeze([
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
      personality: { patience: "high" }
    }
  },
  { type: "message", payload: "mixed flow" },
  { type: "switch_world", payload: "reality" },
  { type: "message", payload: "reality flow" }
]);

export const HardeningTestSuite = Object.freeze({
  runHardeningSuite,
  formatHardeningReport
});

export function runHardeningSuite(options: HardeningSuiteOptions = {}): HardeningSuiteReport {
  const results: HardeningTestResult[] = [
    runModule("DeterminismTests", runDeterminismTests),
    runModule("StateIsolationTests", runStateIsolationTests),
    runModule("EventStressTests", runEventStressTests),
    runModule("PatchCollisionTests", runPatchCollisionTests),
    runModule("SnapshotConsistencyTests", runSnapshotConsistencyTests),
    runModule("MemoryBoundaryTests", runMemoryBoundaryTests)
  ];

  const report = Object.freeze({
    passed: results.every((result) => result.passed),
    results: Object.freeze(results)
  });

  if (options.print ?? true) {
    (options.logger ?? console.log)(formatHardeningReport(report));
  }

  return report;
}

export function formatHardeningReport(report: HardeningSuiteReport): string {
  const lines = [
    `HardeningTestSuite: ${report.passed ? "passed" : "failed"}`,
    ...report.results.map((result) =>
      `${result.module}: ${result.passed ? "passed" : `failed (${result.failures.length})`}`
    )
  ];

  const failures = report.results.flatMap((result) => result.failures);
  if (failures.length === 0) {
    return lines.join("\n");
  }

  return [
    ...lines,
    ...failures.map((failure) =>
      [
        "---",
        `module=${failure.module}`,
        `layer=${failure.layer}`,
        `firstDivergenceEvent=${failure.firstDivergenceEvent}`,
        `summary=${failure.diffSummary}`,
        ...(failure.expected ? [`expected=${failure.expected}`] : []),
        ...(failure.actual ? [`actual=${failure.actual}`] : [])
      ].join("\n")
    )
  ].join("\n");
}

function runModule(module: HardeningModuleName, check: HardeningCheck): HardeningTestResult {
  const failures = check();
  return Object.freeze({
    module,
    passed: failures.length === 0,
    failures: Object.freeze(failures)
  });
}

function runDeterminismTests(): readonly HardeningFailure[] {
  return driftFailures("DeterminismTests", deterministicFlow, 4);
}

function runStateIsolationTests(): readonly HardeningFailure[] {
  const result = runEvents(mixedFlow, { print: false });
  const failures: HardeningFailure[] = [
    ...driftFailures("StateIsolationTests", mixedFlow, 3)
  ];
  const snapshots = snapshotLogs(result.logs);
  const defaultSnapshots = snapshots.filter((snapshot) => snapshot.worldMeta.id === "custom:default");
  const realitySnapshots = snapshots.filter((snapshot) => snapshot.worldMeta.id === "reality");
  const finalDefault = defaultSnapshots.at(-1);
  const finalReality = realitySnapshots.at(-1);

  if (!finalDefault || !finalReality) {
    failures.push(failure(
      "StateIsolationTests",
      "World",
      "switch_world",
      "Expected both default and reality world snapshots."
    ));
    return failures;
  }

  if (messageTexts(finalDefault).includes("reality flow")) {
    failures.push(failure(
      "StateIsolationTests",
      "World",
      "message:reality flow",
      "Reality message leaked into default world snapshot."
    ));
  }
  if (messageTexts(finalReality).includes("mixed flow")) {
    failures.push(failure(
      "StateIsolationTests",
      "World",
      "switch_world:reality",
      "Default world message leaked into reality world snapshot."
    ));
  }

  return failures;
}

function runEventStressTests(): readonly HardeningFailure[] {
  const stressEvents: SimulatedRuntimeEvent[] = [{ type: "create_world" }];
  for (let index = 0; index < 50; index += 1) {
    stressEvents.push({ type: "message", payload: `stress:${index}` });
  }

  const failures = [...driftFailures("EventStressTests", stressEvents, 3)];
  const result = runEvents(stressEvents, { print: false });
  const finalSnapshot = snapshotLogs(result.logs).at(-1);
  const count = finalSnapshot ? messageTexts(finalSnapshot).length : 0;

  if (count !== 50) {
    failures.push(failure(
      "EventStressTests",
      "Kernel",
      "stress:49",
      "Stress message count diverged from expected sequential processing.",
      "50",
      String(count)
    ));
  }

  return failures;
}

function runPatchCollisionTests(): readonly HardeningFailure[] {
  const collisionEvents: readonly SimulatedRuntimeEvent[] = Object.freeze([
    { type: "create_world" },
    { type: "world_patch", payload: { settings: { mode: "first" } } },
    { type: "world_patch", payload: { settings: { mode: "second", scope: "world" } } },
    { type: "contact_persona", payload: { actorId: "ovone", tone: { warmth: "low" } } },
    { type: "contact_persona", payload: { actorId: "ovone", tone: { warmth: "high" } } }
  ]);
  const failures = [...driftFailures("PatchCollisionTests", collisionEvents, 3)];
  const result = runEvents(collisionEvents, { print: false });
  const finalSnapshot = snapshotLogs(result.logs).at(-1);

  if (!finalSnapshot) {
    return [
      ...failures,
      failure("PatchCollisionTests", "Snapshot", "final", "Missing final snapshot.")
    ];
  }

  if (finalSnapshot.runtimeState.metadata.settings.mode !== "second") {
    failures.push(failure(
      "PatchCollisionTests",
      "Patch",
      "world_patch:second",
      "Same-target structural patch did not resolve deterministically.",
      "second",
      String(finalSnapshot.runtimeState.metadata.settings.mode)
    ));
  }
  if (finalSnapshot.runtimeState.metadata.personaOverlays.ovone?.tone?.warmth !== "high") {
    failures.push(failure(
      "PatchCollisionTests",
      "Patch",
      "contact_persona:ovone",
      "Persona overlay collision did not resolve deterministically.",
      "high",
      String(finalSnapshot.runtimeState.metadata.personaOverlays.ovone?.tone?.warmth)
    ));
  }

  return failures;
}

function runSnapshotConsistencyTests(): readonly HardeningFailure[] {
  const result = runEvents(mixedFlow, { print: false });
  const failures = [...driftFailures("SnapshotConsistencyTests", mixedFlow, 3)];

  snapshotLogs(result.logs).forEach((snapshot, index) => {
    for (const contact of snapshot.contacts) {
      if (contact.worldId !== snapshot.worldMeta.id) {
        failures.push(failure(
          "SnapshotConsistencyTests",
          "Snapshot",
          `snapshot:${index}`,
          "Contact worldId does not match snapshot worldMeta id.",
          snapshot.worldMeta.id,
          contact.worldId
        ));
      }
    }

    for (const chat of snapshot.chatState.chats.values()) {
      if (chat.worldId !== snapshot.worldMeta.id) {
        failures.push(failure(
          "SnapshotConsistencyTests",
          "Snapshot",
          `snapshot:${index}`,
          "Chat worldId does not match snapshot worldMeta id.",
          snapshot.worldMeta.id,
          chat.worldId
        ));
      }
    }
  });

  return failures;
}

function runMemoryBoundaryTests(): readonly HardeningFailure[] {
  const result = runEvents(mixedFlow, { print: false });
  const failures = [...driftFailures("MemoryBoundaryTests", mixedFlow, 3)];
  const snapshots = snapshotLogs(result.logs);

  for (const snapshot of snapshots) {
    const expectedNamespace = `world:${snapshot.worldMeta.id}`;
    if (snapshot.memorySummary.namespace !== expectedNamespace) {
      failures.push(failure(
        "MemoryBoundaryTests",
        "Memory",
        `snapshot:${snapshot.worldMeta.id}`,
        "Memory namespace does not match world boundary.",
        expectedNamespace,
        snapshot.memorySummary.namespace
      ));
    }
    if (snapshot.memorySummary.scope.worldId !== snapshot.worldMeta.id) {
      failures.push(failure(
        "MemoryBoundaryTests",
        "Memory",
        `snapshot:${snapshot.worldMeta.id}`,
        "Memory scope worldId does not match snapshot world id.",
        snapshot.worldMeta.id,
        snapshot.memorySummary.scope.worldId
      ));
    }
  }

  const namespaces = new Set(snapshots.map((snapshot) => snapshot.memorySummary.namespace));
  if (!namespaces.has("world:custom:default") || !namespaces.has("world:reality")) {
    failures.push(failure(
      "MemoryBoundaryTests",
      "Memory",
      "switch_world:reality",
      "Expected distinct memory namespaces for default and reality worlds."
    ));
  }

  return failures;
}

function driftFailures(
  module: HardeningModuleName,
  events: readonly SimulatedRuntimeEvent[],
  runs: number
): readonly HardeningFailure[] {
  const report = runWithComparison(events, runs, { print: false });
  return report.findings.map((finding) =>
    failure(
      module,
      finding.layer,
      finding.firstDivergencePoint,
      finding.diffSummary,
      finding.expected,
      finding.actual
    )
  );
}

function snapshotLogs(logs: readonly RuntimeHarnessLog[]): readonly WorldSnapshot[] {
  return logs
    .filter((log) => log.kind === "snapshot")
    .map((log) => log.snapshot);
}

function messageTexts(snapshot: WorldSnapshot): readonly string[] {
  return [...snapshot.chatState.chats.values()].flatMap((chat) =>
    chat.messages.map((message) => message.text)
  );
}

function failure(
  module: HardeningModuleName,
  layer: HardeningLayer,
  firstDivergenceEvent: string,
  diffSummary: string,
  expected?: string,
  actual?: string
): HardeningFailure {
  return Object.freeze({
    module,
    layer,
    firstDivergenceEvent,
    diffSummary,
    ...(expected === undefined ? {} : { expected }),
    ...(actual === undefined ? {} : { actual })
  });
}
