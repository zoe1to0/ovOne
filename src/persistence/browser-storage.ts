import type { WorldId } from "../world-domain/index.js";
import type { PersistenceStorage, SerializedWorldSnapshot } from "./types.js";

const STORAGE_KEY = "ovone:v2:world-snapshots";

export function createBrowserWorldStorage(
  storage: Storage = window.localStorage
): PersistenceStorage {
  return Object.freeze({
    listWorldIds: () => Object.freeze(Object.keys(readStore(storage)) as WorldId[]),
    readWorld: (worldId: WorldId) => readStore(storage)[worldId]?.at(-1) ?? null,
    readWorldHistory: (worldId: WorldId) => Object.freeze([...(readStore(storage)[worldId] ?? [])]),
    writeWorld: (worldId: WorldId, snapshot: SerializedWorldSnapshot) => {
      const store = readStore(storage);
      writeStore(storage, {
        ...store,
        [worldId]: [...(store[worldId] ?? []), snapshot]
      });
    }
  });
}

function readStore(storage: Storage): Record<string, unknown[]> {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed as Record<string, unknown[]>;
  } catch {
    return {};
  }
}

function writeStore(storage: Storage, value: Record<string, unknown[]>): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(value));
}
