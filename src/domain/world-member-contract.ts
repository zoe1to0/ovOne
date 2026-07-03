import type { GlobalAILink, GlobalAIModel, WorldContact, WorldScope } from "./world-model.js";
import type { WorldId } from "../world-domain/index.js";

export const WORLD_MEMBER_REALITY_LOCKED_MESSAGE = "现实世界不能通过世界编辑添加成员";
export const WORLD_MEMBER_UNLINKED_AI_MESSAGE = "只能添加已连接的 AI";
export const WORLD_MEMBER_ALREADY_EXISTS_MESSAGE = "该 AI 已在当前世界中";

export type WorldAddMemberCommand = Readonly<{
  readonly worldId: WorldId;
  readonly globalAILinkId: string;
}>;

export type WorldAddMemberCandidate = Readonly<{
  readonly globalAILinkId: string;
  readonly globalAIModelId: string;
  readonly displayName: string;
}>;

export type WorldAddMemberValidation = Readonly<{
  readonly valid: boolean;
  readonly command: WorldAddMemberCommand | null;
  readonly error: string | null;
  readonly allowedFutureMutations: readonly WorldMemberAllowedFutureMutation[];
  readonly forbiddenMutations: readonly WorldMemberForbiddenMutation[];
}>;

export type WorldMemberAllowedFutureMutation = "WorldContact" | "WorldChat" | "WorldMemoryScope";

export type WorldMemberForbiddenMutation =
  | "Reality"
  | "OtherWorld"
  | "ExistingWorldContact"
  | "ExistingWorldChat"
  | "ExistingWorldMemory"
  | "GlobalAIModel"
  | "GlobalAILink"
  | "GroupChatDeletion"
  | "GroupMessageDeletion"
  | "ProviderConnection";

export type ResolveAddMemberCandidatesInput = Readonly<{
  readonly world: Pick<WorldScope["world"], "type">;
  readonly contacts: readonly Pick<WorldContact, "baseModelId">[];
  readonly globalAIModels: readonly GlobalAIModel[];
  readonly globalAILinks: readonly GlobalAILink[];
}>;

export function canAddMemberToWorld(world: Pick<WorldScope["world"], "type">): boolean {
  return world.type === "custom";
}

export function resolveAddMemberCandidates(input: ResolveAddMemberCandidatesInput): readonly WorldAddMemberCandidate[] {
  if (!canAddMemberToWorld(input.world)) {
    return Object.freeze([]);
  }
  const existingModelIds = new Set(input.contacts.map((contact) => contact.baseModelId));
  const modelById = new Map(input.globalAIModels.map((model) => [model.modelId, model]));
  return Object.freeze(input.globalAILinks
    .filter((link) => link.status === "connected")
    .filter((link) => !existingModelIds.has(link.modelId))
    .map((link) => Object.freeze({
      globalAILinkId: link.linkId,
      globalAIModelId: link.modelId,
      displayName: modelById.get(link.modelId)?.displayName ?? link.modelId
    })));
}

export function validateWorldAddMemberCommand(
  command: WorldAddMemberCommand,
  input: ResolveAddMemberCandidatesInput
): WorldAddMemberValidation {
  const candidate = resolveAddMemberCandidates(input).find((item) => item.globalAILinkId === command.globalAILinkId) ?? null;
  const link = input.globalAILinks.find((item) => item.linkId === command.globalAILinkId) ?? null;
  const existingModelIds = new Set(input.contacts.map((contact) => contact.baseModelId));
  const error = canAddMemberToWorld(input.world)
    ? !link || link.status !== "connected"
      ? WORLD_MEMBER_UNLINKED_AI_MESSAGE
      : existingModelIds.has(link.modelId)
        ? WORLD_MEMBER_ALREADY_EXISTS_MESSAGE
        : candidate
          ? null
          : WORLD_MEMBER_UNLINKED_AI_MESSAGE
    : WORLD_MEMBER_REALITY_LOCKED_MESSAGE;
  const valid = error === null;
  return Object.freeze({
    valid,
    command: valid ? command : null,
    error,
    allowedFutureMutations: Object.freeze(["WorldContact", "WorldChat", "WorldMemoryScope"] satisfies WorldMemberAllowedFutureMutation[]),
    forbiddenMutations: getForbiddenWorldMemberMutations(input.world)
  });
}

export function getForbiddenWorldMemberMutations(
  world: Pick<WorldScope["world"], "type">
): readonly WorldMemberForbiddenMutation[] {
  const forbidden: WorldMemberForbiddenMutation[] = [
    "OtherWorld",
    "ExistingWorldContact",
    "ExistingWorldChat",
    "ExistingWorldMemory",
    "GlobalAIModel",
    "GlobalAILink",
    "GroupChatDeletion",
    "GroupMessageDeletion",
    "ProviderConnection"
  ];
  if (world.type === "reality") {
    forbidden.unshift("Reality");
  }
  return Object.freeze(forbidden);
}
