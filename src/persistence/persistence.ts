import { App } from "../app/index.js";
import type { AppRuntime } from "../app/index.js";
import { MinimalUiShell } from "../minimal-ui-shell/index.js";
import type { MinimalProductShellRuntime, MinimalProductShellView } from "../minimal-ui-shell/index.js";
import {
  toChatEventId,
  toChatId,
  toMessageId,
  transition
} from "../chat-kernel/index.js";
import type { ChatId, MessageId } from "../chat-kernel/index.js";
import { createPatchQueue } from "../patch-queue/index.js";
import { toWorldId } from "../world-domain/index.js";
import type { WorldChatSession, WorldId, WorldSnapshot, WorldState } from "../world-domain/index.js";
import { createMemoryWorldStorage } from "./memory-storage.js";
import type {
  PersistenceStorage,
  PersistenceNotification,
  PersistentAppOptions,
  PersistentAppRuntime,
  PersistentProductRuntime,
  SerializedWorldSnapshot,
  WorldPersistence,
  WorldPersistenceInput
} from "./types.js";

export const PersistenceLayer = Object.freeze({
  create: createWorldPersistence,
  createPersistentApp,
  createPersistentProductRuntime,
  createPersistentMinimalUiShell,
  createMemoryWorldStorage,
  serializeSnapshot,
  deserializeSnapshot
});

export function createWorldPersistence(input: WorldPersistenceInput): WorldPersistence {
  const storage = input.storage ?? createMemoryWorldStorage();
  const app = input.app;
  const notifications: PersistenceNotification[] = [];

  return Object.freeze({
    saveWorld: (worldId: WorldId) => {
      const serialized = serializeSnapshot(app.worldDomain.generateSnapshot(worldId));
      storage.writeWorld(worldId, serialized);
      return serialized;
    },
    saveWorlds: (worldIds: readonly WorldId[]) =>
      Object.freeze(worldIds.map((worldId) => {
        const serialized = serializeSnapshot(app.worldDomain.generateSnapshot(worldId));
        storage.writeWorld(worldId, serialized);
        return serialized;
      })),
    loadWorld: (worldId: WorldId) => {
      const stored = latestValidStoredSnapshot(storage, worldId, notifications);
      return stored ? deserializeSnapshot(stored) : null;
    },
    restoreFromSnapshot: (snapshot: WorldSnapshot | SerializedWorldSnapshot) =>
      restoreSnapshotIntoApp(app, deserializeSnapshot(snapshot)),
    restoreStoredWorlds: () =>
      storage.listWorldIds().flatMap((worldId) => {
        const stored = latestValidStoredSnapshot(storage, worldId, notifications);
        if (!stored) {
          return [];
        }
        return restoreSnapshotIntoApp(app, deserializeSnapshot(stored));
      }),
    notifications: () => Object.freeze([...notifications])
  });
}

export function createPersistentApp(options: PersistentAppOptions = {}): PersistentAppRuntime {
  const app = App.init();
  const persistence = createWorldPersistence(
    options.storage === undefined
      ? { app }
      : { app, storage: options.storage }
  );
  const restoredWorlds = persistence.restoreStoredWorlds();

  return Object.freeze({
    app,
    persistence,
    restoredWorlds: Object.freeze(restoredWorlds)
  });
}

export function createPersistentProductRuntime(
  options: PersistentAppOptions = {}
): PersistentProductRuntime {
  const runtime = createPersistentApp(options);
  return Object.freeze({
    ...runtime,
    shell: createPersistentMinimalUiShell(runtime.app, runtime.persistence, runtime.restoredWorlds.map((world) => world.worldMeta.id))
  });
}

