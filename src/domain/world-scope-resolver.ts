import type {
  WorldChatSession,
  WorldContact as SnapshotWorldContact,
  WorldId,
  WorldSnapshot
} from "../world-domain/index.js";
import type {
  World,
  WorldChat,
  WorldContact,
  WorldScopedSnapshot,
  WorldScope
} from "./world-model.js";

export type ResolvableWorldSnapshot = WorldSnapshot | WorldScopedSnapshot;

export function resolveCurrentWorld(
  state: Readonly<{ readonly currentWorldId: WorldId }>,
  snapshot: ResolvableWorldSnapshot
): World | WorldSnapshot["worldMeta"] | null {
  if (isWorldScopedSnapshot(snapshot)) {
    return snapshot.worlds.get(state.currentWorldId)?.world ?? null;
  }
  return snapshot.worldMeta.id === state.currentWorldId ? snapshot.worldMeta : null;
}

export function resolveWorldChats(
  worldId: WorldId,
  snapshot: ResolvableWorldSnapshot
): readonly (WorldChat | WorldChatSession)[] {
  if (isWorldScopedSnapshot(snapshot)) {
    return snapshot.worlds.get(worldId)?.chats ?? [];
  }
  if (snapshot.worldMeta.id !== worldId) {
    return [];
  }
  return Array.from(snapshot.chatState.chats.values());
}

export function resolveWorldContacts(
  worldId: WorldId,
  snapshot: ResolvableWorldSnapshot
): readonly (WorldContact | SnapshotWorldContact)[] {
  if (isWorldScopedSnapshot(snapshot)) {
    return snapshot.worlds.get(worldId)?.contacts ?? [];
  }
  if (snapshot.worldMeta.id !== worldId) {
    return [];
  }
  return snapshot.contacts;
}

export function resolveWorldScope(
  worldId: WorldId,
  snapshot: WorldScopedSnapshot
): WorldScope | null {
  return snapshot.worlds.get(worldId) ?? null;
}

function isWorldScopedSnapshot(snapshot: ResolvableWorldSnapshot): snapshot is WorldScopedSnapshot {
  return "worlds" in snapshot && snapshot.worlds instanceof Map;
}
