import type { WorldId } from "../world-domain/index.js";

export const GROUP_FILES_REAL_UPLOAD_DISABLED_MESSAGE = "真实群文件上传暂未开放";

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

export type GroupFileDeletionCommand = Readonly<{
  readonly worldId: WorldId;
  readonly groupChatId: string;
  readonly fileId: string;
}>;

export type GroupFileDeletionContract = GroupFileDeletionCommand;

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
  readonly forbiddenFields?: readonly GroupFileForbiddenField[];
}>;

export type GroupFileDeletionPlan = Readonly<{
  readonly worldId: WorldId;
  readonly groupChatId: string;
  readonly fileId: string;
  readonly descriptiveOnly: true;
  readonly executesDeletion: false;
  readonly deletesFileRecord: false;
  readonly deletesStorageRef: false;
  readonly deletesMessagesHistory: false;
  readonly deletesHistoricalMentions: false;
  readonly affectsPrivateChats: false;
  readonly affectsOtherGroups: false;
  readonly affectsOtherWorlds: false;
  readonly deletedFileAiReadable: false;
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
}>;

export type GroupFileDeletionResult = Readonly<{
  readonly valid: boolean;
  readonly command: GroupFileDeletionCommand | null;
  readonly plan: GroupFileDeletionPlan | null;
  readonly error: string | null;
  readonly forbiddenFields: readonly GroupFileForbiddenField[];
}>;

