import { createPatchQueue } from "../patch-queue/index.js";
import { queueForWorldState } from "../patch-queue/index.js";
import type { PatchInput, PatchQueueReducer } from "../patch-queue/index.js";
import type {
  ActorDefinition,
  CustomWorldDefinition,
  Identity,
  MemoryScope,
  OutputMode,
  PersonaOverlayEvent,
  RealityDefinition,
  StructuralPatchEvent,
  WorldChatState,
  WorldGroup,
  WorldId,
  WorldSnapshot,
  WorldState
} from "./types.js";
import { validateWorldEditorPatch } from "../domain/world-editor-contract.js";
import type { WorldEditorPatch } from "../domain/world-editor-contract.js";
import { validateWorldRoleEditorPatch } from "../domain/world-role-editor-contract.js";
import type { WorldRoleEditorPatch } from "../domain/world-role-editor-contract.js";
import { validateContactDetailPreferencePatch } from "../domain/contact-detail-contract.js";
import type { ContactDetailPreferencePatch } from "../domain/contact-detail-contract.js";

export type WorldDomainInit = Readonly<{
  readonly reality: RealityDefinition;
  readonly customWorlds?: readonly Readonly<{
    readonly key: string;
    readonly definition: CustomWorldDefinition;
  }>[];
}>;

export class WorldDomain {
  private readonly queues = new Map<WorldId, PatchQueueReducer>();

  static create(input: WorldDomainInit): WorldDomain {
    const domain = new WorldDomain();
    domain.defineReality(input.reality);
    for (const custom of input.customWorlds ?? []) {
      domain.defineCustomWorld(custom.key, custom.definition);
    }
    return domain;
  }

  getWorldState(worldId: WorldId): WorldState {
    return this.getQueue(worldId).reduce();
  }

  generateSnapshot(worldId: WorldId): WorldSnapshot {
    return createSnapshot(this.getWorldState(worldId));
  }

  commitState(state: WorldState): void {
    const queue = queueForWorldState(state);
    this.queues.set(state.world.id, createPatchQueue(queue.patches));
  }

  setLifecycle(worldId: WorldId, lifecycle: WorldState["world"]["lifecycle"]): WorldState {
    const queue = this.getQueue(worldId);
    queue.enqueue({
      source: "ovo",
      targetField: "world.lifecycle",
      operation: "set",
      value: lifecycle
    });
    return queue.reduce();
  }

  applyStructuralPatch(event: StructuralPatchEvent): WorldState {
    const state = this.getWorldState(event.worldId);
    assertWorldAcceptsPatches(state);
    const queue = this.getQueue(event.worldId);

    switch (event.type) {
      case "world.view.adjusted":
        queue.enqueue(withTimestamp({
          source: "ovo",
          targetField: "metadata.worldView",
          operation: "merge",
          value: assertNoIdentityKeys(event.patch)
        }, event.timestamp));
        return queue.reduce();

      case "ai.contact.added":
        assertAiContactCanBeAdded(state, event.contact);
        queue.enqueue(withTimestamp({
          source: "ovo",
          targetField: "contacts",
          operation: "append",
          value: toIdentity(state.world.id, event.contact, defaultOutputMode(state.world.type))
        }, event.timestamp));
        return queue.reduce();

      case "relationship.graph.modified":
        assertGroupsReferenceKnownActors(state, event.groups);
        queue.enqueue(withTimestamp({
          source: "ovo",
          targetField: "groups",
          operation: "replace",
          value: event.groups
        }, event.timestamp));
        return queue.reduce();

      case "world.settings.adjusted":
        queue.enqueue(withTimestamp({
          source: "ovo",
          targetField: "metadata.settings",
          operation: "merge",
          value: assertNoIdentityKeys(event.settings)
        }, event.timestamp));
        return queue.reduce();
    }
  }

  applyPersonaOverlay(event: PersonaOverlayEvent): WorldState {
    const state = this.getWorldState(event.worldId);
    assertWorldAcceptsPatches(state);
    if (!state.contacts.some((contact) => contact.actorId === event.actorId)) {
      throw new Error(`WorldDomain: actor "${event.actorId}" is not defined in world "${event.worldId}".`);
    }
    assertPersonaOverlayOnly(event.overlay);

    const queue = this.getQueue(event.worldId);
    queue.enqueue(withTimestamp({
      source: "contact",
      targetField: `metadata.personaOverlays.${event.actorId}`,
      operation: "set",
      value: event.overlay
    }, event.timestamp));

    return queue.reduce();
  }