export function createPersistentMinimalUiShell(
  app: AppRuntime,
  persistence: WorldPersistence,
  restoredWorldIds: readonly WorldId[] = []
): MinimalProductShellRuntime {
  const shell = MinimalUiShell.init(app, { worldIds: restoredWorldIds });

  const saveVisibleWorlds = (view: MinimalProductShellView): void => {
    persistence.saveWorlds(view.availableWorlds.map((world) => world.worldId));
  };

  const withAutosave = (view: MinimalProductShellView): MinimalProductShellView => {
    saveVisibleWorlds(view);
    return view;
  };

  const initialView = shell.view();
  saveVisibleWorlds(initialView);

  return Object.freeze({
    openScreen: (screen) => withAutosave(shell.openScreen(screen)),
    switchWorld: (worldId) => withAutosave(shell.switchWorld(worldId)),
    createWorldFromDraft: (draft) => withAutosave(shell.createWorldFromDraft(draft)),
    saveWorldMetadata: (patch) => withAutosave(shell.saveWorldMetadata(patch)),
    saveWorldRoleMetadata: (patch) => withAutosave(shell.saveWorldRoleMetadata(patch)),
    saveContactDetailPreferences: (patch) => withAutosave(shell.saveContactDetailPreferences(patch)),
    saveChatAppearanceSettings: (patch) => withAutosave(shell.saveChatAppearanceSettings(patch)),
    saveGroupRules: (patch) => withAutosave(shell.saveGroupRules(patch)),
    addGroupMember: (command) => withAutosave(shell.addGroupMember(command)),
    removeGroupMember: (command) => withAutosave(shell.removeGroupMember(command)),
    deleteFriend: (command) => withAutosave(shell.deleteFriend(command)),
    addWorldMember: (command) => withAutosave(shell.addWorldMember(command)),
    removeWorldMember: (command) => withAutosave(shell.removeWorldMember(command)),
    createGroupChat: (input) => withAutosave(shell.createGroupChat(input)),
    sendMessage: (text) => withAutosave(shell.sendMessage(text)),
    snapshot: shell.snapshot,
    view: shell.view
  });
}

export function serializeSnapshot(snapshot: WorldSnapshot): SerializedWorldSnapshot {
  return deepFreeze({
    worldMeta: { ...snapshot.worldMeta },
    contacts: snapshot.contacts.map((contact) => ({ ...contact })),
    groups: snapshot.groups.map((group) => ({
      ...group,
      actorIds: [...group.actorIds]
    })),
    chatState: {
      activeChatId: snapshot.chatState.activeChatId,
      chats: [...snapshot.chatState.chats.values()].map((chat) => ({
        ...chat,
        messages: chat.messages.map((message) => ({ ...message }))
      }))
    },
    memorySummary: {
      scope: { ...snapshot.memorySummary.scope },
      namespace: snapshot.memorySummary.namespace
    },
    runtimeState: {
      metadata: {
        title: snapshot.runtimeState.metadata.title,
        type: snapshot.runtimeState.metadata.type,
        worldView: { ...snapshot.runtimeState.metadata.worldView },
        settings: { ...snapshot.runtimeState.metadata.settings },
        personaOverlays: { ...snapshot.runtimeState.metadata.personaOverlays }
      },
      activeChatId: snapshot.runtimeState.activeChatId
    }
  });
}

export function deserializeSnapshot(snapshot: WorldSnapshot | SerializedWorldSnapshot): WorldSnapshot {
  if (!Array.isArray(snapshot.chatState.chats)) {
    return snapshot as WorldSnapshot;
  }

  const serialized = snapshot as SerializedWorldSnapshot;
  return deepFreeze({
    worldMeta: { ...serialized.worldMeta },
    contacts: serialized.contacts.map((contact) => ({ ...contact })),
    groups: serialized.groups.map((group) => ({
      ...group,
      actorIds: Object.freeze([...group.actorIds])
    })),
    chatState: {
      activeChatId: serialized.chatState.activeChatId,
      chats: readonlyMap(new Map(serialized.chatState.chats.map((chat) => [chat.id, {
        ...chat,
        messages: chat.messages.map((message) => ({ ...message }))
      }])))
    },
    memorySummary: {
      scope: { ...serialized.memorySummary.scope },
      namespace: serialized.memorySummary.namespace
    },
    runtimeState: {
      metadata: {
        title: serialized.runtimeState.metadata.title,
        type: serialized.runtimeState.metadata.type,
        worldView: { ...serialized.runtimeState.metadata.worldView },
        settings: { ...serialized.runtimeState.metadata.settings },
        personaOverlays: { ...serialized.runtimeState.metadata.personaOverlays }
      },
      activeChatId: serialized.runtimeState.activeChatId
    }
  });
}

