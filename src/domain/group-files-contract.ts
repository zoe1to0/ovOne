import type { WorldId } from "../world-domain/index.js";

export const GROUP_FILES_EMPTY_MESSAGE = "暂无群文件";
export const GROUP_FILES_UPLOAD_UNAVAILABLE_MESSAGE = "群文件上传暂未开放";
export const GROUP_FILES_FILE_NAME_REQUIRED_MESSAGE = "请输入文件名";
export const GROUP_FILES_METADATA_ADD_SUCCESS_MESSAGE = "已添加群文件记录";

export type GroupFileRecord = Readonly<{
  readonly worldId: WorldId;
  readonly groupChatId: string;
  readonly fileName: string;
  readonly fileType: string;
  readonly fileSize: number;
  readonly fileRef: string;
  readonly uploadedAt: number;
  readonly uploadedBy: "user";
}>;

export type GroupFileUploadCommand = Readonly<{
  readonly worldId: WorldId;
  readonly groupChatId: string;
  readonly fileName: string;
  readonly fileType?: string;
  readonly fileSize?: number;
  readonly fileRef?: string;
  readonly uploadedAt?: number;
  readonly uploadedBy?: "user";
}>;

export type GroupFileForbiddenField =
  | "privateChatTarget"
  | "otherGroupTarget"
  | "wholeWorldScope"
  | "messages"
  | "history"
  | "groupMembers"
  | "groupRules"
  | "memory"
  | "GlobalAIModel"
  | "GlobalAILink"
  | "ProviderConnection"
  | "aiRuntime"
  | "UnknownField";

export type GroupFileValidationInput = Readonly<{
  readonly worldId: WorldId;
  readonly chatIds: readonly string[];
  readonly groupChatIds: readonly string[];
}>;

export type GroupFileUploadValidation = Readonly<{
  readonly valid: boolean;
  readonly command: GroupFileUploadCommand | null;
  readonly error: string | null;
  readonly forbiddenFields: readonly GroupFileForbiddenField[];
}>;

export type GroupFileAccessScope = Readonly<{
  readonly worldId: WorldId;
  readonly groupChatId: string;
  readonly aiReadableInGroupChatOnly: true;
  readonly affectsPrivateChats: false;
  readonly affectsOtherGroups: false;
  readonly affectsOtherWorlds: false;
  readonly promptInjectionEnabled: false;
}>;

const ROOT_ALLOWED_KEYS = new Set([
  "worldId",
  "groupChatId",
  "fileName",
  "fileType",
  "fileSize",
  "fileRef",
  "uploadedAt",
  "uploadedBy"
]);

const FORBIDDEN_KEY_MAP: Readonly<Record<string, GroupFileForbiddenField>> = Object.freeze({
  privateChatId: "privateChatTarget",
  privateChatTarget: "privateChatTarget",
  otherGroupId: "otherGroupTarget",
  otherGroupTarget: "otherGroupTarget",
  worldScope: "wholeWorldScope",
  wholeWorldScope: "wholeWorldScope",
  messages: "messages",
  message: "messages",
  history: "history",
  chatHistory: "history",
  groupMembers: "groupMembers",
  actorIds: "groupMembers",
  memberIds: "groupMembers",
  groupRules: "groupRules",
  rulesText: "groupRules",
  memory: "memory",
  memoryScope: "memory",
  GlobalAIModel: "GlobalAIModel",
  GlobalAILink: "GlobalAILink",
  ProviderConnection: "ProviderConnection",
  providerConnection: "ProviderConnection",
  aiRuntime: "aiRuntime",
  prompt: "aiRuntime",
  systemPrompt: "aiRuntime",
  retrieval: "aiRuntime"
});

export function validateGroupFileUploadCommand(
  command: unknown,
  input: GroupFileValidationInput
): GroupFileUploadValidation {
  const forbiddenFields = getForbiddenGroupFileFields(command);
  const candidate = normalizeGroupFileUploadCommand(command);
  const worldMatches = Boolean(candidate && candidate.worldId === input.worldId);
  const chatExists = Boolean(candidate && input.chatIds.includes(candidate.groupChatId));
  const groupChat = Boolean(candidate && input.groupChatIds.includes(candidate.groupChatId));
  const hasFileName = Boolean(candidate && candidate.fileName.trim());
  const valid = candidate !== null && hasFileName && worldMatches && chatExists && groupChat && forbiddenFields.length === 0;
  return Object.freeze({
    valid,
    command: valid ? candidate : null,
    error: valid ? null : candidate && !hasFileName ? GROUP_FILES_FILE_NAME_REQUIRED_MESSAGE : "GroupFiles: invalid file upload command.",
    forbiddenFields
  });
}

export function canAttachFileToGroup(command: GroupFileUploadCommand, input: GroupFileValidationInput): boolean {
  return validateGroupFileUploadCommand(command, input).valid;
}

export function getGroupFileAccessScope(command: GroupFileUploadCommand): GroupFileAccessScope {
  return Object.freeze({
    worldId: command.worldId,
    groupChatId: command.groupChatId,
    aiReadableInGroupChatOnly: true,
    affectsPrivateChats: false,
    affectsOtherGroups: false,
    affectsOtherWorlds: false,
    promptInjectionEnabled: false
  });
}

export function getGroupFileWarnings(): readonly string[] {
  return Object.freeze([
    "Group files store metadata-only records; binary upload, parsing, retrieval, deletion, and prompt injection remain unavailable.",
    "Future AI access is limited to the selected group chat only."
  ]);
}

function getForbiddenGroupFileFields(command: unknown): readonly GroupFileForbiddenField[] {
  const forbidden = new Set<GroupFileForbiddenField>();
  collectForbiddenFields(command, forbidden, ROOT_ALLOWED_KEYS);
  return Object.freeze([...forbidden]);
}

function normalizeGroupFileUploadCommand(command: unknown): GroupFileUploadCommand | null {
  if (!isRecord(command)) {
    return null;
  }
  const { worldId, groupChatId, fileName, fileType, fileSize, fileRef, uploadedAt, uploadedBy } = command;
  if (
    typeof worldId !== "string" ||
    typeof groupChatId !== "string" ||
    typeof fileName !== "string" ||
    (fileType !== undefined && typeof fileType !== "string") ||
    (fileSize !== undefined && typeof fileSize !== "number") ||
    (fileRef !== undefined && typeof fileRef !== "string") ||
    (uploadedAt !== undefined && typeof uploadedAt !== "number") ||
    (uploadedBy !== undefined && uploadedBy !== "user")
  ) {
    return null;
  }
  return Object.freeze({
    worldId: worldId as WorldId,
    groupChatId,
    fileName,
    fileType: fileType ?? "",
    fileSize: fileSize ?? 0,
    fileRef: fileRef ?? `group-file:${groupChatId}:${fileName}`,
    uploadedAt: uploadedAt ?? 0,
    uploadedBy: uploadedBy ?? "user"
  });
}

function collectForbiddenFields(
  value: unknown,
  forbidden: Set<GroupFileForbiddenField>,
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
