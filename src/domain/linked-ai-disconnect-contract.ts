import type { GlobalAILink } from "./world-model.js";

export const LINKED_AI_DISCONNECT_WARNING_MESSAGE = "断开后，该 AI 将从 ovOne 的已接入 AI 中移除。各世界中的相关联系人、聊天与记忆处理将在断开流程中统一执行。";
export const LINKED_AI_DISCONNECT_UNLINKED_MESSAGE = "只能断开已接入的 AI";

export type LinkedAIDisconnectCommand = Readonly<{
  readonly globalAILinkId: string;
}>;

export type LinkedAIDisconnectValidation = Readonly<{
  readonly valid: boolean;
  readonly command: LinkedAIDisconnectCommand | null;
  readonly error: string | null;
  readonly warning: string;
  readonly forbiddenMutations: readonly LinkedAIDisconnectForbiddenMutation[];
}>;

export type LinkedAIDisconnectForbiddenMutation =
  | "GlobalAIModel"
  | "GlobalAILink"
  | "ProviderConnection"
  | "WorldContact"
  | "WorldChat"
  | "WorldMemory"
  | "Reality"
  | "CustomWorld";

export type ValidateLinkedAIDisconnectInput = Readonly<{
  readonly globalAILinks: readonly Pick<GlobalAILink, "linkId" | "status">[];
}>;

export function canDisconnectLinkedAI(
  command: LinkedAIDisconnectCommand,
  input: ValidateLinkedAIDisconnectInput
): boolean {
  return input.globalAILinks.some((link) => link.linkId === command.globalAILinkId && link.status === "connected");
}

export function validateLinkedAIDisconnectCommand(
  command: LinkedAIDisconnectCommand,
  input: ValidateLinkedAIDisconnectInput
): LinkedAIDisconnectValidation {
  const valid = canDisconnectLinkedAI(command, input);
  return Object.freeze({
    valid,
    command: valid ? command : null,
    error: valid ? null : LINKED_AI_DISCONNECT_UNLINKED_MESSAGE,
    warning: LINKED_AI_DISCONNECT_WARNING_MESSAGE,
    forbiddenMutations: getForbiddenLinkedAIDisconnectMutations()
  });
}

export function getLinkedAIDisconnectWarning(): string {
  return LINKED_AI_DISCONNECT_WARNING_MESSAGE;
}

export function getForbiddenLinkedAIDisconnectMutations(): readonly LinkedAIDisconnectForbiddenMutation[] {
  return Object.freeze([
    "GlobalAIModel",
    "GlobalAILink",
    "ProviderConnection",
    "WorldContact",
    "WorldChat",
    "WorldMemory",
    "Reality",
    "CustomWorld"
  ]);
}
