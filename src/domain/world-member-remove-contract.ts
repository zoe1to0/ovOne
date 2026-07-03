import type { WorldContact, WorldScope } from "./world-model.js";
import type { WorldId } from "../world-domain/index.js";

export const WORLD_MEMBER_REMOVE_REALITY_LOCKED_MESSAGE = "现实世界不能通过世界编辑删除成员";
export const WORLD_MEMBER_REMOVE_NOT_FOUND_MESSAGE = "该 AI 不在当前世界中";
export const WORLD_MEMBER_REMOVE_WARNING_MESSAGE = "删除后，该 AI 在此世界的聊天与记忆将被清除，但不会断开全局接入。";

export type WorldRemoveMemberCommand = Readonly<{
  readonly worldId: WorldId;
  readonly actorId: string;
}>;

export type WorldRemoveMemberValidation = Readonly<{
  readonly valid: boolean;
  readonly command: WorldRemoveMemberCommand | null;
  readonly error: string | null;
  readonly warning: string;
  readonly allowedFutureMutations: readonly WorldMemberRemoveAllowedFutureMutation[];
  readonly forbiddenMutations: readonly WorldMemberRemoveForbiddenMutation[];
}>;

export type WorldMemberRemoveAllowedFutureMutation =
  | "DeleteWorldContact"
  | "DeletePrivateWorldChat"
  | "DeleteWorldMemoryScope"
  | "RemoveGroupMembershipLater";

export type WorldMemberRemoveForbiddenMutation =
  | "Reality"
  | "OtherWorld"
  | "GlobalAIModel"
  | "GlobalAILink"
  | "ProviderConnection"
  | "GroupChatDeletion"
  | "GroupMessageDeletion"
  | "OtherGroupMember";

export type ValidateWorldRemoveMemberInput = Readonly<{
  readonly world: Pick<WorldScope["world"], "type">;
  readonly contacts: readonly Pick<WorldContact, "actorId" | "kind">[];
}>;

export function canRemoveMemberFromWorld(world: Pick<WorldScope["world"], "type">): boolean {
  return world.type === "custom";
}

export function getRemoveMemberWarning(): string {
  return WORLD_MEMBER_REMOVE_WARNING_MESSAGE;
}

export function validateWorldRemoveMemberCommand(
  command: WorldRemoveMemberCommand,
  input: ValidateWorldRemoveMemberInput
): WorldRemoveMemberValidation {
  const removableContact = input.contacts.find((contact) =>
    contact.actorId === command.actorId &&
    contact.kind === "assistant"
  ) ?? null;
  const error = canRemoveMemberFromWorld(input.world)
    ? removableContact
      ? null
      : WORLD_MEMBER_REMOVE_NOT_FOUND_MESSAGE
    : WORLD_MEMBER_REMOVE_REALITY_LOCKED_MESSAGE;
  const valid = error === null;
  return Object.freeze({
    valid,
    command: valid ? command : null,
    error,
    warning: getRemoveMemberWarning(),
    allowedFutureMutations: Object.freeze([
      "DeleteWorldContact",
      "DeletePrivateWorldChat",
      "DeleteWorldMemoryScope",
      "RemoveGroupMembershipLater"
    ] satisfies WorldMemberRemoveAllowedFutureMutation[]),
    forbiddenMutations: getForbiddenWorldMemberRemoveMutations(input.world)
  });
}

export function getForbiddenWorldMemberRemoveMutations(
  world: Pick<WorldScope["world"], "type">
): readonly WorldMemberRemoveForbiddenMutation[] {
  const forbidden: WorldMemberRemoveForbiddenMutation[] = [
    "OtherWorld",
    "GlobalAIModel",
    "GlobalAILink",
    "ProviderConnection",
    "GroupChatDeletion",
    "GroupMessageDeletion",
    "OtherGroupMember"
  ];
  if (world.type === "reality") {
    forbidden.unshift("Reality");
  }
  return Object.freeze(forbidden);
}
