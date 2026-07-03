import {
  validateLinkedAIDisconnectPreflightPlan,
  type LinkedAIDisconnectPreflightOperation,
  type LinkedAIDisconnectPreflightPlan
} from "./linked-ai-disconnect-preflight.js";
import type { WorldScopedSnapshot } from "./world-model.js";

export type LinkedAIDisconnectAtomicExecutionMode = "disabled" | "simulate" | "execute";
export type LinkedAIDisconnectAtomicExecutionStatus = "disabled" | "simulated" | "rejected";

export type LinkedAIDisconnectAtomicSimulatedOperation = Readonly<{
  readonly order: number;
  readonly type: LinkedAIDisconnectPreflightOperation["type"];
  readonly status: "would-run" | "deferred" | "preserved";
  readonly globalAILinkId: string;
  readonly worldId?: string;
  readonly targetId?: string;
  readonly note?: string;
}>;

export type LinkedAIDisconnectAtomicRollbackStep = Readonly<{
  readonly order: number;
  readonly type:
    | "restore-global-link"
    | "restore-world-contact"
    | "restore-private-chat"
    | "restore-memory-scope"
    | "restore-group-membership";
  readonly globalAILinkId: string;
  readonly targetId: string;
}>;

export type LinkedAIDisconnectAtomicExecutionResult = Readonly<{
  readonly mode: LinkedAIDisconnectAtomicExecutionMode;
  readonly status: LinkedAIDisconnectAtomicExecutionStatus;
  readonly error: string | null;
  readonly simulatedOperations: readonly LinkedAIDisconnectAtomicSimulatedOperation[];
  readonly rollbackSteps: readonly LinkedAIDisconnectAtomicRollbackStep[];
  readonly mutated: false;
}>;

export type LinkedAIDisconnectAtomicExecutionValidation = Readonly<{
  readonly valid: boolean;
  readonly error: string | null;
}>;

export function simulateLinkedAIDisconnectExecution(
  input: Readonly<{
    readonly mode: LinkedAIDisconnectAtomicExecutionMode;
    readonly preflightPlan: LinkedAIDisconnectPreflightPlan;
    readonly runtimeSnapshot: WorldScopedSnapshot;
  }>
): LinkedAIDisconnectAtomicExecutionResult {
  const preflightValidation = validateLinkedAIDisconnectPreflightPlan(input.preflightPlan, input.runtimeSnapshot);
  if (!preflightValidation.valid) {
    return result(input.mode, "rejected", preflightValidation.error, [], []);
  }
  if (input.mode === "execute") {
    return result("execute", "rejected", "linked AI disconnect execute mode is unavailable", [], []);
  }
  if (input.mode === "disabled") {
    return result("disabled", "disabled", null, [], []);
  }

  return result(
    "simulate",
    "simulated",
    null,
    input.preflightPlan.operations.map(toSimulatedOperation),
    rollbackStepsFor(input.preflightPlan)
  );
}

export function validateAtomicExecutionResult(
  executionResult: LinkedAIDisconnectAtomicExecutionResult,
  preflightPlan: LinkedAIDisconnectPreflightPlan
): LinkedAIDisconnectAtomicExecutionValidation {
  if (executionResult.mutated !== false) {
    return invalid("atomic execution scaffold must not mutate runtime data");
  }
  if (executionResult.mode === "execute") {
    return executionResult.status === "rejected"
      ? Object.freeze({ valid: true, error: null })
      : invalid("execute mode must remain rejected");
  }
  if (executionResult.mode === "disabled") {
    if (executionResult.status !== "disabled") {
      return invalid("disabled mode must return disabled status");
    }
    if (executionResult.simulatedOperations.length !== 0 || executionResult.rollbackSteps.length !== 0) {
      return invalid("disabled mode must not record operations");
    }
    return Object.freeze({ valid: true, error: null });
  }
  if (executionResult.status !== "simulated") {
    return invalid("simulate mode must return simulated status");
  }
  if (serializeSimulatedOperations(executionResult.simulatedOperations) !== serializeSimulatedOperations(
    preflightPlan.operations.map(toSimulatedOperation)
  )) {
    return invalid("simulated operations must follow preflight order exactly");
  }
  if (!executionResult.simulatedOperations.some((operation) => operation.type === "preserve-group-history")) {
    return invalid("simulation must preserve group history");
  }
  if (executionResult.simulatedOperations.some((operation) => (
    operation.type === "remove-group-membership-later" && operation.status !== "deferred"
  ))) {
    return invalid("group membership removal must remain deferred");
  }
  if (executionResult.simulatedOperations.some((operation) => (
    operation.type === "provider-connection-deferred" && operation.status !== "deferred"
  ))) {
    return invalid("provider connection mutation must remain deferred");
  }
  if (serializeRollbackSteps(executionResult.rollbackSteps) !== serializeRollbackSteps(rollbackStepsFor(preflightPlan))) {
    return invalid("simulation rollback steps must match rollback plan");
  }
  return Object.freeze({ valid: true, error: null });
}

