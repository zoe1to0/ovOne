import type { GlobalAILink, WorldContact, WorldScopedSnapshot } from "./world-model.js";
import type { WorldGroup, WorldId } from "../world-domain/index.js";
import {
  createLinkedAIDisconnectCleanupPlan,
  validateLinkedAIDisconnectCleanupPlan,
  type LinkedAIDisconnectCleanupPlan
} from "./linked-ai-disconnect-cleanup-plan.js";
import type { LinkedAIDisconnectExecutionPlan } from "./linked-ai-disconnect-execution-contract.js";

export type LinkedAIDisconnectExecutionSnapshotStatus = "captured";
export type LinkedAIDisconnectRollbackPlanStatus = "planned";
export type LinkedAIDisconnectGroupMembershipAction = "future-member-removal-only";
export type LinkedAIDisconnectPreservationRule = "preserve";
export type LinkedAIDisconnectProviderConnectionSnapshotStatus = "not-mutated";

export type LinkedAIDisconnectExplicitNonMutatedResource =
  | "Worlds"
  | "OtherAI"
  | "GroupMessages"
  | "GroupChats"
  | "ProviderConnection"
  | "WeatherTimePermission"
  | "UserProfile";

export type LinkedAIDisconnectGroupMembershipSnapshot = Readonly<{
  readonly worldId: WorldId;
  readonly groupId: string;
  readonly groupTitle: string;
  readonly targetActorIds: readonly string[];
  readonly action: LinkedAIDisconnectGroupMembershipAction;
  readonly groupChatPreservation: LinkedAIDisconnectPreservationRule;
  readonly groupMessagePreservation: LinkedAIDisconnectPreservationRule;
  readonly historicalTargetMessagesPreservation: LinkedAIDisconnectPreservationRule;
}>;

export type LinkedAIDisconnectAffectedWorldSnapshot = Readonly<{
  readonly worldId: WorldId;
  readonly worldTitle: string;
  readonly worldContactIds: readonly string[];
  readonly privateChatIds: readonly string[];
  readonly memoryScopeIds: readonly string[];
  readonly groupMembershipsPlannedForFutureRemoval: readonly LinkedAIDisconnectGroupMembershipSnapshot[];
}>;

export type LinkedAIDisconnectExecutionSnapshot = Readonly<{
  readonly globalAILinkId: string;
  readonly globalAIModelId: string;
  readonly targetGlobalAILink: GlobalAILink;
  readonly affectedWorlds: readonly LinkedAIDisconnectAffectedWorldSnapshot[];
  readonly explicitNonMutatedResources: readonly LinkedAIDisconnectExplicitNonMutatedResource[];
  readonly providerConnectionStatus: LinkedAIDisconnectProviderConnectionSnapshotStatus;
  readonly status: LinkedAIDisconnectExecutionSnapshotStatus;
}>;

export type LinkedAIDisconnectRollbackPlan = Readonly<{
  readonly globalAILinkId: string;
  readonly globalAIModelId: string;
  readonly restoreGlobalAILink: GlobalAILink;
  readonly restoreWorldContactIds: readonly string[];
  readonly restorePrivateChatIds: readonly string[];
  readonly restoreMemoryScopeIds: readonly string[];
  readonly restoreGroupMemberships: readonly LinkedAIDisconnectGroupMembershipSnapshot[];
  readonly preservedResources: readonly LinkedAIDisconnectExplicitNonMutatedResource[];
  readonly status: LinkedAIDisconnectRollbackPlanStatus;
}>;

export type LinkedAIDisconnectExecutionSnapshotValidation = Readonly<{
  readonly valid: boolean;
  readonly error: string | null;
}>;

const SNAPSHOT_KEYS = Object.freeze([
  "globalAILinkId",
  "globalAIModelId",
  "targetGlobalAILink",
  "affectedWorlds",
  "explicitNonMutatedResources",
  "providerConnectionStatus",
  "status"
]);

const AFFECTED_WORLD_KEYS = Object.freeze([
  "worldId",
  "worldTitle",
  "worldContactIds",
  "privateChatIds",
  "memoryScopeIds",
  "groupMembershipsPlannedForFutureRemoval"
]);

const GROUP_MEMBERSHIP_KEYS = Object.freeze([
  "worldId",
  "groupId",
  "groupTitle",
  "targetActorIds",
  "action",
  "groupChatPreservation",
  "groupMessagePreservation",
  "historicalTargetMessagesPreservation"
]);

