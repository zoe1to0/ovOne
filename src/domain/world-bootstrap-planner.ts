import type { WorldId } from "../world-domain/index.js";

export type WorldBootstrapRoleMode = "random-role" | "fixed-role" | "empty-role";

export type InitialPrivateMessagePlan = Readonly<{
  readonly worldId: WorldId;
  readonly contactId: string;
  readonly reason: string;
  readonly status: "planned";
}>;

export type InitialGroupPlan = Readonly<{
  readonly worldId: WorldId;
  readonly proposedGroupName: string;
  readonly memberContactIds: readonly string[];
  readonly reason: string;
  readonly status: "planned";
}>;

export type WorldBootstrapPlan = Readonly<{
  readonly worldId: WorldId;
  readonly privateMessages: readonly InitialPrivateMessagePlan[];
  readonly groups: readonly InitialGroupPlan[];
  readonly roleMode: WorldBootstrapRoleMode;
  readonly sourceType: string;
}>;

export type WorldBootstrapPlanInput = Readonly<{
  readonly worldId: WorldId;
  readonly selectedAIContactIds: readonly string[];
  readonly roleMode: WorldBootstrapRoleMode;
  readonly sourceType: string;
  readonly groupCandidates?: readonly InitialGroupPlan[];
}>;

export function planWorldBootstrap(input: WorldBootstrapPlanInput): WorldBootstrapPlan {
  const uniqueContactIds = [...new Set(input.selectedAIContactIds)];
  const privateMessages = input.roleMode === "empty-role"
    ? []
    : uniqueContactIds.map((contactId) => Object.freeze({
      worldId: input.worldId,
      contactId,
      reason: "Initial private message is planned for an AI contact entering a non-empty-role world.",
      status: "planned" as const
    }));

  return Object.freeze({
    worldId: input.worldId,
    privateMessages: Object.freeze(privateMessages),
    groups: Object.freeze(planInitialGroups(input)),
    roleMode: input.roleMode,
    sourceType: input.sourceType
  });
}

function planInitialGroups(input: WorldBootstrapPlanInput): readonly InitialGroupPlan[] {
  if (input.roleMode === "empty-role") {
    return [];
  }

  return (input.groupCandidates ?? [])
    .filter((group) => group.worldId === input.worldId && group.memberContactIds.length > 1)
    .slice(0, 2)
    .map((group) => Object.freeze({
      worldId: group.worldId,
      proposedGroupName: group.proposedGroupName,
      memberContactIds: Object.freeze([...new Set(group.memberContactIds)]),
      reason: group.reason,
      status: "planned" as const
    }));
}
