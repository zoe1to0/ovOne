import type { WorldId } from "../world-domain/index.js";
import type { PersistenceStorage, SerializedWorldSnapshot } from "./types.js";

export type MemoryWorldStorage = PersistenceStorage & Readonly<{
  readonly writeRawWorld: (worldId: WorldId, snapshot: unknown) => void;
}>;

export function createMemoryWorldStorage(
  initial: readonly SerializedWorldSnapshot[] = []
): MemoryWorldStorage {
  const entries = new Map<WorldId, unknown[]>();

  for (const snapshot of initial) {
    entries.set(snapshot.worldMeta.id, [snapshot]);
  }

  return Object.freeze({
    listWorldIds: () => Object.freeze([...entries.keys()]),
    readWorld: (worldId: WorldId) => entries.get(worldId)?.at(-1) ?? null,
    readWorldHistory: (worldId: WorldId) => Object.freeze([...(entries.get(worldId) ?? [])]),
    writeWorld: (worldId: WorldId, snapshot: SerializedWorldSnapshot) => {
      entries.set(worldId, [...(entries.get(worldId) ?? []), snapshot]);
    },
    writeRawWorld: (worldId: WorldId, snapshot: unknown) => {
      entries.set(worldId, [...(entries.get(worldId) ?? []), snapshot]);
    }
  });
}