export function createLinkedAIDisconnectSnapshot(
  executionPlan: LinkedAIDisconnectExecutionPlan,
  snapshot: WorldScopedSnapshot
): LinkedAIDisconnectExecutionSnapshot {
  const targetGlobalAILink = linkedAIForPlan(executionPlan.cleanupPlan, snapshot);
  if (!targetGlobalAILink) {
    return Object.freeze({
      globalAILinkId: executionPlan.globalAILinkId,
      globalAIModelId: executionPlan.globalAIModelId,
      targetGlobalAILink: Object.freeze({
        linkId: executionPlan.globalAILinkId,
        modelId: executionPlan.globalAIModelId,
        connectedAt: 0,
        status: "disconnected"
      }),
      affectedWorlds: Object.freeze([]),
      explicitNonMutatedResources: getExplicitNonMutatedResources(),
      providerConnectionStatus: "not-mutated",
      status: "captured"
    });
  }

  return Object.freeze({
    globalAILinkId: executionPlan.globalAILinkId,
    globalAIModelId: targetGlobalAILink.modelId,
    targetGlobalAILink,
    affectedWorlds: Object.freeze(
      executionPlan.cleanupPlan.affectedWorlds.map((planWorld) => {
        const worldScope = snapshot.worlds.get(planWorld.worldId);
        const contacts = worldScope
          ? worldScope.contacts.filter((contact) => planWorld.worldContactIds.includes(contact.contactId))
          : [];
        return Object.freeze({
          worldId: planWorld.worldId,
          worldTitle: planWorld.worldTitle,
          worldContactIds: Object.freeze([...planWorld.worldContactIds]),
          privateChatIds: Object.freeze([...planWorld.privateChatIds]),
          memoryScopeIds: Object.freeze([...planWorld.memoryScopeIds]),
          groupMembershipsPlannedForFutureRemoval: Object.freeze(
            worldScope ? groupMembershipsForContacts(worldScope.groups, contacts, planWorld.worldId) : []
          )
        });
      })
    ),
    explicitNonMutatedResources: getExplicitNonMutatedResources(),
    providerConnectionStatus: "not-mutated",
    status: "captured"
  });
}

export function validateLinkedAIDisconnectSnapshot(
  executionSnapshot: LinkedAIDisconnectExecutionSnapshot,
  runtimeSnapshot: WorldScopedSnapshot
): LinkedAIDisconnectExecutionSnapshotValidation {
  const keyError = unexpectedKeys(executionSnapshot, SNAPSHOT_KEYS, "execution snapshot");
  if (keyError) {
    return invalid(keyError);
  }
  if (executionSnapshot.status !== "captured") {
    return invalid("execution snapshot must remain captured");
  }
  if (executionSnapshot.providerConnectionStatus !== "not-mutated") {
    return invalid("provider connection must not be mutated by execution snapshot");
  }
  if (!hasRequiredNonMutatedResources(executionSnapshot.explicitNonMutatedResources)) {
    return invalid("execution snapshot must explicitly preserve non-mutated resources");
  }
  const cleanupPlan = createLinkedAIDisconnectCleanupPlan(
    { globalAILinkId: executionSnapshot.globalAILinkId },
    runtimeSnapshot
  );
  const cleanupValidation = validateLinkedAIDisconnectCleanupPlan(cleanupPlan, runtimeSnapshot);
  if (!cleanupValidation.valid) {
    return invalid(cleanupValidation.error ?? "cleanup plan is invalid");
  }
  if (executionSnapshot.globalAIModelId !== cleanupPlan.globalAIModelId) {
    return invalid("execution snapshot model does not match selected linked AI");
  }
  if (
    executionSnapshot.targetGlobalAILink.linkId !== cleanupPlan.globalAILinkId ||
    executionSnapshot.targetGlobalAILink.modelId !== cleanupPlan.globalAIModelId ||
    executionSnapshot.targetGlobalAILink.status !== "connected"
  ) {
    return invalid("execution snapshot target GlobalAILink does not match connected linked AI");
  }

  for (const world of executionSnapshot.affectedWorlds) {
    const worldKeyError = unexpectedKeys(world, AFFECTED_WORLD_KEYS, "execution snapshot affected world");
    if (worldKeyError) {
      return invalid(worldKeyError);
    }
    for (const membership of world.groupMembershipsPlannedForFutureRemoval) {
      const membershipKeyError = unexpectedKeys(membership, GROUP_MEMBERSHIP_KEYS, "group membership snapshot");
      if (membershipKeyError) {
        return invalid(membershipKeyError);
      }
      if (membership.action !== "future-member-removal-only") {
        return invalid("group membership snapshot must remain future-member-removal-only");
      }
      if (
        membership.groupChatPreservation !== "preserve" ||
        membership.groupMessagePreservation !== "preserve" ||
        membership.historicalTargetMessagesPreservation !== "preserve"
      ) {
        return invalid("group chats, group messages, and historical target messages must be preserved");
      }
    }
  }

  const expected = createLinkedAIDisconnectSnapshot(
    {
      globalAILinkId: cleanupPlan.globalAILinkId,
      globalAIModelId: cleanupPlan.globalAIModelId,
      cleanupPlan,
      globalLinkAction: "disable-or-remove-later",
      providerConnectionAction: "not-executed-yet",
      allowedFutureMutations: [],
      forbiddenFutureMutations: [],
      warnings: [],
      status: "planned"
    },
    runtimeSnapshot
  );
  if (serializeExecutionSnapshot(executionSnapshot) !== serializeExecutionSnapshot(expected)) {
    return invalid("execution snapshot must match the selected linked AI scope exactly");
  }

  return Object.freeze({ valid: true, error: null });
}

