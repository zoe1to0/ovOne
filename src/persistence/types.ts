import type { AppRuntime } from "../app/index.js";
import type { MinimalProductShellRuntime } from "../minimal-ui-shell/index.js";
import type { WorldChatSession, WorldId, WorldSnapshot } from "../world-domain/index.js";

export type SerializedWorldSnapshot = Readonly<{
  readonly worldMeta: WorldSnapshot["worldMeta"];
  readonly contacts: WorldSnapshot["contacts"];
  readonly groups: WorldSnapshot["groups"];
  readonly chatState: Readonly<{
    readonly activeChatId: string | null;
    readonly chats: readonly WorldChatSession[];
  }>;
  readonly memorySummary: WorldSnapshot["memorySummary"];
  readonly runtimeState: WorldSnapshot["runtimeState"];
}>;

export type PersistenceStorage = Readonly<{
  readonly listWorldIds: () => readonly WorldId[];
  readonly readWorld: (worldId: WorldId) => unknown | null;
  readonly readWorldHistory?: (worldId: WorldId) => readonly unknown[];
  readonly writeWorld: (worldId: WorldId, snapshot: SerializedWorldSnapshot) => void;
}>;

export type PersistenceNotification = Readonly<{
  readonly worldId: WorldId;
  readonly type: "corruption-recovered" | "corruption-unrecoverable";
  readonly message: string;
}>;

export type WorldPersistence = Readonly<{
  readonly saveWorld: (worldId: WorldId) => SerializedWorldSnapshot;
  readonly saveWorlds: (worldIds: readonly WorldId[]) => readonly SerializedWorldSnapshot[];
  readonly loadWorld: (worldId: WorldId) => WorldSnapshot | null;
  readonly restoreFromSnapshot: (snapshot: WorldSnapshot | SerializedWorldSnapshot) => WorldSnapshot;
  readonly restoreStoredWorlds: () => readonly WorldSnapshot[];
  readonly notifications: () => readonly PersistenceNotification[];
}>;

export type WorldPersistenceInput = Readonly<{
  readonly app: AppRuntime;
  readonly storage?: PersistenceStorage;
}>;

export type PersistentAppRuntime = Readonly<{
  readonly app: AppRuntime;
  readonly persistence: WorldPersistence;
  readonly restoredWorlds: readonly WorldSnapshot[];
}>;

export type PersistentProductRuntime = Readonly<{
  readonly app: AppRuntime;
  readonly persistence: WorldPersistence;
  readonly shell: MinimalProductShellRuntime;
  readonly restoredWorlds: readonly WorldSnapshot[];
}>;

export type PersistentAppOptions = Readonly<{
  readonly storage?: PersistenceStorage;
}>;