  applyWorldEditorPatch(patch: WorldEditorPatch): WorldState {
    const state = this.getWorldState(patch.worldId);
    assertWorldAcceptsPatches(state);
    const validation = validateWorldEditorPatch(patch, { worldType: state.world.type });
    if (!validation.valid || !validation.patch) {
      throw new Error(`WorldDomain: invalid World Editor patch for world "${patch.worldId}".`);
    }
    if (state.world.type === "reality") {
      throw new Error("WorldDomain: Reality name and worldview cannot be modified.");
    }

    const queue = this.getQueue(patch.worldId);
    queue.enqueue({
      source: "ovo",
      targetField: "world.title",
      operation: "set",
      value: validation.patch.name
    });
    queue.enqueue({
      source: "ovo",
      targetField: "metadata.title",
      operation: "set",
      value: validation.patch.name
    });
    queue.enqueue({
      source: "ovo",
      targetField: "metadata.worldView.replace",
      operation: "replace",
      value: worldViewFromEditorText(validation.patch.worldview)
    });
    return queue.reduce();
  }

  applyWorldRoleEditorPatch(patch: WorldRoleEditorPatch): WorldState {
    const state = this.getWorldState(patch.worldId);
    assertWorldAcceptsPatches(state);
    const validation = validateWorldRoleEditorPatch(patch, { worldType: state.world.type });
    if (!validation.valid || !validation.patch) {
      throw new Error(`WorldDomain: invalid World Editor role patch for world "${patch.worldId}".`);
    }

    const roleByContactId = new Map(validation.patch.memberRoles.map((role) => [role.worldContactId, role]));
    const contacts = state.contacts.map((contact) => {
      const role = roleByContactId.get(contact.actorId);
      return role
        ? {
            ...contact,
            worldRoleName: role.worldRoleName,
            worldPersonaNotes: role.worldPersonaNotes
          }
        : contact;
    });
    const queue = this.getQueue(patch.worldId);
    queue.enqueue({
      source: "ovo",
      targetField: "metadata.worldView",
      operation: "merge",
      value: {
        worldEditorUserRole: validation.patch.userRole
      }
    });
    queue.enqueue({
      source: "ovo",
      targetField: "contacts.replace",
      operation: "replace",
      value: contacts
    });
    return queue.reduce();
  }

  applyContactDetailPreferencePatch(patch: ContactDetailPreferencePatch): WorldState {
    const state = this.getWorldState(patch.worldId);
    assertWorldAcceptsPatches(state);
    const validation = validateContactDetailPreferencePatch(patch, {
      worldId: state.world.id,
      contactActorIds: state.contacts
        .filter((contact) => contact.kind === "assistant" && contact.actorId !== state.world.assistantActorId)
        .map((contact) => contact.actorId)
    });
    if (!validation.valid || !validation.patch) {
      throw new Error(`WorldDomain: invalid Contacts Detail preference patch for world "${patch.worldId}".`);
    }

    const queue = this.getQueue(patch.worldId);
    queue.enqueue({
      source: "contact",
      targetField: "contacts.preference",
      operation: "set",
      value: validation.patch
    });
    return queue.reduce();
  }

  private defineReality(input: RealityDefinition): WorldState {
    return this.defineWorld({
      id: toWorldId("reality"),
      title: "Reality",
      type: "reality",
      ownerActorId: input.ownerActorId,
      assistantActorId: input.assistantActorId,
      actors: [
        { actorId: input.ownerActorId, displayName: "You", kind: "human" },
        { actorId: input.assistantActorId, displayName: "ovOne", kind: "assistant" }
      ]
    });
  }

  private defineCustomWorld(worldKey: string, input: CustomWorldDefinition): WorldState {
    return this.defineWorld({
      id: toWorldId(`custom:${worldKey}`),
      title: input.title,
      type: "custom",
      ownerActorId: input.ownerActorId,
      assistantActorId: input.assistantActorId,
      actors: input.actors
    });
  }

  private defineWorld(input: {
    readonly id: WorldId;
    readonly title: string;
    readonly type: "reality" | "custom";
    readonly ownerActorId: string;
    readonly assistantActorId: string;
    readonly actors: readonly ActorDefinition[];
  }): WorldState {
    if (this.queues.has(input.id)) {
      throw new Error(`WorldDomain: world "${input.id}" is already defined.`);
    }

    assertCreationActors(input.id, input.ownerActorId, input.assistantActorId, input.actors);

    const baseline = deepFreeze({
      world: {
        id: input.id,
        title: input.title,
        type: input.type,
        ownerActorId: input.ownerActorId,
        assistantActorId: input.assistantActorId,
        lifecycle: "active"
      },
      contacts: input.actors.map((actor) => toIdentity(input.id, actor, defaultOutputMode(input.type))),
      groups: [],
      memoryScope: memoryScope(input.id),
      metadata: {
        title: input.title,
        type: input.type,
        worldView: {},
        settings: {},
        personaOverlays: {}
      },
      chat: {
        activeChatId: null,
        chats: readonlyMap(new Map())
      } satisfies WorldChatState
    }) satisfies WorldState;

    const queue = createPatchQueue();
    queue.enqueue({
      source: "creation",
      targetField: "world",
      operation: "initialize",
      value: baseline
    });
    this.queues.set(input.id, queue);
    return queue.reduce();
  }

