import type {
  WorldChatSession,
  WorldContact,
  WorldGroup,
  PersonaOverlay,
  WorldState
} from "../world-domain/index.js";
import type { PatchInput, PatchQueue, PatchQueueReducer, PatchSource, StatePatch } from "./types.js";

const PRIORITY: Readonly<Record<PatchSource, number>> = Object.freeze({
  creation: 400,
  ovo: 300,
  contact: 200,
  kernel: 100
});

let timestampSequence = 0;
const queueByState = new WeakMap<object, PatchQueue>();

export function createPatchQueue(patches: readonly StatePatch[] = []): PatchQueueReducer {
  let queue: PatchQueue = Object.freeze({ patches: Object.freeze([...patches]) });

  return Object.freeze({
    enqueue: (patch: PatchInput) => {
      queue = enqueuePatch(queue, patch);
      return queue;
    },
    reduce: () => reducePatchQueue(queue),
    snapshot: () => queue
  });
}

export function enqueuePatch(queue: PatchQueue, patch: PatchInput): PatchQueue {
  return Object.freeze({
    patches: Object.freeze([
      ...queue.patches,
      Object.freeze({
        source: patch.source,
        priority: PRIORITY[patch.source],
        timestamp: patch.timestamp ?? nextTimestamp(),
        targetField: patch.targetField,
        operation: patch.operation,
        value: patch.value
      })
    ])
  });
}

export function reducePatchQueue(queue: PatchQueue): WorldState {
  const sorted = [...queue.patches].sort((left, right) => {
    if (left.priority !== right.priority) {
      return right.priority - left.priority;
    }
    return left.timestamp - right.timestamp;
  });

  let state: WorldState | null = null;
  const appliedPriorityByTarget = new Map<string, number>();

  for (const patch of sorted) {
    const appliedPriority = appliedPriorityByTarget.get(patch.targetField);
    if (appliedPriority !== undefined && appliedPriority > patch.priority) {
      continue;
    }
    state = applyPatch(state, patch);
    appliedPriorityByTarget.set(patch.targetField, patch.priority);
  }

  if (!state) {
    throw new Error("PatchQueue: cannot reduce an empty queue.");
  }

  const frozen = freezeWorldState(state);
  queueByState.set(frozen, queue);
  return frozen;
}

export function queueForWorldState(state: WorldState): PatchQueue {
  const queue = queueByState.get(state);
  if (!queue) {
    throw new Error("PatchQueue: WorldState was not produced by PatchQueue.");
  }
  return queue;
}

export function patchPriority(source: PatchSource): number {
  return PRIORITY[source];
}

function applyPatch(state: WorldState | null, patch: StatePatch): WorldState {
  if (patch.source === "creation") {
    if (patch.operation !== "initialize" || patch.targetField !== "world") {
      throw new Error("PatchQueue: creation patches must initialize world.");
    }
    return patch.value as WorldState;
  }

  if (!state) {
    throw new Error("PatchQueue: non-creation patch cannot run before world initialization.");
  }

  switch (patch.targetField) {
    case "metadata.worldView":
      return {
        ...state,
        metadata: {
          ...state.metadata,
          worldView: mergeRecord(state.metadata.worldView, patch.value)
        }
      };

    case "metadata.settings":
      return {
        ...state,
        metadata: {
          ...state.metadata,
          settings: mergeRecord(state.metadata.settings, patch.value)
        }
      };

    case "contacts":
      return {
        ...state,
        contacts: [...state.contacts, patch.value as WorldContact]
      };

    case "groups":
      return {
        ...state,
        groups: patch.value as readonly WorldGroup[]
      };

    case "chat.activeChatId":
      return {
        ...state,
        chat: {
          ...state.chat,
          activeChatId: patch.value as string | null
        }
      };

    case "chat.chats":
      return {
        ...state,
        chat: {
          ...state.chat,
          chats: upsertChat(state.chat.chats, patch.value as WorldChatSession)
        }
      };

    case "world.lifecycle":
      return {
        ...state,
        world: {
          ...state.world,
          lifecycle: patch.value as WorldState["world"]["lifecycle"]
        }
      };

    default:
      if (patch.targetField.startsWith("metadata.personaOverlays.")) {
        const actorId = patch.targetField.slice("metadata.personaOverlays.".length);
        return {
          ...state,
          metadata: {
            ...state.metadata,
            personaOverlays: {
              ...state.metadata.personaOverlays,
              [actorId]: patch.value as PersonaOverlay
            }
          }
        };
      }
      throw new Error(`PatchQueue: unsupported target field "${patch.targetField}".`);
  }
}

function upsertChat(
  chats: ReadonlyMap<string, WorldChatSession>,
  chat: WorldChatSession
): ReadonlyMap<string, WorldChatSession> {
  const next = new Map(chats);
  next.set(chat.id, chat);
  return next;
}

function mergeRecord(
  current: Readonly<Record<string, unknown>>,
  patch: unknown
): Readonly<Record<string, unknown>> {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    throw new Error("PatchQueue: merge patch must be an object.");
  }
  return {
    ...current,
    ...(patch as Readonly<Record<string, unknown>>)
  };
}

function freezeWorldState(state: WorldState): WorldState {
  return deepFreeze({
    ...state,
    contacts: [...state.contacts],
    groups: [...state.groups],
    metadata: {
      ...state.metadata,
      worldView: { ...state.metadata.worldView },
      settings: { ...state.metadata.settings },
      personaOverlays: { ...state.metadata.personaOverlays }
    },
    chat: {
      activeChatId: state.chat.activeChatId,
      chats: readonlyMap(new Map(state.chat.chats))
    }
  });
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
      if (property === "set" || property === "delete" || property === "clear") {
        return () => {
          throw new Error("PatchQueue: reduced WorldState snapshot is immutable.");
        };
      }

      const value = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
    set() {
      throw new Error("PatchQueue: reduced WorldState snapshot is immutable.");
    }
  });
}

function nextTimestamp(): number {
  timestampSequence += 1;
  return timestampSequence;
}
