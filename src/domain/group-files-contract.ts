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

export type GroupFileUploadLifecycleStatus =
  | "metadata-only"
  | "upload-pending"
  | "uploaded"
  | "parse-pending"
  | "parsed"
  | "retrieval-ready"
  | "deleted"
  | "failed";

export type GroupFileStorageRef = Readonly<{
  readonly provider: string;
  readonly bucket?: string;
  readonly key?: string;
  readonly path?: string;
  readonly contentType: string;
  readonly sizeBytes: number;
  readonly checksum?: string;
  readonly hash?: string;
  readonly createdAt: number;
  readonly uploadedBy: "user";
}>;

export type GroupFileRealUploadContract = Readonly<{
  readonly worldId: WorldId;
  readonly groupChatId: string;
  readonly fileId: string;
  readonly fileName: string;
  readonly lifecycleStatus: GroupFileUploadLifecycleStatus;
  readonly storageRef: GroupFileStorageRef;
}>;

export type GroupFileDeletionContract = Readonly<{
  readonly worldId: WorldId;
  readonly groupChatId: string;
  readonly fileId: string;
}>;

export type GroupFileRetrievalAccessScope = Readonly<{
  readonly fileWorldId: WorldId;
  readonly fileGroupChatId: string;
  readonly requestWorldId: WorldId;
  readonly requestChatId: string;
  readonly allowed: boolean;
  readonly reason: "same-group-chat" | "private-chat-forbidden" | "other-group-forbidden" | "other-world-forbidden" | "deleted-file-forbidden";
  readonly retrievesContent: false;
  readonly parsesContent: false;
  readonly createsEmbeddings: false;
  readonly callsLlm: false;
  readonly changesAiRuntime: false;
}>;

export type GroupFileRealUploadValidationInput = GroupFileValidationInput & Readonly<{
  readonly selectedGroupChatId: string;
}>;

export type GroupFileDeletionValidationInput = GroupFileRealUploadValidationInput & Readonly<{
  readonly fileIds: readonly string[];
}>;

export type GroupFileStorageRefValidation = Readonly<{
  readonly valid: boolean;
  readonly storageRef: GroupFileStorageRef | null;
  readonly forbiddenFields: readonly GroupFileStorageRefForbiddenField[];
}>;

export type GroupFileRealUploadValidation = Readonly<{
  readonly valid: boolean;
  readonly contract: GroupFileRealUploadContract | null;
  readonly error: string | null;
  readonly forbiddenFields: readonly (GroupFileForbiddenField | GroupFileStorageRefForbiddenField)[];
}>;

export type GroupFileDeletionValidation = Readonly<{
  readonly valid: boolean;
  readonly contract: GroupFileDeletionContract | null;
  readonly error: string | null;
}>;

export type GroupFileStorageRefForbiddenField =
  | "rawBinary"
  | "fullExtractedText"
  | "embeddings"
  | "chunks"
  | "promptReadyContent"
  | "crossWorldStorageScope"
  | "privateChatStorageScope"
  | "wholeWorldStorageScope"
  | "UnknownField";

export type GroupFileDeletionRules = Readonly<{
  readonly scopedToGroupChatAndFile: true;
  readonly preservesGroupChat: true;
  readonly preservesMessagesHistory: true;
  readonly preservesHistoricalFileMentions: true;
  readonly preservesGroupMembers: true;
  readonly preservesGroupRules: true;
  readonly preservesChatAppearance: true;
  readonly preservesWorldContacts: true;
  readonly preservesPrivateChats: true;
  readonly preservesMemoryScopes: true;
  readonly preservesGlobalProviderData: true;
  readonly executesDeletion: false;
}>;

