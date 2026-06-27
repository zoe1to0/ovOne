import type { WorldDomain, WorldId, WorldSnapshot } from "../world-domain/index.js";

export type WorldLifecycleControllerInstance = Readonly<{
  readonly startWorld: (worldId: WorldId) => WorldSnapshot;
  readonly pauseWorld: (worldId: WorldId) => WorldSnapshot;
  readonly archiveWorld: (worldId: WorldId) => WorldSnapshot;
  readonly restoreWorld: (worldId: WorldId) => WorldSnapshot;
}>;

export type WorldLifecycleControllerInput = Readonly<{
  readonly worldDomain: WorldDomain;
}>;
