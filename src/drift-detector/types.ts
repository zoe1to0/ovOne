import type { RuntimeHarnessResult, SimulatedRuntimeEvent } from "../runtime-harness/index.js";

export type DriftLayer = "Kernel" | "World" | "Patch" | "Snapshot";

export type DriftFinding = Readonly<{
  readonly layer: DriftLayer;
  readonly runIndex: number;
  readonly diffSummary: string;
  readonly firstDivergencePoint: string;
  readonly expected: string;
  readonly actual: string;
}>;

export type DriftReport = Readonly<{
  readonly deterministic: boolean;
  readonly runs: number;
  readonly findings: readonly DriftFinding[];
  readonly executions: readonly RuntimeHarnessResult[];
}>;

export type DriftDetectorOptions = Readonly<{
  readonly print?: boolean;
  readonly logger?: (line: string) => void;
}>;

export type RuntimeExecutionComparator = Readonly<{
  readonly eventSequence: readonly SimulatedRuntimeEvent[];
  readonly runs?: number;
  readonly options?: DriftDetectorOptions;
}>;