export function createLinkedAIDisconnectRollbackPlan(
  executionSnapshot: LinkedAIDisconnectExecutionSnapshot
): LinkedAIDisconnectRollbackPlan {
  return Object.freeze({
    globalAILinkId: executionSnapshot.globalAILinkId,
    globalAIModelId: executionSnapshot.globalAIModelId,
    restoreGlobalAILink: executionSnapshot.targetGlobalAILink,
    restoreWorldContactIds: Object.freeze(executionSnapshot.affectedWorlds.flatMap((world) => [...world.worldContactIds])),
    restorePrivateChatIds: Object.freeze(executionSnapshot.affectedWorlds.flatMap((world) => [...world.privateChatIds])),
    restoreMemoryScopeIds: Object.freeze(executionSnapshot.affectedWorlds.flatMap((world) => [...world.memoryScopeIds])),
    restoreGroupMemberships: Object.freeze(
      executionSnapshot.affectedWorlds.flatMap((world) => [...world.groupMembershipsPlannedForFutureRemoval])
    ),
    preservedResources: executionSnapshot.explicitNonMutatedResources,
    status: "planned"
  });
}

export function getExplicitNonMutatedResources(): readonly LinkedAIDisconnectExplicitNonMutatedResource[] {
  return Object.freeze([
    "Worlds",
    "OtherAI",
    "GroupMessages",
    "GroupChats",
    "ProviderConnection",
    "WeatherTimePermission",
    "UserProfile"
  ]);
}

function linkedAIForPlan(
  plan: LinkedAIDisconnectCleanupPlan,
  snapshot: WorldScopedSnapshot
): GlobalAILink | null {
  return snapshot.globalAILinks.find((link) => link.linkId === plan.globalAILinkId && link.status === "connected") ?? null;
}

function groupMembershipsForContacts(
  groups: readonly WorldGroup[],
  contacts: readonly WorldContact[],
  worldId: WorldId
): readonly LinkedAIDisconnectGroupMembershipSnapshot[] {
  const contactActorIds = new Set(contacts.flatMap((contact) => [contact.actorId, contact.contactId]));
  return groups.flatMap((group) => {
    const targetActorIds = group.actorIds.filter((actorId) => contactActorIds.has(actorId));
    if (targetActorIds.length === 0) {
      return [];
    }
    return [Object.freeze({
      worldId,
      groupId: group.id,
      groupTitle: group.title,
      targetActorIds: Object.freeze(targetActorIds),
      action: "future-member-removal-only" as const,
      groupChatPreservation: "preserve" as const,
      groupMessagePreservation: "preserve" as const,
      historicalTargetMessagesPreservation: "preserve" as const
    })];
  });
}

function hasRequiredNonMutatedResources(resources: readonly LinkedAIDisconnectExplicitNonMutatedResource[]): boolean {
  const current = new Set(resources);
  return getExplicitNonMutatedResources().every((resource) => current.has(resource));
}

function unexpectedKeys(value: object, allowedKeys: readonly string[], label: string): string | null {
  const allowed = new Set(allowedKeys);
  const unexpected = Object.keys(value).filter((key) => !allowed.has(key));
  return unexpected.length > 0 ? `${label} contains unsupported fields: ${unexpected.join(", ")}` : null;
}

function invalid(error: string): LinkedAIDisconnectExecutionSnapshotValidation {
  return Object.freeze({ valid: false, error });
}

function serializeExecutionSnapshot(executionSnapshot: LinkedAIDisconnectExecutionSnapshot): string {
  return JSON.stringify({
    globalAILinkId: executionSnapshot.globalAILinkId,
    globalAIModelId: executionSnapshot.globalAIModelId,
    targetGlobalAILink: executionSnapshot.targetGlobalAILink,
    affectedWorlds: executionSnapshot.affectedWorlds.map((world) => ({
      worldId: world.worldId,
      worldTitle: world.worldTitle,
      worldContactIds: [...world.worldContactIds],
      privateChatIds: [...world.privateChatIds],
      memoryScopeIds: [...world.memoryScopeIds],
      groupMembershipsPlannedForFutureRemoval: world.groupMembershipsPlannedForFutureRemoval.map((membership) => ({
        worldId: membership.worldId,
        groupId: membership.groupId,
        groupTitle: membership.groupTitle,
        targetActorIds: [...membership.targetActorIds],
        action: membership.action,
        groupChatPreservation: membership.groupChatPreservation,
        groupMessagePreservation: membership.groupMessagePreservation,
        historicalTargetMessagesPreservation: membership.historicalTargetMessagesPreservation
      }))
    })),
    explicitNonMutatedResources: [...executionSnapshot.explicitNonMutatedResources],
    providerConnectionStatus: executionSnapshot.providerConnectionStatus,
    status: executionSnapshot.status
  });
}
