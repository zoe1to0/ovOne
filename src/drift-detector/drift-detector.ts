import type { StatePatch } from "../patch-queue/index.js";
import { runEvents } from "../runtime-harness/index.js";
import type {
  RuntimeHarnessLog,
  RuntimeHarnessResult,
  SimulatedRuntimeEvent
} from "../runtime-harness/index.js";
import type { WorldSnapshot } from "../world-domain/index.js";
import type { DriftFinding, DriftLayer, DriftReport, DriftDetectorOptions } from "./types.js";

type SerializedExecution = Readonly<Record<DriftLayer, readonly string[]>>;

export const DriftDetector = Object.freeze({
  runWithComparison,
  compareExecutions,
  formatReport
});

export function runWithComparison(
  eventSequence: readonly SimulatedRuntimeEvent[],
  runs = 2,
  options: DriftDetectorOptions = {}
): DriftReport {
  if (runs < 2) {
    throw new Error("DriftDetector: comparison requires at least 2 runs.");
  }

  const executions = Array.from({ length: runs }, () =>
    runEvents(eventSequence, { print: false })
  );
  const report = compareExecutions(executions);

  if (options.print ?? true) {
    (options.logger ?? console.log)(formatReport(report));
  }

  return report;
}

export function compareExecutions(executions: readonly RuntimeHarnessResult[]): DriftReport {
  if (executions.length < 2) {
    throw new Error("DriftDetector: comparison requires at least 2 executions.");
  }

  const serialized = executions.map(serializeExecution);
  const baseline = serialized[0]!;
  const findings: DriftFinding[] = [];

  serialized.slice(1).forEach((candidate, index) => {
    const runIndex = index + 1;
    for (const layer of layerOrder()) {
      const finding = compareLayer(layer, runIndex, baseline[layer], candidate[layer]);
      if (finding) {
        findings.push(finding);
      }
    }
  });

  return Object.freeze({
    deterministic: findings.length === 0,
    runs: executions.length,
    findings: Object.freeze(findings),
    executions: Object.freeze([...executions])
  });
}

export function formatReport(report: DriftReport): string {
  if (report.deterministic) {
    return [
      "DriftDetector: deterministic",
      `runs=${report.runs}`,
      "findings=0"
    ].join("\n");
  }

  return [
    "DriftDetector: drift detected",
    `runs=${report.runs}`,
    ...report.findings.map((finding) =>
      [
        `layer=${finding.layer}`,
        `run=${finding.runIndex}`,
        `firstDivergencePoint=${finding.firstDivergencePoint}`,
        `summary=${finding.diffSummary}`
      ].join("\n")
    )
  ].join("\n---\n");
}

function serializeExecution(result: RuntimeHarnessResult): SerializedExecution {
  return Object.freeze({
    Kernel: result.logs
      .filter((log) => log.kind === "kernel")
      .map((log) => stableSerialize(normalizeKernelLog(log))),
    Patch: result.logs
      .filter((log) => log.kind === "patches")
      .map((log) => stableSerialize(log.patches.map(normalizePatch))),
    Snapshot: result.logs
      .filter((log) => log.kind === "snapshot")
      .map((log) => stableSerialize(normalizeSnapshot(log.snapshot))),
    World: [stableSerialize(normalizeSnapshot(result.snapshot))]
  });
}

function compareLayer(
  layer: DriftLayer,
  runIndex: number,
  expected: readonly string[],
  actual: readonly string[]
): DriftFinding | null {
  if (stableSerialize(expected) === stableSerialize(actual)) {
    return null;
  }

  const divergenceIndex = firstDivergenceIndex(expected, actual);
  const expectedValue = expected[divergenceIndex] ?? "<missing>";
  const actualValue = actual[divergenceIndex] ?? "<missing>";

  return Object.freeze({
    layer,
    runIndex,
    diffSummary: `${layer} output diverged at item ${divergenceIndex}.`,
    firstDivergencePoint: `${layer}[${divergenceIndex}]`,
    expected: expectedValue,
    actual: actualValue
  });
}

function firstDivergenceIndex(left: readonly string[], right: readonly string[]): number {
  const max = Math.max(left.length, right.length);
  for (let index = 0; index < max; index += 1) {
    if (left[index] !== right[index]) {
      return index;
    }
  }
  return 0;
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

function stableSerialize(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, sortValue(nested)])
    );
  }
  return value;
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

function layerOrder(): readonly DriftLayer[] {
  return ["Kernel", "Patch", "Snapshot", "World"];
}
