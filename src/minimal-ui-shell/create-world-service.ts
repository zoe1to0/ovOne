import type { AppRuntime } from "../app/index.js";
import { toChatEventId, toChatId, transition } from "../chat-kernel/index.js";
import type { ChatId } from "../chat-kernel/index.js";
import { createPatchQueue } from "../patch-queue/index.js";
import type {
  WorldContact,
  WorldId,
  WorldSnapshot,
  WorldState
} from "../world-domain/index.js";
import { toWorldId } from "../world-domain/index.js";
import type { CreateWorldDraftInput } from "./types.js";

export type CreatedWorldResult = Readonly<{
  readonly worldId: WorldId;
  readonly state: WorldState;
}>;

export function createWorldFromDraft(input: Readonly<{
  readonly app: AppRuntime;
  readonly existingWorldIds: readonly WorldId[];
  readonly sourceSnapshot: WorldSnapshot;
  readonly draft: CreateWorldDraftInput;
}>): CreatedWorldResult {
  const title = input.draft.worldName.trim();
  if (!title) {
    throw new Error("CreateWorldService: world name is required.");
  }
  if (input.draft.nextMode !== "random-role") {
    throw new Error("CreateWorldService: only random-role creation is supported.");
  }

  const worldId = createStableWorldId(title, input.existingWorldIds);
  const contacts = createContacts(worldId, input.sourceSnapshot, input.draft);
  const initialState = createInitialWorldState(worldId, title, input.sourceSnapshot, contacts, input.draft);
  input.app.worldDomain.commitState(initialState);

  let state = input.app.worldDomain.getWorldState(worldId);
  const selectedContacts = contacts.filter((contact) => input.draft.selectedAIModelIds.includes(contact.actorId));
  for (const [index, contact] of selectedContacts.entries()) {
    state = transition(state, {
      id: toChatEventId(`event:create-world:${worldId}:chat:${contact.actorId}`),
      type: "chat.started",
      worldId,
      timestamp: 8000 + index,
      payload: {
        chatId: toChatId(`chat:${worldId}:${contact.actorId}`) as ChatId,
        title: contact.displayName
      }
    });
    input.app.worldDomain.commitState(state);
  }

  return Object.freeze({
    worldId,
    state: input.app.worldDomain.getWorldState(worldId)
  });
}

function createInitialWorldState(
  worldId: WorldId,
  title: string,
  sourceSnapshot: WorldSnapshot,
  contacts: readonly WorldContact[],
  draft: CreateWorldDraftInput
): WorldState {
  const rawState = {
    world: {
      id: worldId,
      title,
      type: "custom" as const,
      ownerActorId: sourceSnapshot.worldMeta.ownerActorId,
      assistantActorId: sourceSnapshot.worldMeta.assistantActorId,
      lifecycle: "active" as const
    },
    contacts,
    groups: [],
    memoryScope: {
      worldId,
      namespace: `world:${worldId}`
    },
    metadata: {
      title,
      type: "custom" as const,
      worldView: createWorldViewMetadata(draft),
      settings: {
        createWorld: {
          sourceType: draft.worldviewSourceType,
          roleAssignment: draft.worldviewSourceType === "blank" ? "none" : "placeholder"
        }
      },
      personaOverlays: {}
    },
    chat: {
      activeChatId: null,
      chats: new Map()
    }
  } satisfies WorldState;

  const queue = createPatchQueue();
  queue.enqueue({
    source: "creation",
    targetField: "world",
    operation: "initialize",
    value: rawState
  });
  return queue.reduce();
}

function createContacts(
  worldId: WorldId,
  sourceSnapshot: WorldSnapshot,
  draft: CreateWorldDraftInput
): readonly WorldContact[] {
  const selected = new Set(draft.selectedAIModelIds);
  const owner = sourceSnapshot.contacts.find((contact) => contact.actorId === sourceSnapshot.worldMeta.ownerActorId);
  const ovo = sourceSnapshot.contacts.find((contact) => contact.actorId === sourceSnapshot.worldMeta.assistantActorId);
  const aiContacts = sourceSnapshot.contacts.filter((contact) =>
    selected.has(contact.actorId) &&
    contact.kind === "assistant" &&
    contact.actorId !== sourceSnapshot.worldMeta.assistantActorId
  );

  return Object.freeze([
    toWorldContact(worldId, owner?.actorId ?? sourceSnapshot.worldMeta.ownerActorId, owner?.displayName ?? "You", "human", "Dialogue"),
    toWorldContact(worldId, ovo?.actorId ?? sourceSnapshot.worldMeta.assistantActorId, ovo?.displayName ?? "ovO", "assistant", "Dialogue"),
    ...aiContacts.map((contact) =>
      toWorldContact(worldId, contact.actorId, contact.displayName, "assistant", "Dialogue")
    )
  ]);
}

function toWorldContact(
  worldId: WorldId,
  actorId: string,
  displayName: string,
  kind: WorldContact["kind"],
  outputMode: WorldContact["outputMode"]
): WorldContact {
  return Object.freeze({
    worldId,
    actorId,
    displayName,
    kind,
    outputMode
  }) as WorldContact;
}

function createWorldViewMetadata(draft: CreateWorldDraftInput): Readonly<Record<string, unknown>> {
  if (draft.worldviewSourceType === "blank") {
    return Object.freeze({
      sourceType: "blank"
    });
  }
  return Object.freeze({
    sourceType: draft.worldviewSourceType,
    text: draft.worldviewText,
    roleAssignment: "placeholder"
  });
}

function createStableWorldId(title: string, existingWorldIds: readonly WorldId[]): WorldId {
  const base = slugify(title) || `world-${stableHash(title)}`;
  const existing = new Set(existingWorldIds);
  let candidate = toWorldId(`custom:${base}`);
  let suffix = 2;
  while (existing.has(candidate)) {
    candidate = toWorldId(`custom:${base}-${suffix}`);
    suffix += 1;
  }
  return candidate;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stableHash(value: string): string {
  let hash = 5381;
  for (const char of value) {
    hash = ((hash << 5) + hash + char.charCodeAt(0)) >>> 0;
  }
  return hash.toString(36);
}
