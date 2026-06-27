import type { WorldLifecycleControllerInput, WorldLifecycleControllerInstance } from "./types.js";
import type { WorldId, WorldSnapshot } from "../world-domain/index.js";

export const WorldLifecycleController = Object.freeze({
  create
});

export function create(input: WorldLifecycleControllerInput): WorldLifecycleControllerInstance {
  const { worldDomain } = input;

  return Object.freeze({
    startWorld: (worldId: WorldId) => {
      worldDomain.setLifecycle(worldId, "active");
      return worldDomain.generateSnapshot(worldId);
    },
    pauseWorld: (worldId: WorldId) => {
      worldDomain.setLifecycle(worldId, "paused");
      return worldDomain.generateSnapshot(worldId);
    },
    archiveWorld: (worldId: WorldId) => {
      worldDomain.setLifecycle(worldId, "archived");
      return worldDomain.generateSnapshot(worldId);
    },
    restoreWorld: (worldId: WorldId) => restoreWorld(worldDomain, worldId)
  });
}

function restoreWorld(
  worldDomain: WorldLifecycleControllerInput["worldDomain"],
  worldId: WorldId
): WorldSnapshot {
  const snapshot = worldDomain.generateSnapshot(worldId);
  worldDomain.setLifecycle(snapshot.worldMeta.id, "restored");
  return worldDomain.generateSnapshot(worldId);
}
