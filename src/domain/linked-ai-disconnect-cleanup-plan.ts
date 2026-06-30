import type { GlobalAILink, WorldChat, WorldContact, WorldMemoryScope, WorldScopedSnapshot } from "./world-model.js";
import type { WorldGroup, WorldId } from "../world-domain/index.js";
import {
  validateLinkedAIDisconnectCommand,
  type LinkedAIDisconnectCommand
} from "./linked-ai-disconnect-contract.js";

export type LinkedAIDisconnectCleanupPlanStatus = "planned";
export type LinkedAIDisconnectDeferredAction = "not-executed-yet";
export type LinkedAIDisconnectGroupCleanupStatus = "not-supported-yet" | "none-needed";

export type WorldCleanupPlanItem = Readonly<{
  readonly worldId: WorldId;
  readonly worldTitle: string;
  readonly worldContactIds: readonly string[];
  readonly privateChatIds: readonly string[];
  readonly memoryScopeIds: readonly string[];
  readonly groupCleanupStatus: LinkedAIDisconnectGroupCleanupStatus;
}>;

export type LinkedAIDisconnectCleanupPlan = Readonly<{
  readonly globalAILinkId: string;
  readonly globalAIModelId: string;
  readonly affectedWorlds: readonly WorldCleanupPlanItem[];
  readonly providerConnectionAction: LinkedAIDisconnectDeferredAction;
  readonly globalLinkAction: LinkedAIDisconnectDeferredAction;
  readonly status: LinkedAIDisconnectCleanupPlanStatus;
}>;

export type LinkedAIDisconnectCleanupPlanValidation = Readonly<{
  readonly valid: boolean;
  readonly error: string | null;
}>;

export function createLinkedAIDisconnectCleanupPlan(
  command: LinkedAIDisconnectCommand,
  snapshot: WorldScopedSnapshot
): LinkedAIDisconnectCleanupPlan {
  const link = linkedAIForCommand(command, snapshot);
  const affectedWorlds = link
    ? [...snapshot.worlds.values()].flatMap((scope) => {
        const contacts = scope.contacts.filter((contact) => contact.baseModelId === link.modelId);
        if (contacts.length === 0) {
          return [];
        }
        const privateChats = privateChatsForContacts(scope.chats, contacts);
        return [Object.freeze({
          worldId: scope.world.worldId,
          worldTitle: scope.world.title,
          worldContactIds: Object.freeze(contacts.map((contact) => contact.contactId)),
          privateChatIds: Object.freeze(privateChats.map((chat) => chat.chatId)),
          memoryScopeIds: Object.freeze(memoryScopeIdsForCleanup(scope.memory, contacts, privateChats)),
          groupCleanupStatus: groupCleanupStatusForContacts(scope.groups, contacts)
        })];
      })
    : [];

  return Object.freeze({
    globalAILinkId: command.globalAILinkId,
    globalAIModelId: link?.modelId ?? "",
    affectedWorlds: Object.freeze(affectedWorlds),
    providerConnectionAction: "not-executed-yet",
    globalLinkAction: "not-executed-yet",
    status: "planned"
  });
}

export function validateLinkedAIDisconnectCleanupPlan(
  plan: LinkedAIDisconnectCleanupPlan,
  snapshot: WorldScopedSnapshot
): LinkedAIDisconnectCleanupPlanValidation {
  const commandValidation = validateLinkedAIDisconnectCommand(
    { globalAILinkId: plan.globalAILinkId },
    { globalAILinks: snapshot.globalAILinks }
  );
  if (!commandValidation.valid) {
    return Object.freeze({ valid: false, error: commandValidation.error });
  }
  if (plan.status !== "planned") {
    return Object.freeze({ valid: false, error: "cleanup plan must remain planned" });
  }
  if (plan.providerConnectionAction !== "not-executed-yet" || plan.globalLinkAction !== "not-executed-yet") {
    return Object.freeze({ valid: false, error: "cleanup plan must not execute disconnect actions" });
  }
  const link = linkedAIForCommand(commandValidation.command!, snapshot);
  if (!link || plan.globalAIModelId !== link.modelId) {
    return Object.freeze({ valid: false, error: "cleanup plan model does not match linked AI" });
  }
  return Object.freeze({ valid: true, error: null });
}

function linkedAIForCommand(
  command: LinkedAIDisconnectCommand,
  snapshot: WorldScopedSnapshot
): GlobalAILink | null {
  return snapshot.globalAILinks.find((link) => link.linkId === command.globalAILinkId && link.status === "connected") ?? null;
}

function privateChatsForContacts(
  chats: readonly WorldChat[],
  contacts: readonly WorldContact[]
): readonly WorldChat[] {
  const contactIds = new Set(contacts.map((contact) => contact.contactId));
  return chats.filter((chat) => chat.participantContactIds.some((contactId) => contactIds.has(contactId)));
}

function memoryScopeIdsForCleanup(
  memory: WorldMemoryScope,
  contacts: readonly WorldContact[],
  chats: readonly WorldChat[]
): readonly string[] {
  const contactIds = new Set(contacts.map((contact) => contact.contactId));
  const chatIds = new Set(chats.map((chat) => chat.chatId));
  return [
    ...memory.contactMemoryKeys.filter((key) => contactIds.has(key)),
    ...memory.chatMemoryKeys.filter((key) => chatIds.has(key))
  ];
}

function groupCleanupStatusForContacts(
  groups: readonly WorldGroup[],
  contacts: readonly WorldContact[]
): LinkedAIDisconnectGroupCleanupStatus {
  const contactIds = new Set(contacts.flatMap((contact) => [contact.contactId, contact.actorId]));
  return groups.some((group) => group.actorIds.some((actorId) => contactIds.has(actorId)))
    ? "not-supported-yet"
    : "none-needed";
}
