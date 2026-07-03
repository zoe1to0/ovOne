import {
  validateLinkedAIDisconnectExecutionCommand,
  validateLinkedAIDisconnectExecutionPlan
} from "./linked-ai-disconnect-execution-contract.js";
import {
  createLinkedAIDisconnectPreflightPlan,
  validateLinkedAIDisconnectPreflightPlan
} from "./linked-ai-disconnect-preflight.js";
import type { LinkedAIDisconnectPreviewViewModel } from "./linked-ai-disconnect-preview.js";
import {
  validateLinkedAIDisconnectCommand,
  type LinkedAIDisconnectCommand
} from "./linked-ai-disconnect-contract.js";
import type { WorldScopedSnapshot } from "./world-model.js";

export const LINKED_AI_DISCONNECT_DRY_RUN_CONFIRMED_MESSAGE =
  "\u65ad\u5f00\u6d41\u7a0b\u5df2\u786e\u8ba4\uff0c\u5b9e\u9645\u65ad\u5f00\u6682\u672a\u5f00\u653e";
export const LINKED_AI_DISCONNECT_CONFIRMATION_REQUIRED_MESSAGE =
  "\u8bf7\u5148\u6253\u5f00\u65ad\u5f00\u9884\u89c8\u5e76\u786e\u8ba4";
export const LINKED_AI_DISCONNECT_CONFIRMATION_MISMATCH_MESSAGE =
  "\u786e\u8ba4\u76ee\u6807\u4e0e\u5f53\u524d\u9884\u89c8\u4e0d\u4e00\u81f4";
export const LINKED_AI_DISCONNECT_PREVIEW_REQUIRED_MESSAGE =
  "\u65ad\u5f00\u9884\u89c8\u7f3a\u5931\uff0c\u8bf7\u91cd\u65b0\u6253\u5f00\u9884\u89c8";

export type GuardedLinkedAIDisconnectStatus = "guard-failed" | "dry-run-confirmed";

export type GuardedLinkedAIDisconnectConfirmationInput = Readonly<{
  readonly globalAILinkId: string;
  readonly preview: LinkedAIDisconnectPreviewViewModel | null;
}>;

export type GuardedLinkedAIDisconnectInput = Readonly<{
  readonly command: LinkedAIDisconnectCommand;
  readonly confirmation: GuardedLinkedAIDisconnectConfirmationInput | null;
  readonly snapshot: WorldScopedSnapshot;
}>;

export type GuardedLinkedAIDisconnectResult = Readonly<{
  readonly status: GuardedLinkedAIDisconnectStatus;
  readonly error: string | null;
  readonly notice: string | null;
}>;

export function guardLinkedAIDisconnectExecution(
  input: GuardedLinkedAIDisconnectInput
): GuardedLinkedAIDisconnectResult {
  const commandValidation = validateLinkedAIDisconnectCommand(input.command, {
    globalAILinks: input.snapshot.globalAILinks
  });
  if (!commandValidation.valid) {
    return guardFailed(commandValidation.error);
  }
  if (!input.confirmation) {
    return guardFailed(LINKED_AI_DISCONNECT_CONFIRMATION_REQUIRED_MESSAGE);
  }
  if (input.confirmation.globalAILinkId !== input.command.globalAILinkId) {
    return guardFailed(LINKED_AI_DISCONNECT_CONFIRMATION_MISMATCH_MESSAGE);
  }
  if (!input.confirmation.preview) {
    return guardFailed(LINKED_AI_DISCONNECT_PREVIEW_REQUIRED_MESSAGE);
  }
  const cleanupPlan = input.confirmation.preview.cleanupPlan;
  const executionCommandValidation = validateLinkedAIDisconnectExecutionCommand(
    { globalAILinkId: input.command.globalAILinkId, cleanupPlan },
    input.snapshot
  );
  if (!executionCommandValidation.valid) {
    return guardFailed(executionCommandValidation.error);
  }
  const executionPlanValidation = validateLinkedAIDisconnectExecutionPlan(
    input.confirmation.preview.executionPlan,
    input.snapshot
  );
  if (!executionPlanValidation.valid) {
    return guardFailed(executionPlanValidation.error);
  }
  const preflightPlan = createLinkedAIDisconnectPreflightPlan(
    input.confirmation.preview.executionPlan,
    input.snapshot
  );
  const preflightValidation = validateLinkedAIDisconnectPreflightPlan(preflightPlan, input.snapshot);
  if (!preflightValidation.valid) {
    return guardFailed(preflightValidation.error);
  }
  return Object.freeze({
    status: "dry-run-confirmed",
    error: null,
    notice: LINKED_AI_DISCONNECT_DRY_RUN_CONFIRMED_MESSAGE
  });
}

function guardFailed(error: string | null): GuardedLinkedAIDisconnectResult {
  return Object.freeze({
    status: "guard-failed",
    error: error ?? LINKED_AI_DISCONNECT_CONFIRMATION_REQUIRED_MESSAGE,
    notice: null
  });
}
