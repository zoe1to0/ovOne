import type { WorldScopedSnapshot } from "./world-model.js";
import {
  createLinkedAIDisconnectCleanupPlan,
  validateLinkedAIDisconnectCleanupPlan,
  type LinkedAIDisconnectCleanupPlan
} from "./linked-ai-disconnect-cleanup-plan.js";
import {
  validateLinkedAIDisconnectCommand,
  type LinkedAIDisconnectCommand
} from "./linked-ai-disconnect-contract.js";

export type LinkedAIDisconnectExecutionStatus = "planned";
export type LinkedAIDisconnectGlobalLinkAction = "disable-or-remove-later";
export type LinkedAIDisconnectProviderConnectionAction = "not-executed-yet" | "mark-disconnected-later";

export type LinkedAIDisconnectAllowedFutureMutation =
  | "SelectedGlobalAILinkStatusOrRemovalFlag"
  | "SelectedAIWorldContact"
  | "SelectedAIPrivateWorldChat"
  | "SelectedAIWorldMemoryScope"
  | "ProviderConnectionStatusLater";

export type LinkedAIDisconnectForbiddenFutureMutation =
  | "World"
  | "OtherAI"
  | "UnrelatedWorldContact"
  | "UnrelatedWorldChat"
  | "UnrelatedWorldMemory"
  | "WorldEditorMetadata"
  | "UnrelatedContactDetailPreferences"
  | "GroupChat"
  | "WeatherTimePermission"
  | "UserProfile"
  | "GlobalAIModel"
  | "ProviderConnectionNow";

export type LinkedAIDisconnectExecutionCommand = Readonly<{
  readonly globalAILinkId: string;
  readonly cleanupPlan: LinkedAIDisconnectCleanupPlan;
}>;

export type LinkedAIDisconnectExecutionPlan = Readonly<{
  readonly globalAILinkId: string;
  readonly globalAIModelId: string;
  readonly cleanupPlan: LinkedAIDisconnectCleanupPlan;
  readonly globalLinkAction: LinkedAIDisconnectGlobalLinkAction;
  readonly providerConnectionAction: LinkedAIDisconnectProviderConnectionAction;
  readonly allowedFutureMutations: readonly LinkedAIDisconnectAllowedFutureMutation[];
  readonly forbiddenFutureMutations: readonly LinkedAIDisconnectForbiddenFutureMutation[];
  readonly warnings: readonly string[];
  readonly status: LinkedAIDisconnectExecutionStatus;
}>;

export type LinkedAIDisconnectExecutionValidation = Readonly<{
  readonly valid: boolean;
  readonly command: LinkedAIDisconnectExecutionCommand | null;
  readonly error: string | null;
  readonly warnings: readonly string[];
  readonly allowedFutureMutations: readonly LinkedAIDisconnectAllowedFutureMutation[];
  readonly forbiddenFutureMutations: readonly LinkedAIDisconnectForbiddenFutureMutation[];
}>;

export const LINKED_AI_DISCONNECT_GROUP_CLEANUP_UNSUPPORTED_WARNING =
  "Group cleanup remains unsupported for linked AI disconnect execution.";

const CLEANUP_PLAN_KEYS = Object.freeze([
  "globalAILinkId",
  "globalAIModelId",
  "affectedWorlds",
  "providerConnectionAction",
  "globalLinkAction",
  "status"
]);

const WORLD_CLEANUP_PLAN_ITEM_KEYS = Object.freeze([
  "worldId",
  "worldTitle",
  "worldContactIds",
  "privateChatIds",
  "memoryScopeIds",
  "groupCleanupStatus"
]);

const EXECUTION_PLAN_KEYS = Object.freeze([
  "globalAILinkId",
  "globalAIModelId",
  "cleanupPlan",
  "globalLinkAction",
  "providerConnectionAction",
  "allowedFutureMutations",
  "forbiddenFutureMutations",
  "warnings",
  "status"
]);

