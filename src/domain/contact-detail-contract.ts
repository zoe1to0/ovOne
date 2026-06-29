import type { WorldId } from "../world-domain/index.js";

export const CONTACT_DETAIL_DELETE_FRIEND_WARNING_MESSAGE = "删除后，该 AI 在当前世界的聊天与记忆将被清除，但不会断开全局接入。";

export type ContactDetailAnswerMode = "conversational" | "qa";
export const CONTACT_DETAIL_SAVE_SUCCESS_MESSAGE = "\u5df2\u4fdd\u5b58";

export type ContactDetailPreferencePatch = Readonly<{
  readonly worldId: WorldId;
  readonly worldContactId: string;
  readonly remark: string;
  readonly perceivedPersonaNotes: string;
  readonly answerMode: ContactDetailAnswerMode;
  readonly chatTone: string;
  readonly emojiPermission: boolean;
}>;

export type DeleteFriendCommand = Readonly<{
  readonly worldId: WorldId;
  readonly worldContactId: string;
}>;

export type ContactDetailForbiddenField =
  | "worldName"
  | "worldview"
  | "worldRoleName"
  | "worldPersonaNotes"
  | "userWorldRole"
  | "weatherTimePermission"
  | "GlobalAIModel"
  | "GlobalAILink"
  | "ProviderConnection"
  | "WorldMemory"
  | "WorldChat"
  | "OtherWorld"
  | "UnknownField";

export type ContactDetailPreferenceValidation = Readonly<{
  readonly valid: boolean;
  readonly patch: ContactDetailPreferencePatch | null;
  readonly error: string | null;
  readonly forbiddenFields: readonly ContactDetailForbiddenField[];
}>;

export type DeleteFriendValidation = Readonly<{
  readonly valid: boolean;
  readonly command: DeleteFriendCommand | null;
  readonly warning: string;
  readonly error: string | null;
}>;

export type ContactDetailValidationInput = Readonly<{
  readonly worldId: WorldId;
  readonly contactActorIds: readonly string[];
}>;

const ROOT_ALLOWED_KEYS = new Set([
  "worldId",
  "worldContactId",
  "remark",
  "perceivedPersonaNotes",
  "answerMode",
  "chatTone",
  "emojiPermission"
]);

const FORBIDDEN_KEY_MAP: Readonly<Record<string, ContactDetailForbiddenField>> = Object.freeze({
  worldName: "worldName",
  name: "worldName",
  worldview: "worldview",
  worldView: "worldview",
  worldRoleName: "worldRoleName",
  worldPersonaNotes: "worldPersonaNotes",
  userRole: "userWorldRole",
  userWorldRole: "userWorldRole",
  weather: "weatherTimePermission",
  time: "weatherTimePermission",
  weatherTimePermission: "weatherTimePermission",
  GlobalAIModel: "GlobalAIModel",
  GlobalAILink: "GlobalAILink",
  ProviderConnection: "ProviderConnection",
  providerConnection: "ProviderConnection",
  provider: "ProviderConnection",
  WorldMemory: "WorldMemory",
  memory: "WorldMemory",
  WorldChat: "WorldChat",
  chat: "WorldChat",
  otherWorld: "OtherWorld"
});

export function validateContactDetailPreferencePatch(
  patch: unknown,
  input: ContactDetailValidationInput
): ContactDetailPreferenceValidation {
  const forbiddenFields = getForbiddenContactDetailFields(patch);
  const candidate = normalizeContactDetailPreferencePatch(patch);
  const contactExists = Boolean(candidate && input.contactActorIds.includes(candidate.worldContactId));
  const worldMatches = Boolean(candidate && candidate.worldId === input.worldId);
  const valid = candidate !== null && contactExists && worldMatches && forbiddenFields.length === 0;
  return Object.freeze({
    valid,
    patch: valid ? candidate : null,
    error: valid ? null : "ContactsDetail: invalid preference patch.",
    forbiddenFields
  });
}

export function validateDeleteFriendCommand(
  command: unknown,
  input: ContactDetailValidationInput
): DeleteFriendValidation {
  const candidate = normalizeDeleteFriendCommand(command);
  const valid = Boolean(candidate && candidate.worldId === input.worldId && input.contactActorIds.includes(candidate.worldContactId));
  return Object.freeze({
    valid,
    command: valid ? candidate : null,
    warning: CONTACT_DETAIL_DELETE_FRIEND_WARNING_MESSAGE,
    error: valid ? null : "ContactsDetail: invalid delete friend command."
  });
}

export function canDeleteFriendInCurrentWorld(command: DeleteFriendCommand, input: ContactDetailValidationInput): boolean {
  return validateDeleteFriendCommand(command, input).valid;
}

export function getDeleteFriendWarning(): string {
  return CONTACT_DETAIL_DELETE_FRIEND_WARNING_MESSAGE;
}

function getForbiddenContactDetailFields(patch: unknown): readonly ContactDetailForbiddenField[] {
  const forbidden = new Set<ContactDetailForbiddenField>();
  collectForbiddenFields(patch, forbidden, ROOT_ALLOWED_KEYS);
  return Object.freeze([...forbidden]);
}

function normalizeContactDetailPreferencePatch(patch: unknown): ContactDetailPreferencePatch | null {
  if (!isRecord(patch)) {
    return null;
  }
  const { worldId, worldContactId, remark, perceivedPersonaNotes, answerMode, chatTone, emojiPermission } = patch;
  if (
    typeof worldId !== "string" ||
    typeof worldContactId !== "string" ||
    typeof remark !== "string" ||
    typeof perceivedPersonaNotes !== "string" ||
    (answerMode !== "conversational" && answerMode !== "qa") ||
    typeof chatTone !== "string" ||
    typeof emojiPermission !== "boolean"
  ) {
    return null;
  }
  return Object.freeze({
    worldId: worldId as WorldId,
    worldContactId,
    remark,
    perceivedPersonaNotes,
    answerMode,
    chatTone,
    emojiPermission
  });
}

function normalizeDeleteFriendCommand(command: unknown): DeleteFriendCommand | null {
  if (!isRecord(command)) {
    return null;
  }
  const { worldId, worldContactId } = command;
  if (typeof worldId !== "string" || typeof worldContactId !== "string") {
    return null;
  }
  return Object.freeze({
    worldId: worldId as WorldId,
    worldContactId
  });
}

function collectForbiddenFields(
  value: unknown,
  forbidden: Set<ContactDetailForbiddenField>,
  allowedKeys: ReadonlySet<string> | null
): void {
  if (!isRecord(value)) {
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    const mapped = FORBIDDEN_KEY_MAP[key];
    if (mapped) {
      forbidden.add(mapped);
    } else if (allowedKeys && !allowedKeys.has(key)) {
      forbidden.add("UnknownField");
    }
    collectForbiddenFields(child, forbidden, null);
  }
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