function latestValidStoredSnapshot(
  storage: PersistenceStorage,
  worldId: WorldId,
  notifications: PersistenceNotification[]
): SerializedWorldSnapshot | null {
  const history = storage.readWorldHistory?.(worldId) ?? [storage.readWorld(worldId)];
  const latest = history.at(-1);
  const candidates = [...history].reverse();

  for (const candidate of candidates) {
    if (isSerializedWorldSnapshot(candidate)) {
      if (candidate !== latest) {
        notifications.push(Object.freeze({
          worldId,
          type: "corruption-recovered",
          message: `Recovered world "${worldId}" from latest valid persisted snapshot.`
        }));
      }
      return candidate;
    }
  }

  if (latest !== null && latest !== undefined) {
    notifications.push(Object.freeze({
      worldId,
      type: "corruption-unrecoverable",
      message: `No valid persisted snapshot found for world "${worldId}".`
    }));
  }
  return null;
}

function isSerializedWorldSnapshot(value: unknown): value is SerializedWorldSnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<SerializedWorldSnapshot>;
  return Boolean(
    candidate.worldMeta &&
      typeof candidate.worldMeta === "object" &&
      candidate.contacts &&
      Array.isArray(candidate.contacts) &&
      candidate.groups &&
      Array.isArray(candidate.groups) &&
      candidate.chatState &&
      typeof candidate.chatState === "object" &&
      Array.isArray(candidate.chatState.chats) &&
      candidate.memorySummary &&
      typeof candidate.memorySummary === "object" &&
      candidate.runtimeState &&
      typeof candidate.runtimeState === "object"
  );
}

function restoreSnapshotIntoApp(app: AppRuntime, snapshot: WorldSnapshot): WorldSnapshot {
  if (!isKnownBootstrapWorld(snapshot.worldMeta.id)) {
    restoreCustomSnapshotIntoApp(app, snapshot);
    return app.worldDomain.generateSnapshot(snapshot.worldMeta.id);
  }

  restoreStructuralState(app, snapshot);
  restoreChats(app, snapshot);
  restoreLifecycle(app, snapshot);

  return app.worldDomain.generateSnapshot(snapshot.worldMeta.id);
}

function restoreCustomSnapshotIntoApp(app: AppRuntime, snapshot: WorldSnapshot): void {
  const state = {
    world: { ...snapshot.worldMeta },
    contacts: snapshot.contacts.map((contact) => ({ ...contact })),
    groups: snapshot.groups.map((group) => ({
      ...group,
      actorIds: [...group.actorIds]
    })),
    memoryScope: { ...snapshot.memorySummary.scope },
    metadata: {
      title: snapshot.runtimeState.metadata.title,
      type: snapshot.runtimeState.metadata.type,
      worldView: { ...snapshot.runtimeState.metadata.worldView },
      settings: { ...snapshot.runtimeState.metadata.settings },
      personaOverlays: { ...snapshot.runtimeState.metadata.personaOverlays }
    },
    chat: {
      activeChatId: snapshot.chatState.activeChatId,
      chats: new Map([...snapshot.chatState.chats.entries()].map(([id, chat]) => [id, {
        ...chat,
        messages: chat.messages.map((message) => ({ ...message }))
      }]))
    }
  } satisfies WorldState;
  app.worldDomain.commitState(createSnapshotState(state));
}

function restoreStructuralState(app: AppRuntime, snapshot: WorldSnapshot): void {
  for (const contact of snapshot.contacts) {
    const current = app.worldDomain.getWorldState(snapshot.worldMeta.id);
    if (current.contacts.some((candidate) => candidate.actorId === contact.actorId)) {
      continue;
    }
    if (contact.kind === "human") {
      throw new Error("PersistenceLayer: cannot restore unknown human contact through structural patch.");
    }
    app.worldDomain.applyStructuralPatch({
      type: "ai.contact.added",
      worldId: snapshot.worldMeta.id,
      timestamp: 2000 + current.contacts.length,
      contact: {
        actorId: contact.actorId,
        displayName: contact.displayName,
        kind: contact.kind
      }
    });
  }

  if (Object.keys(snapshot.runtimeState.metadata.worldView).length > 0) {
    app.worldDomain.applyStructuralPatch({
      type: "world.view.adjusted",
      worldId: snapshot.worldMeta.id,
      timestamp: 2100,
      patch: snapshot.runtimeState.metadata.worldView
    });
  }

  if (Object.keys(snapshot.runtimeState.metadata.settings).length > 0) {
    app.worldDomain.applyStructuralPatch({
      type: "world.settings.adjusted",
      worldId: snapshot.worldMeta.id,
      timestamp: 2101,
      settings: snapshot.runtimeState.metadata.settings
    });
  }

  if (snapshot.groups.length > 0) {
    app.worldDomain.applyStructuralPatch({
      type: "relationship.graph.modified",
      worldId: snapshot.worldMeta.id,
      timestamp: 2102,
      groups: snapshot.groups
    });
  }

  for (const [actorId, overlay] of Object.entries(snapshot.runtimeState.metadata.personaOverlays)) {
    app.worldDomain.applyPersonaOverlay({
      type: "contact.persona.overlayed",
      worldId: snapshot.worldMeta.id,
      actorId,
      timestamp: 2200,
      overlay
    });
  }
}