function toSimulatedOperation(
  operation: LinkedAIDisconnectPreflightOperation
): LinkedAIDisconnectAtomicSimulatedOperation {
  const optionalFields = {
    ...(operation.worldId ? { worldId: operation.worldId } : {}),
    ...(operation.targetId ? { targetId: operation.targetId } : {}),
    ...(operation.note ? { note: operation.note } : {})
  };
  return Object.freeze({
    order: operation.order,
    type: operation.type,
    status: operation.status === "deferred"
      ? "deferred"
      : operation.status === "preserve"
        ? "preserved"
        : "would-run",
    globalAILinkId: operation.globalAILinkId,
    ...optionalFields
  });
}

function rollbackStepsFor(
  preflightPlan: LinkedAIDisconnectPreflightPlan
): readonly LinkedAIDisconnectAtomicRollbackStep[] {
  const steps: LinkedAIDisconnectAtomicRollbackStep[] = [];
  const add = (step: Omit<LinkedAIDisconnectAtomicRollbackStep, "order" | "globalAILinkId">) => {
    steps.push(Object.freeze({
      order: steps.length + 1,
      globalAILinkId: preflightPlan.globalAILinkId,
      ...step
    }));
  };
  add({ type: "restore-global-link", targetId: preflightPlan.rollbackPlan.restoreGlobalAILink.linkId });
  for (const contactId of preflightPlan.rollbackPlan.restoreWorldContactIds) {
    add({ type: "restore-world-contact", targetId: contactId });
  }
  for (const chatId of preflightPlan.rollbackPlan.restorePrivateChatIds) {
    add({ type: "restore-private-chat", targetId: chatId });
  }
  for (const memoryScopeId of preflightPlan.rollbackPlan.restoreMemoryScopeIds) {
    add({ type: "restore-memory-scope", targetId: memoryScopeId });
  }
  for (const membership of preflightPlan.rollbackPlan.restoreGroupMemberships) {
    add({ type: "restore-group-membership", targetId: membership.groupId });
  }
  return Object.freeze(steps);
}

function result(
  mode: LinkedAIDisconnectAtomicExecutionMode,
  status: LinkedAIDisconnectAtomicExecutionStatus,
  error: string | null,
  simulatedOperations: readonly LinkedAIDisconnectAtomicSimulatedOperation[],
  rollbackSteps: readonly LinkedAIDisconnectAtomicRollbackStep[]
): LinkedAIDisconnectAtomicExecutionResult {
  return Object.freeze({
    mode,
    status,
    error,
    simulatedOperations: Object.freeze(simulatedOperations),
    rollbackSteps: Object.freeze(rollbackSteps),
    mutated: false
  });
}

function invalid(error: string): LinkedAIDisconnectAtomicExecutionValidation {
  return Object.freeze({ valid: false, error });
}

function serializeSimulatedOperations(operations: readonly LinkedAIDisconnectAtomicSimulatedOperation[]): string {
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

function serializeRollbackSteps(steps: readonly LinkedAIDisconnectAtomicRollbackStep[]): string {
  return JSON.stringify(steps.map((step) => ({
    order: step.order,
    type: step.type,
    globalAILinkId: step.globalAILinkId,
    targetId: step.targetId
  })));
}