export function createLinkedAIDisconnectExecutionPlan(
  command: LinkedAIDisconnectCommand,
  snapshot: WorldScopedSnapshot
): LinkedAIDisconnectExecutionPlan {
  const cleanupPlan = createLinkedAIDisconnectCleanupPlan(command, snapshot);
  return Object.freeze({
    globalAILinkId: command.globalAILinkId,
    globalAIModelId: cleanupPlan.globalAIModelId,
    cleanupPlan,
    globalLinkAction: "disable-or-remove-later",
    providerConnectionAction: "not-executed-yet",
    allowedFutureMutations: getLinkedAIDisconnectAllowedFutureMutations(),
    forbiddenFutureMutations: getLinkedAIDisconnectForbiddenFutureMutations(),
    warnings: getLinkedAIDisconnectExecutionWarnings(cleanupPlan),
    status: "planned"
  });
}

export function canExecuteLinkedAIDisconnect(
  command: LinkedAIDisconnectExecutionCommand,
  snapshot: WorldScopedSnapshot
): boolean {
  return validateLinkedAIDisconnectExecutionCommand(command, snapshot).valid;
}

export function validateLinkedAIDisconnectExecutionCommand(
  command: LinkedAIDisconnectExecutionCommand,
  snapshot: WorldScopedSnapshot
): LinkedAIDisconnectExecutionValidation {
  const baseValidation = validateLinkedAIDisconnectCommand(
    { globalAILinkId: command.globalAILinkId },
    { globalAILinks: snapshot.globalAILinks }
  );
  const warnings = getLinkedAIDisconnectExecutionWarnings(command.cleanupPlan);
  if (!baseValidation.valid) {
    return validationResult(false, null, baseValidation.error, warnings);
  }
  if (command.cleanupPlan.globalAILinkId !== command.globalAILinkId) {
    return validationResult(false, null, "execution command and cleanup plan target different linked AI", warnings);
  }
  const cleanupValidation = validateLinkedAIDisconnectCleanupPlan(command.cleanupPlan, snapshot);
  if (!cleanupValidation.valid) {
    return validationResult(false, null, cleanupValidation.error, warnings);
  }
  const keyError = validateCleanupPlanKeys(command.cleanupPlan);
  if (keyError) {
    return validationResult(false, null, keyError, warnings);
  }
  const expectedPlan = createLinkedAIDisconnectCleanupPlan({ globalAILinkId: command.globalAILinkId }, snapshot);
  if (serializePlan(command.cleanupPlan) !== serializePlan(expectedPlan)) {
    return validationResult(false, null, "cleanup plan must match the selected linked AI scope exactly", warnings);
  }
  return validationResult(true, command, null, warnings);
}

export function validateLinkedAIDisconnectExecutionPlan(
  plan: LinkedAIDisconnectExecutionPlan,
  snapshot: WorldScopedSnapshot
): LinkedAIDisconnectExecutionValidation {
  const planKeyError = unexpectedKeys(plan, EXECUTION_PLAN_KEYS, "execution plan");
  if (planKeyError) {
    return validationResult(false, null, planKeyError, getLinkedAIDisconnectExecutionWarnings(plan.cleanupPlan));
  }
  if (plan.status !== "planned") {
    return validationResult(false, null, "execution plan must remain planned", plan.warnings);
  }
  if (plan.globalLinkAction !== "disable-or-remove-later") {
    return validationResult(false, null, "global link action must remain future-only", plan.warnings);
  }
  if (plan.providerConnectionAction !== "not-executed-yet" && plan.providerConnectionAction !== "mark-disconnected-later") {
    return validationResult(false, null, "provider connection action must remain future-only", plan.warnings);
  }
  if (plan.globalAILinkId !== plan.cleanupPlan.globalAILinkId || plan.globalAIModelId !== plan.cleanupPlan.globalAIModelId) {
    return validationResult(false, null, "execution plan target must match cleanup plan target", plan.warnings);
  }
  return validateLinkedAIDisconnectExecutionCommand(
    { globalAILinkId: plan.globalAILinkId, cleanupPlan: plan.cleanupPlan },
    snapshot
  );
}

