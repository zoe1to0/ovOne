import {
  validateLinkedAIDisconnectExecutionPlan,
  type LinkedAIDisconnectExecutionPlan
} from "./linked-ai-disconnect-execution-contract.js";
import {
  createLinkedAIDisconnectRollbackPlan,
  createLinkedAIDisconnectSnapshot,
  validateLinkedAIDisconnectSnapshot,
  type LinkedAIDisconnectExecutionSnapshot,
  type LinkedAIDisconnectRollbackPlan
} from "./linked-ai-disconnect-execution-snapshot.js";
import type { WorldId } from "../world-domain/index.js";
import type { WorldScopedSnapshot } from "./world-model.js";

export type LinkedAIDisconnectPreflightStatus = "planned";
export type LinkedAIDisconnectPreflightOperationStatus = "planned" | "deferred" | "preserve";

export type LinkedAIDisconnectPreflightOperationType =
  | "validate-command"
  | "create-snapshot"
  | "create-rollback-plan"
  | "mark-global-link-disconnecting"
  | "remove-world-contact"
  | "remove-private-chat"
  | "remove-memory-scope"
  | "preserve-group-history"
  | "remove-group-membership-later"
  | "provider-connection-deferred";

export type LinkedAIDisconnectPreflightOperation = Readonly<{
  readonly order: number;
  readonly type: LinkedAIDisconnectPreflightOperationType;
  readonly status: LinkedAIDisconnectPreflightOperationStatus;
  readonly globalAILinkId: string;
  readonly worldId?: WorldId;
  readonly targetId?: string;
  readonly note?: string;
}>;

export type LinkedAIDisconnectPreflightPlan = Readonly<{
  readonly globalAILinkId: string;
  readonly globalAIModelId: string;
  readonly executionPlan: LinkedAIDisconnectExecutionPlan;
  readonly executionSnapshot: LinkedAIDisconnectExecutionSnapshot;
  readonly rollbackPlan: LinkedAIDisconnectRollbackPlan;
  readonly operations: readonly LinkedAIDisconnectPreflightOperation[];
  readonly readOnly: true;
  readonly status: LinkedAIDisconnectPreflightStatus;
}>;

export type LinkedAIDisconnectPreflightValidation = Readonly<{
  readonly valid: boolean;
  readonly error: string | null;
}>;

const PLAN_KEYS = Object.freeze([
  "globalAILinkId",
  "globalAIModelId",
  "executionPlan",
  "executionSnapshot",
  "rollbackPlan",
  "operations",
  "readOnly",
  "status"
]);

const OPERATION_KEYS = Object.freeze([
  "order",
  "type",
  "status",
  "globalAILinkId",
  "worldId",
  "targetId",
  "note"
]);

export function createLinkedAIDisconnectPreflightPlan(
  executionPlan: LinkedAIDisconnectExecutionPlan,
  runtimeSnapshot: WorldScopedSnapshot
): LinkedAIDisconnectPreflightPlan {
  const executionSnapshot = createLinkedAIDisconnectSnapshot(executionPlan, runtimeSnapshot);
  const rollbackPlan = createLinkedAIDisconnectRollbackPlan(executionSnapshot);
  return Object.freeze({
    globalAILinkId: executionPlan.globalAILinkId,
    globalAIModelId: executionPlan.globalAIModelId,
    executionPlan,
    executionSnapshot,
    rollbackPlan,
    operations: Object.freeze(createOperations(executionSnapshot)),
    readOnly: true,
    status: "planned"
  });
}

export function validateLinkedAIDisconnectPreflightPlan(
  preflightPlan: LinkedAIDisconnectPreflightPlan,
  runtimeSnapshot: WorldScopedSnapshot
): LinkedAIDisconnectPreflightValidation {
  const keyError = unexpectedKeys(preflightPlan, PLAN_KEYS, "preflight plan");
  if (keyError) {
    return invalid(keyError);
  }
  if (preflightPlan.readOnly !== true) {
    return invalid("preflight plan must remain read-only");
  }
  if (preflightPlan.status !== "planned") {
    return invalid("preflight plan must remain planned");
  }
  const executionValidation = validateLinkedAIDisconnectExecutionPlan(preflightPlan.executionPlan, runtimeSnapshot);
  if (!executionValidation.valid) {
    return invalid(executionValidation.error ?? "execution plan is invalid");
  }
  const snapshotValidation = validateLinkedAIDisconnectSnapshot(preflightPlan.executionSnapshot, runtimeSnapshot);
  if (!snapshotValidation.valid) {
    return invalid(snapshotValidation.error ?? "execution snapshot is invalid");
  }
  if (
    preflightPlan.globalAILinkId !== preflightPlan.executionPlan.globalAILinkId ||
    preflightPlan.globalAIModelId !== preflightPlan.executionPlan.globalAIModelId
  ) {
    return invalid("preflight target must match execution plan target");
  }
  const expectedRollbackPlan = createLinkedAIDisconnectRollbackPlan(preflightPlan.executionSnapshot);
  if (serializeRollbackPlan(preflightPlan.rollbackPlan) !== serializeRollbackPlan(expectedRollbackPlan)) {
    return invalid("rollback plan must match execution snapshot");
  }
  for (const operation of preflightPlan.operations) {
    const operationKeyError = unexpectedKeys(operation, OPERATION_KEYS, "preflight operation");
    if (operationKeyError) {
      return invalid(operationKeyError);
    }
  }
  const expectedPlan = createLinkedAIDisconnectPreflightPlan(preflightPlan.executionPlan, runtimeSnapshot);
  if (serializeOperations(preflightPlan.operations) !== serializeOperations(expectedPlan.operations)) {
    return invalid("preflight operations must match the safe disconnect operation order");
  }
  return Object.freeze({ valid: true, error: null });
}

