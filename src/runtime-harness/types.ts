import type { ChatKernelEvent } from "../chat-kernel/index.js";
import type { StatePatch } from "../patch-queue/index.js";
import type { WorldId, WorldSnapshot } from "../world-domain/index.js";

export type SimulatedRuntimeEvent =
  | Readonly<{
      readonly type: "create_world";
      readonly payload?: WorldId | "default" | "reality";
    }>
  | Readonly<{
      readonly type: "world_patch";
      readonly payload: Readonly<{
        readonly worldView?: Readonly<Record<string, unknown>>;
        readonly settings?: Readonly<Record<string, unknown>>;
      }>;
    }>
  | Readonly<{
      readonly type: "contact_persona";
      readonly payload: Readonly<{
        readonly actorId: string;
        readonly tone?: Readonly<Record<string, unknown>>;
        readonly personality?: Readonly<Record<string, unknown>>;
        readonly relationshipPerception?: Readonly<Record<string, unknown>>;
      }>;
    }>
  | Readonly<{
      readonly type: "message";
      readonly payload: string;
    }>
  | Readonly<{
      readonly type: "switch_world";
      readonly payload: WorldId | "default" | "reality";
    }>;

export type RuntimeHarnessLog =
  | Readonly<{
      readonly kind: "event";
      readonly index: number;
      readonly event: SimulatedRuntimeEvent;
      readonly worldId: WorldId;
    }>
  | Readonly<{
      readonly kind: "kernel";
      readonly transition: "processed" | "skipped";
      readonly reason?: string;
      readonly event?: ChatKernelEvent;
    }>
  | Readonly<{
      readonly kind: "patches";
      readonly patches: readonly StatePatch[];
    }>
  | Readonly<{
      readonly kind: "snapshot";
      readonly snapshot: WorldSnapshot;
    }>;

export type RuntimeHarnessResult = Readonly<{
  readonly logs: readonly RuntimeHarnessLog[];
  readonly snapshot: WorldSnapshot;
}>;

export type RuntimeHarnessOptions = Readonly<{
  readonly print?: boolean;
  readonly logger?: (line: string) => void;
}>;
