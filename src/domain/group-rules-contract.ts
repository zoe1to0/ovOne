import type { WorldId } from "../world-domain/index.js";

export const GROUP_RULES_SAVE_UNAVAILABLE_MESSAGE = "群规保存暂未开放";

export type GroupRulesPatch = Readonly<{
  readonly worldId: WorldId;
  readonly groupChatId: string;
  readonly rulesText: string;
}>;

export type GroupRulesForbiddenField =
  | "groupMembership"
  | "groupFiles"
  | "messages"
  | "history"
  | "groupMemory"
  | "contactPreferences"
  | "worldMetadata"
  | "GlobalAIModel"
  | "GlobalAILink"
  | "ProviderConnection"
  | "aiBehavior"
  | "UnknownField";

export type GroupRulesValidationInput = Readonly<{
  readonly worldId: WorldId;
  readonly chatIds: readonly string[];
  readonly groupChatIds: readonly string[];
}>;

export type GroupRulesPatchValidation = Readonly<{
  readonly valid: boolean;
  readonly patch: GroupRulesPatch | null;
  readonly error: string | null;
  readonly forbiddenFields: readonly GroupRulesForbiddenField[];
}>;

const ROOT_ALLOWED_KEYS = new Set(["worldId", "groupChatId", "rulesText"]);

const FORBIDDEN_KEY_MAP: Readonly<Record<string, GroupRulesForbiddenField>> = Object.freeze({
  groupMembership: "groupMembership",
  memberIds: "groupMembership",
  actorIds: "groupMembership",
  members: "groupMembership",
  groupFiles: "groupFiles",
  files: "groupFiles",
  messages: "messages",
  message: "messages",
  history: "history",
  chatHistory: "history",
  groupMemory: "groupMemory",
  memory: "groupMemory",
  memoryScope: "groupMemory",
  contactPreferences: "contactPreferences",
  remark: "contactPreferences",
  answerMode: "contactPreferences",
  chatTone: "contactPreferences",
  emojiPermission: "contactPreferences",
  worldMetadata: "worldMetadata",
  worldName: "worldMetadata",
  worldview: "worldMetadata",
  worldView: "worldMetadata",
  GlobalAIModel: "GlobalAIModel",
  GlobalAILink: "GlobalAILink",
  ProviderConnection: "ProviderConnection",
  providerConnection: "ProviderConnection",
  aiBehavior: "aiBehavior",
  prompt: "aiBehavior",
  systemPrompt: "aiBehavior",
  llmInstruction: "aiBehavior"
});

export function validateGroupRulesPatch(
  patch: unknown,
  input: GroupRulesValidationInput
): GroupRulesPatchValidation {
  const forbiddenFields = getForbiddenGroupRulesFields(patch);
  const candidate = normalizeGroupRulesPatch(patch);
  const worldMatches = Boolean(candidate && candidate.worldId === input.worldId);
  const chatExists = Boolean(candidate && input.chatIds.includes(candidate.groupChatId));
  const groupChat = Boolean(candidate && input.groupChatIds.includes(candidate.groupChatId));
  const valid = candidate !== null && worldMatches && chatExists && groupChat && forbiddenFields.length === 0;
  return Object.freeze({
    valid,
    patch: valid ? candidate : null,
    error: valid ? null : "GroupRules: invalid group rules patch.",
    forbiddenFields
  });
}

export function canEditGroupRules(patch: GroupRulesPatch, input: GroupRulesValidationInput): boolean {
  return validateGroupRulesPatch(patch, input).valid;
}

export function getGroupRulesWarnings(): readonly string[] {
  return Object.freeze([]);
}

function getForbiddenGroupRulesFields(patch: unknown): readonly GroupRulesForbiddenField[] {
  const forbidden = new Set<GroupRulesForbiddenField>();
  collectForbiddenFields(patch, forbidden, ROOT_ALLOWED_KEYS);
  return Object.freeze([...forbidden]);
}

function normalizeGroupRulesPatch(patch: unknown): GroupRulesPatch | null {
  if (!isRecord(patch)) {
    return null;
  }
  const { worldId, groupChatId, rulesText } = patch;
  if (typeof worldId !== "string" || typeof groupChatId !== "string" || typeof rulesText !== "string") {
    return null;
  }
  return Object.freeze({
    worldId: worldId as WorldId,
    groupChatId,
    rulesText
  });
}

function collectForbiddenFields(
  value: unknown,
  forbidden: Set<GroupRulesForbiddenField>,
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
