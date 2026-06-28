import type { WorldId } from "../world-domain/index.js";
import type { CreateWorldDraft, WorldCreationTransition } from "./behavior-registry.js";

export type WorldCreationIdentityResolution = Readonly<{
  readonly hasIdentity: boolean;
  readonly userRoleName: string | null;
  readonly reason: "empty-role" | "blank-world" | "project-isolation" | "explicit-user-role" | "scaffold-placeholder";
}>;

export function createWorldCreationTransition(input: Readonly<{
  readonly worldId: WorldId;
  readonly draft: CreateWorldDraft;
}>): WorldCreationTransition {
  const worldName = input.draft.worldName.trim();
  const identity = resolveWorldCreationIdentity(input.draft);
  const welcomeText = identity.hasIdentity
    ? `你是 ${identity.userRoleName ?? "新世界中的你"}，今天是你来到 ${worldName} 的第一天。`
    : `欢迎来到 ${worldName}。`;

  return Object.freeze({
    worldId: input.worldId,
    worldName,
    phase: "welcome" as const,
    loadingText: `${worldName} 载入中…`,
    welcomeText
  });
}

export function resolveWorldCreationIdentity(draft: CreateWorldDraft): WorldCreationIdentityResolution {
  if (draft.nextMode === "detailed-edit" && draft.detailRoleMode === "empty-role") {
    return Object.freeze({
      hasIdentity: false,
      userRoleName: null,
      reason: "empty-role" as const
    });
  }

  if (draft.worldviewSourceType === "blank") {
    return Object.freeze({
      hasIdentity: false,
      userRoleName: null,
      reason: "blank-world" as const
    });
  }

  if (draft.worldviewSourceType === "project-document") {
    return Object.freeze({
      hasIdentity: false,
      userRoleName: null,
      reason: "project-isolation" as const
    });
  }

  const explicitUserRoleName = resolveExplicitUserRoleName(draft);
  if (explicitUserRoleName) {
    return Object.freeze({
      hasIdentity: true,
      userRoleName: explicitUserRoleName,
      reason: "explicit-user-role" as const
    });
  }

  return Object.freeze({
    hasIdentity: true,
    userRoleName: "新世界中的你",
    reason: "scaffold-placeholder" as const
  });
}

function resolveExplicitUserRoleName(draft: CreateWorldDraft): string | null {
  if (draft.detailRoleMode === "fixed-role") {
    return draft.fixedRoles.find((role) => role.actorId === "user")?.roleName.trim() || null;
  }
  if (draft.detailRoleMode === "random-role" && draft.selectedUserRoleSlotId) {
    return draft.randomRoleSlots.find((slot) => slot.id === draft.selectedUserRoleSlotId)?.roleName.trim() || null;
  }
  return null;
}