export function getLinkedAIDisconnectExecutionWarnings(
  cleanupPlan: LinkedAIDisconnectCleanupPlan
): readonly string[] {
  return Object.freeze(
    cleanupPlan.affectedWorlds.some((world) => world.groupCleanupStatus === "not-supported-yet")
      ? [LINKED_AI_DISCONNECT_GROUP_CLEANUP_UNSUPPORTED_WARNING]
      : []
  );
}

export function getLinkedAIDisconnectAllowedFutureMutations(): readonly LinkedAIDisconnectAllowedFutureMutation[] {
  return Object.freeze([
    "SelectedGlobalAILinkStatusOrRemovalFlag",
    "SelectedAIWorldContact",
    "SelectedAIPrivateWorldChat",
    "SelectedAIWorldMemoryScope",
    "ProviderConnectionStatusLater"
  ]);
}

export function getLinkedAIDisconnectForbiddenFutureMutations(): readonly LinkedAIDisconnectForbiddenFutureMutation[] {
  return Object.freeze([
    "World",
    "OtherAI",
    "UnrelatedWorldContact",
    "UnrelatedWorldChat",
    "UnrelatedWorldMemory",
    "WorldEditorMetadata",
    "UnrelatedContactDetailPreferences",
    "GroupChat",
    "WeatherTimePermission",
    "UserProfile",
    "GlobalAIModel",
    "ProviderConnectionNow"
  ]);
}

function validationResult(
  valid: boolean,
  command: LinkedAIDisconnectExecutionCommand | null,
  error: string | null,
  warnings: readonly string[]
): LinkedAIDisconnectExecutionValidation {
  return Object.freeze({
    valid,
    command: valid ? command : null,
    error,
    warnings,
    allowedFutureMutations: getLinkedAIDisconnectAllowedFutureMutations(),
    forbiddenFutureMutations: getLinkedAIDisconnectForbiddenFutureMutations()
  });
}

function validateCleanupPlanKeys(plan: LinkedAIDisconnectCleanupPlan): string | null {
  const planKeyError = unexpectedKeys(plan, CLEANUP_PLAN_KEYS, "cleanup plan");
  if (planKeyError) {
    return planKeyError;
  }
  for (const item of plan.affectedWorlds) {
    const itemKeyError = unexpectedKeys(item, WORLD_CLEANUP_PLAN_ITEM_KEYS, "world cleanup plan item");
    if (itemKeyError) {
      return itemKeyError;
    }
    if (item.groupCleanupStatus !== "not-supported-yet" && item.groupCleanupStatus !== "none-needed") {
      return "group cleanup must remain unsupported or unnecessary";
    }
  }
  return null;
}

function unexpectedKeys(value: object, allowedKeys: readonly string[], label: string): string | null {
  const allowed = new Set(allowedKeys);
  const unexpected = Object.keys(value).filter((key) => !allowed.has(key));
  return unexpected.length > 0 ? `${label} contains unsupported mutation fields: ${unexpected.join(", ")}` : null;
}

function serializePlan(plan: LinkedAIDisconnectCleanupPlan): string {
  return JSON.stringify({
    globalAILinkId: plan.globalAILinkId,
    globalAIModelId: plan.globalAIModelId,
    affectedWorlds: plan.affectedWorlds.map((world) => ({
      worldId: world.worldId,
      worldTitle: world.worldTitle,
      worldContactIds: [...world.worldContactIds],
      privateChatIds: [...world.privateChatIds],
      memoryScopeIds: [...world.memoryScopeIds],
      groupCleanupStatus: world.groupCleanupStatus
    })),
    providerConnectionAction: plan.providerConnectionAction,
    globalLinkAction: plan.globalLinkAction,
    status: plan.status
  });
}