  private getQueue(worldId: WorldId): PatchQueueReducer {
    const queue = this.queues.get(worldId);
    if (!queue) {
      throw new Error(`WorldDomain: unknown world "${worldId}".`);
    }
    return queue;
  }
}

function withTimestamp(input: PatchInput, timestamp: number | undefined): PatchInput {
  return timestamp === undefined ? input : { ...input, timestamp };
}

export function toWorldId(value: string): WorldId {
  if (!value.trim()) {
    throw new Error("WorldDomain: world id cannot be empty.");
  }
  return value as WorldId;
}

function toIdentity(worldId: WorldId, actor: ActorDefinition, outputMode: OutputMode): Identity {
  return Object.freeze({
    worldId,
    actorId: actor.actorId,
    displayName: actor.displayName,
    kind: actor.kind,
    outputMode
  } as Identity);
}

function defaultOutputMode(worldType: "reality" | "custom"): OutputMode {
  return worldType === "reality" ? "QA" : "Dialogue";
}

function memoryScope(worldId: WorldId): MemoryScope {
  return Object.freeze({
    worldId,
    namespace: `world:${worldId}`
  });
}

function assertCreationActors(
  worldId: WorldId,
  ownerActorId: string,
  assistantActorId: string,
  actors: readonly ActorDefinition[]
): void {
  const byId = new Set<string>();
  for (const actor of actors) {
    if (byId.has(actor.actorId)) {
      throw new Error(`WorldDomain: duplicate actor "${actor.actorId}" in world "${worldId}".`);
    }
    byId.add(actor.actorId);
  }

  if (!byId.has(ownerActorId)) {
    throw new Error(`WorldDomain: owner actor "${ownerActorId}" must be defined.`);
  }
  if (!byId.has(assistantActorId)) {
    throw new Error(`WorldDomain: assistant actor "${assistantActorId}" must be defined.`);
  }
}

function assertNoIdentityKeys<T extends Readonly<Record<string, unknown>>>(value: T): T {
  for (const key of Object.keys(value)) {
    if (["id", "worldId", "actorId", "displayName", "name", "kind", "ownerActorId", "assistantActorId"].includes(key)) {
      throw new Error(`WorldDomain: structural patch cannot modify identity key "${key}".`);
    }
  }
  return value;
}

function assertAiContactCanBeAdded(state: WorldState, contact: ActorDefinition): void {
  if (state.contacts.some((candidate) => candidate.actorId === contact.actorId)) {
    throw new Error(`WorldDomain: actor "${contact.actorId}" already exists; identity override is not allowed.`);
  }
  if (contact.kind === "human") {
    throw new Error("WorldDomain: structural patch can only add AI contacts.");
  }
}

function assertGroupsReferenceKnownActors(
  state: WorldState,
  groups: readonly WorldGroup[]
): void {
  for (const group of groups) {
    for (const actorId of group.actorIds) {
      if (!state.contacts.some((contact) => contact.actorId === actorId)) {
        throw new Error(`WorldDomain: relationship graph references unknown actor "${actorId}".`);
      }
    }
  }
}

function assertPersonaOverlayOnly(value: unknown): void {
  if (!value || typeof value !== "object") {
    throw new Error("WorldDomain: persona overlay must be an object.");
  }

  const allowed = new Set(["personality", "tone", "relationshipPerception"]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      throw new Error(`WorldDomain: Contact Editor cannot modify "${key}".`);
    }
  }
}

function assertWorldAcceptsPatches(state: WorldState): void {
  if (state.world.lifecycle === "archived") {
    throw new Error("WorldDomain: archived worlds do not accept new patches.");
  }
}

function worldViewFromEditorText(worldview: string): Readonly<Record<string, unknown>> {
  const text = worldview.trim();
  return text ? Object.freeze({ text }) : Object.freeze({});
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
          throw new Error("WorldDomain: WorldState snapshot is immutable.");
        };
      }

      const value = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
    set() {
      throw new Error("WorldDomain: WorldState snapshot is immutable.");
    }
  });
}

function createSnapshot(state: WorldState): WorldSnapshot {
  return deepFreeze({
    worldMeta: { ...state.world },
    contacts: state.contacts.map((contact) => Object.freeze({ ...contact })),
    groups: state.groups.map((group) =>
      Object.freeze({
        ...group,
        actorIds: Object.freeze([...group.actorIds])
      })
    ),
    chatState: {
      activeChatId: state.chat.activeChatId,
      chats: readonlyMap(new Map(state.chat.chats))
    },
    memorySummary: {
      scope: { ...state.memoryScope },
      namespace: state.memoryScope.namespace
    },
    runtimeState: {
      metadata: {
        title: state.metadata.title,
        type: state.metadata.type,
        worldView: { ...state.metadata.worldView },
        settings: { ...state.metadata.settings },
        personaOverlays: { ...state.metadata.personaOverlays }
      },
      activeChatId: state.chat.activeChatId
    }
  });
}
