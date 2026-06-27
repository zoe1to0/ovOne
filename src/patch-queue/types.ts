import type { WorldState } from "../world-domain/index.js";

export type PatchSource = "creation" | "ovo" | "contact" | "kernel";
export type PatchOperation = "initialize" | "merge" | "append" | "replace" | "set" | "upsert";

export type StatePatch = Readonly<{
  readonly source: PatchSource;
  readonly priority: number;
  readonly timestamp: number;
  readonly targetField: string;
  readonly operation: PatchOperation;
  readonly value: unknown;
}>;

export type PatchQueue = Readonly<{
  readonly patches: readonly StatePatch[];
}>;

export type PatchInput = Readonly<{
  readonly source: PatchSource;
  readonly targetField: string;
  readonly operation: PatchOperation;
  readonly value: unknown;
  readonly timestamp?: number;
}>;

export type PatchQueueReducer = Readonly<{
  readonly enqueue: (patch: PatchInput) => PatchQueue;
  readonly reduce: () => WorldState;
  readonly snapshot: () => PatchQueue;
}>;
