import type { WorldId } from "../world-domain/index.js";

export const CHAT_SETTINGS_SAVE_UNAVAILABLE_MESSAGE = "保存暂未开放";
export const CHAT_SETTINGS_BACKGROUND_UPLOAD_UNAVAILABLE_MESSAGE = "背景图片上传暂未开放";

export type ChatSettingsPatch = Readonly<{
  readonly worldId: WorldId;
  readonly chatId: string;
  readonly backgroundImageRef: string;
  readonly backgroundColor: string;
  readonly myBubbleColor: string;
  readonly otherBubbleColor: string;
}>;

export type ChatSettingsForbiddenField =
  | "messages"
  | "history"
  | "groupMembership"
  | "groupRules"
  | "groupFiles"
  | "contactIdentity"
  | "contactPreferences"
  | "worldMetadata"
  | "worldRoleMetadata"
  | "GlobalAIModel"
  | "GlobalAILink"
  | "ProviderConnection"
  | "weatherTimePermission"
  | "UnknownField";

export type ChatSettingsValidationInput = Readonly<{
  readonly worldId: WorldId;
  readonly chatIds: readonly string[];
}>;

export type ChatSettingsPatchValidation = Readonly<{
  readonly valid: boolean;
  readonly patch: ChatSettingsPatch | null;
  readonly error: string | null;
  readonly forbiddenFields: readonly ChatSettingsForbiddenField[];
}>;

const ROOT_ALLOWED_KEYS = new Set([
  "worldId",
  "chatId",
  "backgroundImageRef",
  "backgroundColor",
  "myBubbleColor",
  "otherBubbleColor"
]);

const FORBIDDEN_KEY_MAP: Readonly<Record<string, ChatSettingsForbiddenField>> = Object.freeze({
  messages: "messages",
  message: "messages",
  history: "history",
  chatHistory: "history",
  groupMembership: "groupMembership",
  memberIds: "groupMembership",
  actorIds: "groupMembership",
  groupRules: "groupRules",
  rules: "groupRules",
  groupFiles: "groupFiles",
  files: "groupFiles",
  contactIdentity: "contactIdentity",
  identity: "contactIdentity",
  contactPreferences: "contactPreferences",
  remark: "contactPreferences",
  answerMode: "contactPreferences",
  chatTone: "contactPreferences",
  emojiPermission: "contactPreferences",
  worldMetadata: "worldMetadata",
  worldName: "worldMetadata",
  worldview: "worldMetadata",
  worldView: "worldMetadata",
  worldRoleMetadata: "worldRoleMetadata",
  worldRoleName: "worldRoleMetadata",
  worldPersonaNotes: "worldRoleMetadata",
  userWorldRole: "worldRoleMetadata",
  GlobalAIModel: "GlobalAIModel",
  GlobalAILink: "GlobalAILink",
  ProviderConnection: "ProviderConnection",
  providerConnection: "ProviderConnection",
  weatherTimePermission: "weatherTimePermission",
  weather: "weatherTimePermission",
  time: "weatherTimePermission"
});

export function validateChatSettingsPatch(
  patch: unknown,
  input: ChatSettingsValidationInput
): ChatSettingsPatchValidation {
  const forbiddenFields = getForbiddenChatSettingsFields(patch);
  const candidate = normalizeChatSettingsPatch(patch);
  const worldMatches = Boolean(candidate && candidate.worldId === input.worldId);
  const chatExists = Boolean(candidate && input.chatIds.includes(candidate.chatId));
  const valid = candidate !== null && worldMatches && chatExists && forbiddenFields.length === 0;
  return Object.freeze({
    valid,
    patch: valid ? candidate : null,
    error: valid ? null : "ChatSettings: invalid appearance patch.",
    forbiddenFields
  });
}

export function canEditChatSettings(patch: ChatSettingsPatch, input: ChatSettingsValidationInput): boolean {
  return validateChatSettingsPatch(patch, input).valid;
}

export function getChatSettingsWarnings(): readonly string[] {
  return Object.freeze([]);
}

function getForbiddenChatSettingsFields(patch: unknown): readonly ChatSettingsForbiddenField[] {
  const forbidden = new Set<ChatSettingsForbiddenField>();
  collectForbiddenFields(patch, forbidden, ROOT_ALLOWED_KEYS);
  return Object.freeze([...forbidden]);
}

function normalizeChatSettingsPatch(patch: unknown): ChatSettingsPatch | null {
  if (!isRecord(patch)) {
    return null;
  }
  const { worldId, chatId, backgroundImageRef, backgroundColor, myBubbleColor, otherBubbleColor } = patch;
  if (
    typeof worldId !== "string" ||
    typeof chatId !== "string" ||
    typeof backgroundImageRef !== "string" ||
    typeof backgroundColor !== "string" ||
    typeof myBubbleColor !== "string" ||
    typeof otherBubbleColor !== "string"
  ) {
    return null;
  }
  return Object.freeze({
    worldId: worldId as WorldId,
    chatId,
    backgroundImageRef,
    backgroundColor,
    myBubbleColor,
    otherBubbleColor
  });
}

function collectForbiddenFields(
  value: unknown,
  forbidden: Set<ChatSettingsForbiddenField>,
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