export type GroupFilePromptInjectionBoundary = Readonly<{
  readonly uploadAutoInjectsContent: false;
  readonly storesPromptReadyContent: false;
  readonly parsingSeparateFromUpload: true;
  readonly retrievalSeparateFromUpload: true;
  readonly changesAiRuntime: false;
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

const REAL_UPLOAD_ALLOWED_KEYS = new Set([
  "worldId",
  "groupChatId",
  "fileId",
  "fileName",
  "lifecycleStatus",
  "storageRef"
]);

const STORAGE_REF_ALLOWED_KEYS = new Set([
  "provider",
  "bucket",
  "key",
  "path",
  "contentType",
  "sizeBytes",
  "checksum",
  "hash",
  "createdAt",
  "uploadedBy"
]);

const DELETION_ALLOWED_KEYS = new Set(["worldId", "groupChatId", "fileId"]);

const LIFECYCLE_STATUSES = new Set<GroupFileUploadLifecycleStatus>([
  "metadata-only",
  "upload-pending",
  "uploaded",
  "parse-pending",
  "parsed",
  "retrieval-ready",
  "deleted",
  "failed"
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

const STORAGE_REF_FORBIDDEN_KEY_MAP: Readonly<Record<string, GroupFileStorageRefForbiddenField>> = Object.freeze({
  rawBinary: "rawBinary",
  binary: "rawBinary",
  fileBinary: "rawBinary",
  content: "rawBinary",
  fullExtractedText: "fullExtractedText",
  extractedText: "fullExtractedText",
  text: "fullExtractedText",
  embeddings: "embeddings",
  embedding: "embeddings",
  chunks: "chunks",
  chunk: "chunks",
  promptReadyContent: "promptReadyContent",
  promptContent: "promptReadyContent",
  crossWorldStorageScope: "crossWorldStorageScope",
  otherWorldId: "crossWorldStorageScope",
  privateChatStorageScope: "privateChatStorageScope",
  privateChatId: "privateChatStorageScope",
  wholeWorldStorageScope: "wholeWorldStorageScope",
  worldScope: "wholeWorldStorageScope"
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

export function validateGroupFileStorageRef(storageRef: unknown): GroupFileStorageRefValidation {
  const forbiddenFields = getForbiddenStorageRefFields(storageRef);
  const candidate = normalizeGroupFileStorageRef(storageRef);
  const valid = candidate !== null && forbiddenFields.length === 0;
  return Object.freeze({
    valid,
    storageRef: valid ? candidate : null,
    forbiddenFields
  });
}

export function validateGroupFileRealUploadContract(
  contract: unknown,
  input: GroupFileRealUploadValidationInput
): GroupFileRealUploadValidation {
  const forbiddenFields = getForbiddenGroupFileFields(contract, REAL_UPLOAD_ALLOWED_KEYS);
  const candidate = normalizeGroupFileRealUploadContract(contract);
  const storageValidation = validateGroupFileStorageRef(isRecord(contract) ? contract.storageRef : null);
  const worldMatches = Boolean(candidate && candidate.worldId === input.worldId);
  const chatExists = Boolean(candidate && input.chatIds.includes(candidate.groupChatId));
  const groupChat = Boolean(candidate && input.groupChatIds.includes(candidate.groupChatId));
  const selectedGroupChat = Boolean(candidate && candidate.groupChatId === input.selectedGroupChatId);
  const notDeleted = Boolean(candidate && candidate.lifecycleStatus !== "deleted");
  const valid =
    candidate !== null &&
    storageValidation.valid &&
    worldMatches &&
    chatExists &&
    groupChat &&
    selectedGroupChat &&
    notDeleted &&
    forbiddenFields.length === 0;
  return Object.freeze({
    valid,
    contract: valid ? candidate : null,
    error: valid ? null : "GroupFiles: invalid real upload contract.",
    forbiddenFields: Object.freeze([...forbiddenFields, ...storageValidation.forbiddenFields])
  });
}

export function getGroupFileDeletionRules(): GroupFileDeletionRules {
  return Object.freeze({
    scopedToGroupChatAndFile: true,
    preservesGroupChat: true,
    preservesMessagesHistory: true,
    preservesHistoricalFileMentions: true,
    preservesGroupMembers: true,
    preservesGroupRules: true,
    preservesChatAppearance: true,
    preservesWorldContacts: true,
    preservesPrivateChats: true,
    preservesMemoryScopes: true,
    preservesGlobalProviderData: true,
    executesDeletion: false
  });
}

export function canReadGroupFileInChat(
  file: GroupFileRealUploadContract,
  request: Readonly<{ worldId: WorldId; chatId: string; privateChatIds?: readonly string[] }>
): GroupFileRetrievalAccessScope {
  const otherWorld = request.worldId !== file.worldId;
  const deleted = file.lifecycleStatus === "deleted";
  const privateChat = Boolean(request.privateChatIds?.includes(request.chatId));
  const sameGroup = request.chatId === file.groupChatId;
  const allowed = !otherWorld && !deleted && sameGroup && !privateChat;
  return Object.freeze({
    fileWorldId: file.worldId,
    fileGroupChatId: file.groupChatId,
    requestWorldId: request.worldId,
    requestChatId: request.chatId,
    allowed,
    reason: allowed
      ? "same-group-chat"
      : deleted
        ? "deleted-file-forbidden"
        : otherWorld
          ? "other-world-forbidden"
          : privateChat
            ? "private-chat-forbidden"
            : "other-group-forbidden",
    retrievesContent: false,
    parsesContent: false,
    createsEmbeddings: false,
    callsLlm: false,
    changesAiRuntime: false
  });
}

export function canDeleteGroupFileRecord(command: unknown, input: GroupFileDeletionValidationInput): GroupFileDeletionValidation {
  const candidate = normalizeGroupFileDeletionContract(command);
  const valid = Boolean(
    candidate &&
    candidate.worldId === input.worldId &&
    candidate.groupChatId === input.selectedGroupChatId &&
    input.groupChatIds.includes(candidate.groupChatId) &&
    input.fileIds.includes(candidate.fileId)
  );
  return Object.freeze({
    valid,
    contract: valid ? candidate : null,
    error: valid ? null : "GroupFiles: invalid file deletion contract."
  });
}

export function getGroupFilePromptInjectionBoundary(): GroupFilePromptInjectionBoundary {
  return Object.freeze({
    uploadAutoInjectsContent: false,
    storesPromptReadyContent: false,
    parsingSeparateFromUpload: true,
    retrievalSeparateFromUpload: true,
    changesAiRuntime: false
  });
}

function getForbiddenGroupFileFields(
  command: unknown,
  allowedKeys: ReadonlySet<string> = ROOT_ALLOWED_KEYS
): readonly GroupFileForbiddenField[] {
  const forbidden = new Set<GroupFileForbiddenField>();
  collectForbiddenFields(command, forbidden, allowedKeys);
  return Object.freeze([...forbidden]);
}

function getForbiddenStorageRefFields(storageRef: unknown): readonly GroupFileStorageRefForbiddenField[] {
  const forbidden = new Set<GroupFileStorageRefForbiddenField>();
  collectStorageRefForbiddenFields(storageRef, forbidden, STORAGE_REF_ALLOWED_KEYS);
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

function normalizeGroupFileRealUploadContract(contract: unknown): GroupFileRealUploadContract | null {
  if (!isRecord(contract)) {
    return null;
  }
  const { worldId, groupChatId, fileId, fileName, lifecycleStatus, storageRef } = contract;
  const storageValidation = validateGroupFileStorageRef(storageRef);
  if (
    typeof worldId !== "string" ||
    typeof groupChatId !== "string" ||
    typeof fileId !== "string" ||
    typeof fileName !== "string" ||
    !LIFECYCLE_STATUSES.has(lifecycleStatus as GroupFileUploadLifecycleStatus) ||
    !storageValidation.valid ||
    !storageValidation.storageRef
  ) {
    return null;
  }
  return Object.freeze({
    worldId: worldId as WorldId,
    groupChatId,
    fileId,
    fileName,
    lifecycleStatus: lifecycleStatus as GroupFileUploadLifecycleStatus,
    storageRef: storageValidation.storageRef
  });
}

function normalizeGroupFileStorageRef(storageRef: unknown): GroupFileStorageRef | null {
  if (!isRecord(storageRef)) {
    return null;
  }
  const { provider, bucket, key, path, contentType, sizeBytes, checksum, hash, createdAt, uploadedBy } = storageRef;
  if (
    typeof provider !== "string" ||
    (bucket !== undefined && typeof bucket !== "string") ||
    (key !== undefined && typeof key !== "string") ||
    (path !== undefined && typeof path !== "string") ||
    typeof contentType !== "string" ||
    typeof sizeBytes !== "number" ||
    (checksum !== undefined && typeof checksum !== "string") ||
    (hash !== undefined && typeof hash !== "string") ||
    typeof createdAt !== "number" ||
    uploadedBy !== "user"
  ) {
    return null;
  }
  return Object.freeze({
    provider,
    ...(bucket !== undefined ? { bucket } : {}),
    ...(key !== undefined ? { key } : {}),
    ...(path !== undefined ? { path } : {}),
    contentType,
    sizeBytes,
    ...(checksum !== undefined ? { checksum } : {}),
    ...(hash !== undefined ? { hash } : {}),
    createdAt,
    uploadedBy
  });
}

function normalizeGroupFileDeletionContract(command: unknown): GroupFileDeletionContract | null {
  if (!isRecord(command)) {
    return null;
  }
  const forbiddenFields = getForbiddenGroupFileFields(command, DELETION_ALLOWED_KEYS);
  const { worldId, groupChatId, fileId } = command;
  if (
    forbiddenFields.length > 0 ||
    typeof worldId !== "string" ||
    typeof groupChatId !== "string" ||
    typeof fileId !== "string"
  ) {
    return null;
  }
  return Object.freeze({
    worldId: worldId as WorldId,
    groupChatId,
    fileId
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

function collectStorageRefForbiddenFields(
  value: unknown,
  forbidden: Set<GroupFileStorageRefForbiddenField>,
  allowedKeys: ReadonlySet<string> | null
): void {
  if (!isRecord(value)) {
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    const mapped = STORAGE_REF_FORBIDDEN_KEY_MAP[key];
    if (mapped) {
      forbidden.add(mapped);
    } else if (allowedKeys && !allowedKeys.has(key)) {
      forbidden.add("UnknownField");
    }
    collectStorageRefForbiddenFields(child, forbidden, null);
  }
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