function createOperations(
  executionSnapshot: LinkedAIDisconnectExecutionSnapshot
): readonly LinkedAIDisconnectPreflightOperation[] {
  const operations: LinkedAIDisconnectPreflightOperation[] = [];
  const add = (
    type: LinkedAIDisconnectPreflightOperationType,
    status: LinkedAIDisconnectPreflightOperationStatus,
    fields: Omit<LinkedAIDisconnectPreflightOperation, "order" | "type" | "status" | "globalAILinkId"> = {}
  ) => {
    operations.push(Object.freeze({
      order: operations.length + 1,
      type,
      status,
      globalAILinkId: executionSnapshot.globalAILinkId,
      ...fields
    }));
  };

  add("validate-command", "planned");
  add("create-snapshot", "planned");
  add("create-rollback-plan", "planned");
  add("mark-global-link-disconnecting", "planned", {
    targetId: executionSnapshot.targetGlobalAILink.linkId
  });

  for (const world of executionSnapshot.affectedWorlds) {
    for (const contactId of world.worldContactIds) {
      add("remove-world-contact", "planned", { worldId: world.worldId, targetId: contactId });
    }
  }
  for (const world of executionSnapshot.affectedWorlds) {
    for (const chatId of world.privateChatIds) {
      add("remove-private-chat", "planned", { worldId: world.worldId, targetId: chatId });
    }
  }
  for (const world of executionSnapshot.affectedWorlds) {
    for (const memoryScopeId of world.memoryScopeIds) {
      add("remove-memory-scope", "planned", { worldId: world.worldId, targetId: memoryScopeId });
    }
  }
  for (const world of executionSnapshot.affectedWorlds) {
    for (const membership of world.groupMembershipsPlannedForFutureRemoval) {
      add("preserve-group-history", "preserve", {
        worldId: world.worldId,
        targetId: membership.groupId,
        note: "Group chats, group messages, and historical removed-AI messages remain preserved."
      });
      add("remove-group-membership-later", "deferred", {
        worldId: world.worldId,
        targetId: membership.groupId,
        note: "Future operation only; no group membership mutation is executed in preflight."
      });
    }
  }
  add("provider-connection-deferred", "deferred", {
    note: "ProviderConnection mutation remains future/separate."
  });

  return operations;
}

function unexpectedKeys(value: object, allowedKeys: readonly string[], label: string): string | null {
  const allowed = new Set(allowedKeys);
  const unexpected = Object.keys(value).filter((key) => !allowed.has(key));
  return unexpected.length > 0 ? `${label} contains unsupported fields: ${unexpected.join(", ")}` : null;
}

function invalid(error: string): LinkedAIDisconnectPreflightValidation {
  return Object.freeze({ valid: false, error });
}

function serializeOperations(operations: readonly LinkedAIDisconnectPreflightOperation[]): string {
  return JSON.stringify(operations.map((operation) => ({
    order: operation.order,
    type: operation.type,
    status: operation.status,
    globalAILinkId: operation.globalAILinkId,
    worldId: operation.worldId,
    targetId: operation.targetId,
    note: operation.note
  })));
}

function serializeRollbackPlan(rollbackPlan: LinkedAIDisconnectRollbackPlan): string {
  return JSON.stringify({
    globalAILinkId: rollbackPlan.globalAILinkId,
    globalAIModelId: rollbackPlan.globalAIModelId,
    restoreGlobalAILink: rollbackPlan.restoreGlobalAILink,
    restoreWorldContactIds: [...rollbackPlan.restoreWorldContactIds],
    restorePrivateChatIds: [...rollbackPlan.restorePrivateChatIds],
    restoreMemoryScopeIds: [...rollbackPlan.restoreMemoryScopeIds],
    restoreGroupMemberships: rollbackPlan.restoreGroupMemberships.map((membership) => ({
      worldId: membership.worldId,
      groupId: membership.groupId,
      groupTitle: membership.groupTitle,
      targetActorIds: [...membership.targetActorIds],
      action: membership.action,
      groupChatPreservation: membership.groupChatPreservation,
      groupMessagePreservation: membership.groupMessagePreservation,
      historicalTargetMessagesPreservation: membership.historicalTargetMessagesPreservation
    })),
    preservedResources: [...rollbackPlan.preservedResources],
    status: rollbackPlan.status
  });
}
