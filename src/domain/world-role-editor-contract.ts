import type { WorldId } from "../world-domain/index.js";

export const WORLD_ROLE_EDITOR_REALITY_LOCKED_MESSAGE = "现实世界不支持角色 / 成员设定编辑";

export type UserWorldRolePatch = Readonly<{
  readonly roleName: string;
  readonly personaNotes: string;
}>;

export type MemberWorldRolePatch = Readonly<{
  readonly worldContactId: string;
  readonly worldRoleName: string;
  readonly worldPersonaNotes: string;
}>;

export type WorldRoleEditorPatch = Readonly<{
  readonly worldId: WorldId;
  readonly userRole: UserWorldRolePatch;
  readonly memberRoles: readonly MemberWorldRolePatch[];
}>;

export type WorldRoleEditorForbiddenField =
  | "contactNickname"
  | "remark"
  | "relationshipPerception"
  | "answerMode"
  | "chatTone"
  | "emojiPermission"
  | "weatherTimePermission"
  | "GlobalAIModel"
  | "GlobalAILink"
  | "WorldChat"
  | "WorldMemory"
  | "UnknownField"
  | "Reality";

export type WorldRoleEditorValidation = Readonly<{
  readonly valid: boolean;
  readonly patch: WorldRoleEditorPatch | null;
  readonly error: string | null;
  readonly forbiddenFields: readonly WorldRoleEditorForbiddenField[];
}>;

export type WorldRoleEditorEditabilityInput = Readonly<{
  readonly worldType: "reality" | "custom";
}>;

const ROOT_ALLOWED_KEYS = new Set(["worldId", "userRole", "memberRoles"]);
const USER_ROLE_ALLOWED_KEYS = new Set(["roleName", "personaNotes"]);
const MEMBER_ROLE_ALLOWED_KEYS = new Set(["worldContactId", "worldRoleName", "worldPersonaNotes"]);

const FORBIDDEN_KEY_MAP: Readonly<Record<string, WorldRoleEditorForbiddenField>> = Object.freeze({
  nickname: "contactNickname",
  contactNickname: "contactNickname",
  remark: "remark",
  relationshipPerception: "relationshipPerception",
  answerMode: "answerMode",
  outputMode: "answerMode",
  chatTone: "chatTone",
  tone: "chatTone",
  emoji: "emojiPermission",
  emojiPermission: "emojiPermission",
  weather: "weatherTimePermission",
  time: "weatherTimePermission",
  weatherTimePermission: "weatherTimePermission",
  GlobalAIModel: "GlobalAIModel",
  GlobalAILink: "GlobalAILink",
  WorldChat: "WorldChat",
  WorldMemory: "WorldMemory",
  memory: "WorldMemory",
  chat: "WorldChat"
});

export function canEditWorldRoles(input: WorldRoleEditorEditabilityInput): boolean {
  return input.worldType === "custom";
}

export function validateWorldRoleEditorPatch(
  patch: unknown,
  input: WorldRoleEditorEditabilityInput
): WorldRoleEditorValidation {
  const forbiddenFields = getForbiddenWorldRoleEditorFields(patch, input);
  const candidate = normalizeWorldRoleEditorPatch(patch);
  const valid = canEditWorldRoles(input) && candidate !== null && forbiddenFields.length === 0;
  return Object.freeze({
    valid,
    patch: valid ? candidate : null,
    error: canEditWorldRoles(input) ? null : WORLD_ROLE_EDITOR_REALITY_LOCKED_MESSAGE,
    forbiddenFields
  });
}

export function getWorldRoleEditorWarnings(input: WorldRoleEditorEditabilityInput): readonly string[] {
  return canEditWorldRoles(input)
    ? Object.freeze([])
    : Object.freeze([WORLD_ROLE_EDITOR_REALITY_LOCKED_MESSAGE]);
}

export function getForbiddenWorldRoleEditorFields(
  patch: unknown,
  input: WorldRoleEditorEditabilityInput
): readonly WorldRoleEditorForbiddenField[] {
  const forbidden = new Set<WorldRoleEditorForbiddenField>();
  if (!canEditWorldRoles(input)) {
    forbidden.add("Reality");
  }
  collectForbiddenFields(patch, forbidden, ROOT_ALLOWED_KEYS);
  return Object.freeze([...forbidden]);
}

function normalizeWorldRoleEditorPatch(patch: unknown): WorldRoleEditorPatch | null {
  if (!isRecord(patch)) {
    return null;
  }
  const worldId = patch.worldId;
  const userRole = normalizeUserWorldRolePatch(patch.userRole);
  const memberRoles = Array.isArray(patch.memberRoles)
    ? patch.memberRoles.map(normalizeMemberWorldRolePatch)
    : null;
  if (typeof worldId !== "string" || userRole === null || memberRoles === null || memberRoles.some((role) => role === null)) {
    return null;
  }
  return Object.freeze({
    worldId: worldId as WorldId,
    userRole,
    memberRoles: Object.freeze(memberRoles.filter((role): role is MemberWorldRolePatch => role !== null))
  });
}

function normalizeUserWorldRolePatch(input: unknown): UserWorldRolePatch | null {
  if (!isRecord(input)) {
    return null;
  }
  const roleName = input.roleName;
  const personaNotes = input.personaNotes;
  if (typeof roleName !== "string" || typeof personaNotes !== "string") {
    return null;
  }
  return Object.freeze({ roleName, personaNotes });
}

function normalizeMemberWorldRolePatch(input: unknown): MemberWorldRolePatch | null {
  if (!isRecord(input)) {
    return null;
  }
  const worldContactId = input.worldContactId;
  const worldRoleName = input.worldRoleName;
  const worldPersonaNotes = input.worldPersonaNotes;
  if (typeof worldContactId !== "string" || typeof worldRoleName !== "string" || typeof worldPersonaNotes !== "string") {
    return null;
  }
  return Object.freeze({ worldContactId, worldRoleName, worldPersonaNotes });
}

function collectForbiddenFields(
  value: unknown,
  forbidden: Set<WorldRoleEditorForbiddenField>,
  allowedKeys: ReadonlySet<string> | null
): void {
  if (!isRecord(value)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        collectForbiddenFields(item, forbidden, MEMBER_ROLE_ALLOWED_KEYS);
      }
    }
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    const mapped = FORBIDDEN_KEY_MAP[key];
    if (mapped) {
      forbidden.add(mapped);
    } else if (allowedKeys && !allowedKeys.has(key)) {
      forbidden.add("UnknownField");
    }
    if (key === "userRole") {
      collectForbiddenFields(child, forbidden, USER_ROLE_ALLOWED_KEYS);
    } else if (key === "memberRoles") {
      collectForbiddenFields(child, forbidden, MEMBER_ROLE_ALLOWED_KEYS);
    } else {
      collectForbiddenFields(child, forbidden, null);
    }
  }
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
