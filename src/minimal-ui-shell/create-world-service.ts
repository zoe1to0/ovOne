import type { AppRuntime } from "../app/index.js";
import { toChatEventId, toChatId, toMessageId, transition } from "../chat-kernel/index.js";
import type { ChatId, MessageId } from "../chat-kernel/index.js";
import { markBootstrapItemStubGenerated, planWorldBootstrap } from "../domain/index.js";
import type { WorldBootstrapPlan, WorldBootstrapRoleMode } from "../domain/index.js";
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
  readonly bootstrapPlan: WorldBootstrapPlan;
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
  if (input.draft.nextMode !== "random-role" && input.draft.nextMode !== "detailed-edit") {
    throw new Error("CreateWorldService: only random-role or detailed-edit creation is supported.");
  }

  const worldId = createStableWorldId(title, input.existingWorldIds);
  const contacts = createContacts(worldId, input.sourceSnapshot, input.draft);
  const selectedContacts = contacts.filter((contact) => input.draft.selectedAIModelIds.includes(contact.actorId));
  const bootstrapPlan = planWorldBootstrap({
    worldId,
    selectedAIContactIds: selectedContacts.map((contact) => contact.actorId),
    roleMode: bootstrapRoleModeForDraft(input.draft),
    sourceType: input.draft.worldviewSourceType
  });
  const storedBootstrapPlan = markBootstrapPlanStubGenerated(bootstrapPlan);
  const initialState = createInitialWorldState(worldId, title, input.sourceSnapshot, contacts, input.draft, storedBootstrapPlan);
  input.app.worldDomain.commitState(initialState);

  let state = input.app.worldDomain.getWorldState(worldId);
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
  state = executeBootstrapInitialMessageStubs(state, bootstrapPlan);
  input.app.worldDomain.commitState(state);

  return Object.freeze({
    worldId,
    state: input.app.worldDomain.getWorldState(worldId),
    bootstrapPlan: storedBootstrapPlan
  });
}

function executeBootstrapInitialMessageStubs(state: WorldState, bootstrapPlan: WorldBootstrapPlan): WorldState {
  let nextState = state;
  for (const [index, plan] of bootstrapPlan.privateMessages.entries()) {
    const chatId = toChatId(`chat:${plan.worldId}:${plan.contactId}`) as ChatId;
    nextState = transition(nextState, {
      id: toChatEventId(`event:create-world:${plan.worldId}:bootstrap-message:${plan.contactId}`),
      type: "message.submitted",
      worldId: plan.worldId,
      timestamp: 9000 + index,
      payload: {
        chatId,
        messageId: toMessageId(`message:create-world:${plan.worldId}:bootstrap:${plan.contactId}`) as MessageId,
        authorActorId: plan.contactId,
        text: "初始消息待生成",
        createdAt: 9000 + index
      }
    });
  }
  return nextState;
}

function markBootstrapPlanStubGenerated(bootstrapPlan: WorldBootstrapPlan): WorldBootstrapPlan {
  if (bootstrapPlan.privateMessages.length === 0) {
    return bootstrapPlan;
  }
  return Object.freeze({
    ...bootstrapPlan,
    privateMessages: Object.freeze(bootstrapPlan.privateMessages.map((plan) => markBootstrapItemStubGenerated(plan)))
  }) satisfies WorldBootstrapPlan;
}

function createInitialWorldState(
  worldId: WorldId,
  title: string,
  sourceSnapshot: WorldSnapshot,
  contacts: readonly WorldContact[],
  draft: CreateWorldDraftInput,
  bootstrapPlan: WorldBootstrapPlan
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
      worldView: createWorldViewMetadata(draft, bootstrapPlan),
      settings: {
        createWorld: {
          sourceType: draft.worldviewSourceType,
          roleAssignment: roleAssignmentForDraft(draft),
          detailRoleMode: draft.detailRoleMode ?? null,
          bootstrapPlan
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

function createWorldViewMetadata(draft: CreateWorldDraftInput, bootstrapPlan?: WorldBootstrapPlan): Readonly<Record<string, unknown>> {
  if (draft.worldviewSourceType === "blank") {
    return Object.freeze({
      sourceType: "blank",
      roleAssignment: roleAssignmentForDraft(draft),
      detailRoleMode: draft.detailRoleMode ?? null,
      randomRoleSlots: draft.randomRoleSlots ?? [],
      selectedUserRoleSlotId: draft.selectedUserRoleSlotId ?? null,
      fixedRoles: draft.fixedRoles ?? [],
      bootstrapPlan
    });
  }
  return Object.freeze({
    sourceType: draft.worldviewSourceType,
    text: draft.worldviewText,
    roleAssignment: roleAssignmentForDraft(draft),
    detailRoleMode: draft.detailRoleMode ?? null,
    randomRoleSlots: draft.randomRoleSlots ?? [],
    selectedUserRoleSlotId: draft.selectedUserRoleSlotId ?? null,
    fixedRoles: draft.fixedRoles ?? [],
    bootstrapPlan
  });
}

function bootstrapRoleModeForDraft(draft: CreateWorldDraftInput): WorldBootstrapRoleMode {
  if (draft.nextMode === "detailed-edit") {
    return draft.detailRoleMode ?? "random-role";
  }
  return "random-role";
}

function roleAssignmentForDraft(draft: CreateWorldDraftInput): "none" | "placeholder" {
  if (draft.nextMode === "detailed-edit" && draft.detailRoleMode === "empty-role") {
    return "none";
  }
  if (draft.worldviewSourceType === "blank" && draft.nextMode !== "detailed-edit") {
    return "none";
  }
  return "placeholder";
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