function restoreChats(app: AppRuntime, snapshot: WorldSnapshot): void {
  let state = app.worldDomain.getWorldState(snapshot.worldMeta.id);
  const chats = [...snapshot.chatState.chats.values()];

  for (const chat of chats) {
    if (!state.chat.chats.has(chat.id)) {
      state = transition(state, {
        id: toChatEventId(`event:persistence:chat-started:${chat.id}`),
        type: "chat.started",
        worldId: snapshot.worldMeta.id,
        timestamp: 3000,
        payload: {
          chatId: toChatId(chat.id),
          title: chat.title
        }
      }) as WorldState;
      app.worldDomain.commitState(state);
    }

    state = app.worldDomain.getWorldState(snapshot.worldMeta.id);
    const existing = state.chat.chats.get(chat.id) as WorldChatSession | undefined;
    const existingMessageIds = new Set(existing?.messages.map((message) => message.id) ?? []);
    for (const message of chat.messages) {
      if (existingMessageIds.has(message.id)) {
        continue;
      }
      state = transition(state, {
        id: toChatEventId(`event:persistence:message:${message.id}`),
        type: "message.submitted",
        worldId: snapshot.worldMeta.id,
        timestamp: message.createdAt,
        payload: {
          chatId: toChatId(chat.id) as ChatId,
          messageId: toMessageId(message.id) as MessageId,
          authorActorId: message.authorActorId,
          text: message.text,
          createdAt: message.createdAt
        }
      }) as WorldState;
      app.worldDomain.commitState(state);
    }

    state = app.worldDomain.getWorldState(snapshot.worldMeta.id);
    const currentChat = state.chat.chats.get(chat.id);
    if (currentChat && (chat.appearance || chat.groupRules)) {
      const nextChats = new Map<string, WorldChatSession>(state.chat.chats);
      nextChats.set(chat.id, {
        ...currentChat,
        ...(chat.appearance ? { appearance: { ...chat.appearance } } : {}),
        ...(chat.groupRules ? { groupRules: { ...chat.groupRules } } : {})
      });
      state = createSnapshotState({
        ...state,
        chat: {
          ...state.chat,
          chats: nextChats
        }
      });
      app.worldDomain.commitState(state);
    }
  }

  if (snapshot.chatState.activeChatId) {
    state = app.worldDomain.getWorldState(snapshot.worldMeta.id);
    state = transition(state, {
      id: toChatEventId(`event:persistence:chat-selected:${snapshot.chatState.activeChatId}`),
      type: "chat.selected",
      worldId: snapshot.worldMeta.id,
      timestamp: 4000,
      payload: {
        chatId: toChatId(snapshot.chatState.activeChatId)
      }
    }) as WorldState;
    app.worldDomain.commitState(state);
  }
}

function restoreLifecycle(app: AppRuntime, snapshot: WorldSnapshot): void {
  if (snapshot.worldMeta.lifecycle !== app.worldDomain.getWorldState(snapshot.worldMeta.id).world.lifecycle) {
    app.worldDomain.setLifecycle(snapshot.worldMeta.id, snapshot.worldMeta.lifecycle);
  }
}

function isKnownBootstrapWorld(worldId: WorldId): boolean {
  return worldId === toWorldId("reality") || worldId === toWorldId("custom:default");
}

function createSnapshotState(state: WorldState): WorldState {
  const queue = createPatchQueue();
  queue.enqueue({
    source: "creation",
    targetField: "world",
    operation: "initialize",
    value: state
  });
  return queue.reduce();
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const nested of Object.values(value)) {
      deepFreeze(nested);
    }
  }
  return value;
}

function readonlyMap<Key, Value>(source: Map<Key, Value>): ReadonlyMap<Key, Value> {
  return new Proxy(source, {
    get(target, property) {
      const value = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    }
  });
}
