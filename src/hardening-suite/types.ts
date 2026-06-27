export type HardeningModuleName =
  | "DeterminismTests"
  | "StateIsolationTests"
  | "EventStressTests"
  | "PatchCollisionTests"
  | "SnapshotConsistencyTests"
  | "MemoryBoundaryTests";

export type HardeningLayer = "Kernel" | "World" | "Patch" | "Snapshot" | "Memory";

export type HardeningFailure = Readonly<{
  readonly module: HardeningModuleName;
  readonly layer: HardeningLayer;
  readonly firstDivergenceEvent: string;
  readonly diffSummary: string;
  readonly expected?: string;
  readonly actual?: string;
}>;

export type HardeningTestResult = Readonly<{
  readonly module: HardeningModuleName;
  readonly passed: boolean;
  readonly failures: readonly HardeningFailure[];
}>;

export type HardeningSuiteReport = Readonly<{
  readonly passed: boolean;
  readonly results: readonly HardeningTestResult[];
}>;

export type HardeningSuiteOptions = Readonly<{
  readonly print?: boolean;
  readonly logger?: (line: string) => void;
}>;