export type GroupFileDeletionBoundary = Readonly<{
  readonly scopedToSelectedGroupChatAndFile: true;
  readonly executesDeletion: false;
  readonly deletesFileRecords: false;
  readonly deletesStorageRefs: false;
  readonly deletesMessagesHistory: false;
  readonly deletesHistoricalMentions: false;
  readonly deletedFilesAiReadable: false;
  readonly affectsPrivateChats: false;
  readonly affectsOtherGroups: false;
  readonly affectsOtherWorlds: false;
  readonly preservesGroupChat: true;
  readonly preservesGroupMembers: true;
  readonly preservesGroupRules: true;
  readonly preservesChatAppearance: true;
  readonly preservesWorldContacts: true;
  readonly preservesPrivateChats: true;
  readonly preservesMemoryScopes: true;
  readonly preservesGlobalProviderData: true;
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

export type GroupFileUploadPreflightStep =
  | "validate-group-target"
  | "validate-current-world-scope"
  | "validate-file-metadata"
  | "validate-storage-ref-shape"
  | "validate-storage-adapter-capability"
  | "create-metadata-placeholder-plan"
  | "create-upload-pending-lifecycle-plan"
  | "create-rollback-plan"
  | "create-audit-log-plan"
  | "stop-before-real-file-write";

export type GroupFileUploadErrorCode =
  | "invalid-group-target"
  | "invalid-world-scope"
  | "invalid-file-metadata"
  | "invalid-storage-ref"
  | "invalid-storage-adapter"
  | "real-upload-disabled";

export type GroupFileUploadErrorState = Readonly<{
  readonly code: GroupFileUploadErrorCode;
  readonly message: string;
  readonly step: GroupFileUploadPreflightStep;
}>;

export type GroupFileStorageAdapterMethod =
  | "prepareUpload"
  | "commitUpload"
  | "abortUpload"
  | "getUploadStatus";

export type GroupFileStorageAdapterContract = Readonly<{
  readonly adapterId: string;
  readonly methods: readonly GroupFileStorageAdapterMethod[];
  readonly interfaceOnly: true;
  readonly writesFiles: false;
  readonly uploadsToCloud: false;
  readonly acceptsRawBinary: false;
  readonly storesBinaryInDomainState: false;
  readonly storesExtractedText: false;
  readonly storesChunks: false;
  readonly storesEmbeddings: false;
  readonly storesPromptReadyContent: false;
}>;

export type GroupFileUploadRollbackPlan = Readonly<{
  readonly descriptiveOnly: true;
  readonly executesRollback: false;
  readonly actions: readonly (
    | "remove-upload-pending-metadata-placeholder"
    | "mark-file-record-as-failed"
    | "discard-storage-ref-placeholder"
    | "write-future-audit-failure-entry"
  )[];
  readonly preservesGroupChat: true;
  readonly preservesMessagesHistory: true;
  readonly preservesGroupMembers: true;
  readonly preservesGroupRules: true;
  readonly preservesChatAppearance: true;
  readonly preservesWorldContacts: true;
  readonly preservesPrivateChats: true;
  readonly preservesMemoryScopes: true;
  readonly preservesGlobalProviderData: true;
}>;

export type GroupFileUploadAuditLogEntry = Readonly<{
  readonly worldId: WorldId;
  readonly groupChatId: string;
  readonly fileId: string;
  readonly fileName: string;
  readonly lifecycleTransition: "metadata-only->upload-pending";
  readonly actor: "user";
  readonly timestamp: number;
  readonly resultStatus: "planned";
  readonly failureReason: string | null;
  readonly containsRawFileContent: false;
  readonly containsExtractedText: false;
  readonly containsChunks: false;
  readonly containsEmbeddings: false;
  readonly containsPromptReadyContent: false;
}>;

export type GroupFileUploadAuditBoundary = Readonly<{
  readonly allowedFields: readonly ("worldId" | "groupChatId" | "fileId" | "fileName" | "lifecycleTransition" | "actor" | "timestamp" | "resultStatus" | "failureReason")[];
  readonly excludesRawFileContent: true;
  readonly excludesExtractedText: true;
  readonly excludesChunks: true;
  readonly excludesEmbeddings: true;
  readonly excludesPromptReadyContent: true;
}>;

export type GroupFileUploadPreflightPlan = Readonly<{
  readonly worldId: WorldId;
  readonly groupChatId: string;
  readonly fileId: string;
  readonly fileName: string;
  readonly steps: readonly GroupFileUploadPreflightStep[];
  readonly storageAdapter: GroupFileStorageAdapterContract;
  readonly storageRef: GroupFileStorageRef;
  readonly lifecyclePlan: readonly ["metadata-only", "upload-pending"];
  readonly rollbackPlan: GroupFileUploadRollbackPlan;
  readonly auditLogPlan: GroupFileUploadAuditLogEntry;
  readonly stopsBeforeRealFileWrite: true;
  readonly executesUpload: false;
  readonly writesFiles: false;
  readonly storesBinaryContent: false;
  readonly parsesFiles: false;
  readonly retrievesFiles: false;
  readonly injectsPromptContent: false;
  readonly mutatesMessagesHistory: false;
}>;

export type GroupFileUploadPreflightResult = Readonly<{
  readonly valid: boolean;
  readonly plan: GroupFileUploadPreflightPlan | null;
  readonly errors: readonly GroupFileUploadErrorState[];
}>;

export type GroupFileUploadFailureRules = Readonly<{
  readonly disabledReason: typeof GROUP_FILES_REAL_UPLOAD_DISABLED_MESSAGE;
  readonly realUploadEnabled: false;
  readonly executeUpload: false;
  readonly executeRollback: false;
  readonly preserveRuntimeData: true;
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

const PREFLIGHT_STEPS: readonly GroupFileUploadPreflightStep[] = Object.freeze([
  "validate-group-target",
  "validate-current-world-scope",
  "validate-file-metadata",
  "validate-storage-ref-shape",
  "validate-storage-adapter-capability",
  "create-metadata-placeholder-plan",
  "create-upload-pending-lifecycle-plan",
  "create-rollback-plan",
  "create-audit-log-plan",
  "stop-before-real-file-write"
]);

const STORAGE_ADAPTER_METHODS: readonly GroupFileStorageAdapterMethod[] = Object.freeze([
  "prepareUpload",
  "commitUpload",
  "abortUpload",
  "getUploadStatus"
]);

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
  const result = validateGroupFileDeletionCommand(command, input);
  return Object.freeze({
    valid: result.valid,
    contract: result.command,
    error: result.error,
    forbiddenFields: result.forbiddenFields
  });
}

export function validateGroupFileDeletionCommand(command: unknown, input: GroupFileDeletionValidationInput): GroupFileDeletionResult {
  const forbiddenFields = getForbiddenGroupFileFields(command, DELETION_ALLOWED_KEYS);
  const candidate = normalizeGroupFileDeletionContract(command);
  const worldMatches = Boolean(candidate && candidate.worldId === input.worldId);
  const chatExists = Boolean(candidate && input.chatIds.includes(candidate.groupChatId));
  const groupChat = Boolean(candidate && input.groupChatIds.includes(candidate.groupChatId));
  const selectedGroupChat = Boolean(candidate && candidate.groupChatId === input.selectedGroupChatId);
  const fileExists = Boolean(candidate && input.fileIds.includes(candidate.fileId));
  const valid = Boolean(candidate && worldMatches && chatExists && groupChat && selectedGroupChat && fileExists && forbiddenFields.length === 0);
  return Object.freeze({
    valid,
    command: valid ? candidate : null,
    plan: null,
    error: valid ? null : "GroupFiles: invalid file deletion command.",
    forbiddenFields
  });
}

export function createGroupFileDeletionPlan(command: unknown, input: GroupFileDeletionValidationInput): GroupFileDeletionResult {
  const validation = validateGroupFileDeletionCommand(command, input);
  if (!validation.valid || !validation.command) {
    return validation;
  }
  return Object.freeze({
    valid: true,
    command: validation.command,
    plan: Object.freeze({
      worldId: validation.command.worldId,
      groupChatId: validation.command.groupChatId,
      fileId: validation.command.fileId,
      descriptiveOnly: true,
      executesDeletion: false,
      deletesFileRecord: false,
      deletesStorageRef: false,
      deletesMessagesHistory: false,
      deletesHistoricalMentions: false,
      affectsPrivateChats: false,
      affectsOtherGroups: false,
      affectsOtherWorlds: false,
      deletedFileAiReadable: false,
      preservesGroupChat: true,
      preservesMessagesHistory: true,
      preservesHistoricalFileMentions: true,
      preservesGroupMembers: true,
      preservesGroupRules: true,
      preservesChatAppearance: true,
      preservesWorldContacts: true,
      preservesPrivateChats: true,
      preservesMemoryScopes: true,
      preservesGlobalProviderData: true
    }),
    error: null,
    forbiddenFields: Object.freeze([])
  });
}

export function canDeleteGroupFile(command: unknown, input: GroupFileDeletionValidationInput): boolean {
  return validateGroupFileDeletionCommand(command, input).valid;
}

export function canReadDeletedGroupFile(_fileId: string): false {
  return false;
}

export function getGroupFileDeletionBoundary(): GroupFileDeletionBoundary {
  return Object.freeze({
    scopedToSelectedGroupChatAndFile: true,
    executesDeletion: false,
    deletesFileRecords: false,
    deletesStorageRefs: false,
    deletesMessagesHistory: false,
    deletesHistoricalMentions: false,
    deletedFilesAiReadable: false,
    affectsPrivateChats: false,
    affectsOtherGroups: false,
    affectsOtherWorlds: false,
    preservesGroupChat: true,
    preservesGroupMembers: true,
    preservesGroupRules: true,
    preservesChatAppearance: true,
    preservesWorldContacts: true,
    preservesPrivateChats: true,
    preservesMemoryScopes: true,
    preservesGlobalProviderData: true
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

export function createGroupFileUploadPreflightPlan(
  contract: unknown,
  input: GroupFileRealUploadValidationInput,
  storageAdapter: unknown,
  timestamp = 0
): GroupFileUploadPreflightResult {
  const uploadValidation = validateGroupFileRealUploadContract(contract, input);
  const adapterErrors = validateStorageAdapterContract(storageAdapter);
  const errors: GroupFileUploadErrorState[] = [];
  const candidate = isRecord(contract) ? contract : null;
  if (!uploadValidation.valid || !uploadValidation.contract || typeof candidate?.fileName !== "string" || !candidate.fileName.trim()) {
    errors.push(...createUploadValidationErrors(candidate, input, uploadValidation));
  }
  errors.push(...adapterErrors);
  if (errors.length > 0 || !uploadValidation.contract) {
    return Object.freeze({
      valid: false,
      plan: null,
      errors: Object.freeze(errors)
    });
  }
  const adapterContract = storageAdapter as GroupFileStorageAdapterContract;
  const rollbackPlan = createGroupFileUploadRollbackPlan(uploadValidation.contract);
  const auditLogPlan = createGroupFileUploadAuditEntry(uploadValidation.contract, timestamp);
  return Object.freeze({
    valid: true,
    plan: Object.freeze({
      worldId: uploadValidation.contract.worldId,
      groupChatId: uploadValidation.contract.groupChatId,
      fileId: uploadValidation.contract.fileId,
      fileName: uploadValidation.contract.fileName,
      steps: PREFLIGHT_STEPS,
      storageAdapter: adapterContract,
      storageRef: uploadValidation.contract.storageRef,
      lifecyclePlan: Object.freeze(["metadata-only", "upload-pending"] as const),
      rollbackPlan,
      auditLogPlan,
      stopsBeforeRealFileWrite: true,
      executesUpload: false,
      writesFiles: false,
      storesBinaryContent: false,
      parsesFiles: false,
      retrievesFiles: false,
      injectsPromptContent: false,
      mutatesMessagesHistory: false
    }),
    errors: Object.freeze([])
  });
}

export function validateGroupFileUploadPreflightPlan(plan: unknown): GroupFileUploadPreflightResult {
  if (!isRecord(plan)) {
    return Object.freeze({
      valid: false,
      plan: null,
      errors: Object.freeze([createUploadError("invalid-file-metadata", "GroupFiles: invalid preflight plan.", "create-metadata-placeholder-plan")])
    });
  }
  const stepsValid = Array.isArray(plan.steps) && arraysEqual(plan.steps, PREFLIGHT_STEPS);
  const adapterErrors = validateStorageAdapterContract(plan.storageAdapter);
  const lifecycleValid =
    Array.isArray(plan.lifecyclePlan) &&
    plan.lifecyclePlan.length === 2 &&
    plan.lifecyclePlan[0] === "metadata-only" &&
    plan.lifecyclePlan[1] === "upload-pending";
  const rollbackValid = isRecord(plan.rollbackPlan) && plan.rollbackPlan.descriptiveOnly === true && plan.rollbackPlan.executesRollback === false;
  const auditValid = isRecord(plan.auditLogPlan) && plan.auditLogPlan.containsRawFileContent === false && plan.auditLogPlan.containsPromptReadyContent === false;
  const stopsBeforeWrite = plan.stopsBeforeRealFileWrite === true && plan.executesUpload === false && plan.writesFiles === false;
  const errors = [
    ...(!stepsValid ? [createUploadError("invalid-file-metadata", "GroupFiles: invalid preflight operation order.", "validate-file-metadata")] : []),
    ...adapterErrors,
    ...(!lifecycleValid ? [createUploadError("invalid-file-metadata", "GroupFiles: invalid lifecycle plan.", "create-upload-pending-lifecycle-plan")] : []),
    ...(!rollbackValid ? [createUploadError("invalid-file-metadata", "GroupFiles: invalid rollback plan.", "create-rollback-plan")] : []),
    ...(!auditValid ? [createUploadError("invalid-file-metadata", "GroupFiles: invalid audit log plan.", "create-audit-log-plan")] : []),
    ...(!stopsBeforeWrite ? [createUploadError("real-upload-disabled", GROUP_FILES_REAL_UPLOAD_DISABLED_MESSAGE, "stop-before-real-file-write")] : [])
  ];
  return Object.freeze({
    valid: errors.length === 0,
    plan: errors.length === 0 ? plan as GroupFileUploadPreflightPlan : null,
    errors: Object.freeze(errors)
  });
}

export function createGroupFileUploadRollbackPlan(_contract: Pick<GroupFileRealUploadContract, "worldId" | "groupChatId" | "fileId">): GroupFileUploadRollbackPlan {
  return Object.freeze({
    descriptiveOnly: true,
    executesRollback: false,
    actions: Object.freeze([
      "remove-upload-pending-metadata-placeholder",
      "mark-file-record-as-failed",
      "discard-storage-ref-placeholder",
      "write-future-audit-failure-entry"
    ] as const),
    preservesGroupChat: true,
    preservesMessagesHistory: true,
    preservesGroupMembers: true,
    preservesGroupRules: true,
    preservesChatAppearance: true,
    preservesWorldContacts: true,
    preservesPrivateChats: true,
    preservesMemoryScopes: true,
    preservesGlobalProviderData: true
  });
}

export function getGroupFileUploadAuditBoundary(): GroupFileUploadAuditBoundary {
  return Object.freeze({
    allowedFields: Object.freeze([
      "worldId",
      "groupChatId",
      "fileId",
      "fileName",
      "lifecycleTransition",
      "actor",
      "timestamp",
      "resultStatus",
      "failureReason"
    ] as const),
    excludesRawFileContent: true,
    excludesExtractedText: true,
    excludesChunks: true,
    excludesEmbeddings: true,
    excludesPromptReadyContent: true
  });
}

export function canExecuteGroupFileUpload(_plan: GroupFileUploadPreflightPlan | null): false {
  return false;
}

export function getGroupFileUploadFailureRules(): GroupFileUploadFailureRules {
  return Object.freeze({
    disabledReason: GROUP_FILES_REAL_UPLOAD_DISABLED_MESSAGE,
    realUploadEnabled: false,
    executeUpload: false,
    executeRollback: false,
    preserveRuntimeData: true
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

function validateStorageAdapterContract(adapter: unknown): readonly GroupFileUploadErrorState[] {
  if (!isRecord(adapter)) {
    return Object.freeze([createUploadError("invalid-storage-adapter", "GroupFiles: invalid storage adapter contract.", "validate-storage-adapter-capability")]);
  }
  const methods = Array.isArray(adapter.methods) ? adapter.methods : [];
  const methodsValid =
    methods.length === STORAGE_ADAPTER_METHODS.length &&
    STORAGE_ADAPTER_METHODS.every((method) => methods.includes(method));
  const flagsValid =
    adapter.interfaceOnly === true &&
    adapter.writesFiles === false &&
    adapter.uploadsToCloud === false &&
    adapter.acceptsRawBinary === false &&
    adapter.storesBinaryInDomainState === false &&
    adapter.storesExtractedText === false &&
    adapter.storesChunks === false &&
    adapter.storesEmbeddings === false &&
    adapter.storesPromptReadyContent === false;
  if (typeof adapter.adapterId === "string" && methodsValid && flagsValid) {
    return Object.freeze([]);
  }
  return Object.freeze([createUploadError("invalid-storage-adapter", "GroupFiles: storage adapter must be interface-only.", "validate-storage-adapter-capability")]);
}

function createUploadValidationErrors(
  candidate: Readonly<Record<string, unknown>> | null,
  input: GroupFileRealUploadValidationInput,
  validation: GroupFileRealUploadValidation
): readonly GroupFileUploadErrorState[] {
  const errors: GroupFileUploadErrorState[] = [];
  if (!candidate || typeof candidate.groupChatId !== "string" || !input.groupChatIds.includes(candidate.groupChatId)) {
    errors.push(createUploadError("invalid-group-target", "GroupFiles: upload target must be a current-world group chat.", "validate-group-target"));
  }
  if (!candidate || candidate.worldId !== input.worldId) {
    errors.push(createUploadError("invalid-world-scope", "GroupFiles: upload target must stay in the current world.", "validate-current-world-scope"));
  }
  if (!candidate || typeof candidate.fileName !== "string" || !candidate.fileName.trim() || typeof candidate.fileId !== "string") {
    errors.push(createUploadError("invalid-file-metadata", "GroupFiles: invalid file metadata.", "validate-file-metadata"));
  }
  if (validation.forbiddenFields.includes("privateChatTarget") || validation.forbiddenFields.includes("wholeWorldScope") || validation.forbiddenFields.includes("otherGroupTarget")) {
    errors.push(createUploadError("invalid-group-target", "GroupFiles: private, other-group, and whole-world file scopes are forbidden.", "validate-group-target"));
  }
  if (validation.forbiddenFields.some((field) => STORAGE_REF_FORBIDDEN_VALUES.has(field))) {
    errors.push(createUploadError("invalid-storage-ref", "GroupFiles: invalid storage reference shape.", "validate-storage-ref-shape"));
  }
  if (errors.length === 0) {
    errors.push(createUploadError("invalid-file-metadata", validation.error ?? "GroupFiles: invalid upload preflight.", "validate-file-metadata"));
  }
  return Object.freeze(errors);
}

const STORAGE_REF_FORBIDDEN_VALUES = new Set<string>([
  "rawBinary",
  "fullExtractedText",
  "embeddings",
  "chunks",
  "promptReadyContent",
  "crossWorldStorageScope",
  "privateChatStorageScope",
  "wholeWorldStorageScope"
]);

function createGroupFileUploadAuditEntry(contract: GroupFileRealUploadContract, timestamp: number): GroupFileUploadAuditLogEntry {
  return Object.freeze({
    worldId: contract.worldId,
    groupChatId: contract.groupChatId,
    fileId: contract.fileId,
    fileName: contract.fileName,
    lifecycleTransition: "metadata-only->upload-pending",
    actor: "user",
    timestamp,
    resultStatus: "planned",
    failureReason: null,
    containsRawFileContent: false,
    containsExtractedText: false,
    containsChunks: false,
    containsEmbeddings: false,
    containsPromptReadyContent: false
  });
}

function createUploadError(
  code: GroupFileUploadErrorCode,
  message: string,
  step: GroupFileUploadPreflightStep
): GroupFileUploadErrorState {
  return Object.freeze({ code, message, step });
}

function arraysEqual(left: readonly unknown[], right: readonly unknown[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
