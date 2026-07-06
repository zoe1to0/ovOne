import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canAttachFileToGroup,
  canDeleteGroupFile,
  canDeleteGroupFileRecord,
  canExecuteGroupFileUpload,
  canReadDeletedGroupFile,
  canReadGroupFileInChat,
  createGroupFileDeletionPlan,
  createGroupFileUploadPreflightPlan,
  GROUP_FILES_FILE_NAME_REQUIRED_MESSAGE,
  GROUP_FILES_REAL_UPLOAD_DISABLED_MESSAGE,
  getGroupFileAccessScope,
  getGroupFileDeletionBoundary,
  getGroupFileDeletionRules,
  getGroupFilePromptInjectionBoundary,
  getGroupFileUploadAuditBoundary,
  getGroupFileUploadFailureRules,
  getGroupFileWarnings,
  validateGroupFileDeletionCommand,
  validateGroupFileRealUploadContract,
  validateGroupFileStorageRef,
  validateGroupFileUploadPreflightPlan,
  validateGroupFileUploadCommand
} from "../src/domain/index.js";
import { toWorldId } from "../src/world-domain/index.js";

const worldId = toWorldId("world:demo");
const input = Object.freeze({
  worldId,
  chatIds: Object.freeze(["private:one", "group:one", "group:two"]),
  groupChatIds: Object.freeze(["group:one", "group:two"])
});

const validCommand = Object.freeze({
  worldId,
  groupChatId: "group:one",
  fileName: "brief.pdf",
  fileType: "application/pdf",
  fileSize: 1200,
  fileRef: "file:placeholder:brief",
  uploadedAt: 1,
  uploadedBy: "user" as const
});

const realUploadInput = Object.freeze({
  ...input,
  selectedGroupChatId: "group:one"
});

const validStorageRef = Object.freeze({
  provider: "local-placeholder",
  bucket: "group-files",
  key: "world-demo/group-one/brief.pdf",
  contentType: "application/pdf",
  sizeBytes: 1200,
  checksum: "sha256:placeholder",
  createdAt: 1,
  uploadedBy: "user" as const
});

const validRealUploadContract = Object.freeze({
  worldId,
  groupChatId: "group:one",
  fileId: "file:brief",
  fileName: "brief.pdf",
  lifecycleStatus: "uploaded" as const,
  storageRef: validStorageRef
});

const validStorageAdapter = Object.freeze({
  adapterId: "interface:group-files",
  methods: Object.freeze(["prepareUpload", "commitUpload", "abortUpload", "getUploadStatus"] as const),
  interfaceOnly: true,
  writesFiles: false,
  uploadsToCloud: false,
  acceptsRawBinary: false,
  storesBinaryInDomainState: false,
  storesExtractedText: false,
  storesChunks: false,
  storesEmbeddings: false,
  storesPromptReadyContent: false
});

describe("Group Files contract scaffold", () => {
  it("accepts valid group file metadata for the selected group chat", () => {
    const result = validateGroupFileUploadCommand(validCommand, input);

    assert.equal(result.valid, true);
    assert.equal(result.command?.groupChatId, "group:one");
    assert.equal(canAttachFileToGroup(validCommand, input), true);
  });

  it("accepts fileName-only metadata and rejects empty file names", () => {
    const result = validateGroupFileUploadCommand({
      worldId,
      groupChatId: "group:one",
      fileName: "notes.md"
    }, input);

    assert.equal(result.valid, true);
    assert.equal(result.command?.fileType, "");
    assert.equal(result.command?.fileSize, 0);
    assert.equal(result.command?.uploadedBy, "user");

    const empty = validateGroupFileUploadCommand({
      worldId,
      groupChatId: "group:one",
      fileName: ""
    }, input);
    assert.equal(empty.valid, false);
    assert.equal(empty.error, GROUP_FILES_FILE_NAME_REQUIRED_MESSAGE);
  });

  it("rejects private chat, cross-world, and missing chat targets", () => {
    assert.equal(validateGroupFileUploadCommand({
      ...validCommand,
      groupChatId: "private:one"
    }, input).valid, false);
    assert.equal(validateGroupFileUploadCommand({
      ...validCommand,
      worldId: toWorldId("world:other")
    }, input).valid, false);
    assert.equal(validateGroupFileUploadCommand({
      ...validCommand,
      groupChatId: "missing"
    }, input).valid, false);
  });

  it("rejects whole-world scope and runtime/message/member/rule/global mutation fields", () => {
    const result = validateGroupFileUploadCommand({
      ...validCommand,
      worldScope: true,
      privateChatId: "private:one",
      otherGroupId: "group:two",
      messages: [],
      history: [],
      actorIds: ["ai:one"],
      groupRules: {},
      memory: {},
      GlobalAIModel: {},
      GlobalAILink: {},
      ProviderConnection: {},
      systemPrompt: "inject file"
    }, input);

    assert.equal(result.valid, false);
    assert.ok(result.forbiddenFields.includes("wholeWorldScope"));
    assert.ok(result.forbiddenFields.includes("privateChatTarget"));
    assert.ok(result.forbiddenFields.includes("otherGroupTarget"));
    assert.ok(result.forbiddenFields.includes("messages"));
    assert.ok(result.forbiddenFields.includes("history"));
    assert.ok(result.forbiddenFields.includes("groupMembers"));
    assert.ok(result.forbiddenFields.includes("groupRules"));
    assert.ok(result.forbiddenFields.includes("memory"));
    assert.ok(result.forbiddenFields.includes("GlobalAIModel"));
    assert.ok(result.forbiddenFields.includes("GlobalAILink"));
    assert.ok(result.forbiddenFields.includes("ProviderConnection"));
    assert.ok(result.forbiddenFields.includes("aiRuntime"));
  });

  it("documents future AI access as selected group chat only", () => {
    const scope = getGroupFileAccessScope(validCommand);

    assert.equal(scope.worldId, worldId);
    assert.equal(scope.groupChatId, "group:one");
    assert.equal(scope.aiReadableInGroupChatOnly, true);
    assert.equal(scope.affectsPrivateChats, false);
    assert.equal(scope.affectsOtherGroups, false);
    assert.equal(scope.affectsOtherWorlds, false);
    assert.equal(scope.promptInjectionEnabled, false);
    assert.match(getGroupFileWarnings().join("\n"), /Future AI access is limited to the selected group chat only/);
  });

  it("accepts a real upload contract for the selected current-world group target", () => {
    const result = validateGroupFileRealUploadContract(validRealUploadContract, realUploadInput);

    assert.equal(result.valid, true);
    assert.equal(result.contract?.groupChatId, "group:one");
    assert.equal(result.contract?.storageRef.key, "world-demo/group-one/brief.pdf");
  });

  it("rejects private, other-group, cross-world, and whole-world real upload targets", () => {
    assert.equal(validateGroupFileRealUploadContract({
      ...validRealUploadContract,
      groupChatId: "private:one"
    }, realUploadInput).valid, false);
    assert.equal(validateGroupFileRealUploadContract({
      ...validRealUploadContract,
      groupChatId: "group:two"
    }, realUploadInput).valid, false);
    assert.equal(validateGroupFileRealUploadContract({
      ...validRealUploadContract,
      worldId: toWorldId("world:other")
    }, realUploadInput).valid, false);
    const wholeWorld = validateGroupFileRealUploadContract({
      ...validRealUploadContract,
      worldScope: true
    }, realUploadInput);
    assert.equal(wholeWorld.valid, false);
    assert.ok(wholeWorld.forbiddenFields.includes("wholeWorldScope"));
  });

  it("validates storage references without allowing binary, extracted text, chunks, embeddings, or prompt-ready content", () => {
    assert.equal(validateGroupFileStorageRef(validStorageRef).valid, true);

    const result = validateGroupFileStorageRef({
      ...validStorageRef,
      rawBinary: new Uint8Array(),
      fullExtractedText: "entire document",
      chunks: ["chunk"],
      embeddings: [[0.1]],
      promptReadyContent: "inject this",
      privateChatId: "private:one",
      worldScope: true,
      otherWorldId: "world:other"
    });

    assert.equal(result.valid, false);
    assert.ok(result.forbiddenFields.includes("rawBinary"));
    assert.ok(result.forbiddenFields.includes("fullExtractedText"));
    assert.ok(result.forbiddenFields.includes("chunks"));
    assert.ok(result.forbiddenFields.includes("embeddings"));
    assert.ok(result.forbiddenFields.includes("promptReadyContent"));
    assert.ok(result.forbiddenFields.includes("privateChatStorageScope"));
    assert.ok(result.forbiddenFields.includes("wholeWorldStorageScope"));
    assert.ok(result.forbiddenFields.includes("crossWorldStorageScope"));
  });

  it("allows future file read access only in the same group chat without retrieving content", () => {
    const sameGroup = canReadGroupFileInChat(validRealUploadContract, {
      worldId,
      chatId: "group:one",
      privateChatIds: ["private:one"]
    });
    const privateChat = canReadGroupFileInChat(validRealUploadContract, {
      worldId,
      chatId: "private:one",
      privateChatIds: ["private:one"]
    });
    const otherGroup = canReadGroupFileInChat(validRealUploadContract, {
      worldId,
      chatId: "group:two",
      privateChatIds: ["private:one"]
    });
    const otherWorld = canReadGroupFileInChat(validRealUploadContract, {
      worldId: toWorldId("world:other"),
      chatId: "group:one",
      privateChatIds: ["private:one"]
    });
    const deleted = canReadGroupFileInChat({
      ...validRealUploadContract,
      lifecycleStatus: "deleted"
    }, {
      worldId,
      chatId: "group:one",
      privateChatIds: ["private:one"]
    });

    assert.equal(sameGroup.allowed, true);
    assert.equal(sameGroup.reason, "same-group-chat");
    assert.equal(sameGroup.retrievesContent, false);
    assert.equal(sameGroup.parsesContent, false);
    assert.equal(sameGroup.createsEmbeddings, false);
    assert.equal(sameGroup.callsLlm, false);
    assert.equal(sameGroup.changesAiRuntime, false);
    assert.equal(privateChat.allowed, false);
    assert.equal(privateChat.reason, "private-chat-forbidden");
    assert.equal(otherGroup.allowed, false);
    assert.equal(otherGroup.reason, "other-group-forbidden");
    assert.equal(otherWorld.allowed, false);
    assert.equal(otherWorld.reason, "other-world-forbidden");
    assert.equal(deleted.allowed, false);
    assert.equal(deleted.reason, "deleted-file-forbidden");
  });

  it("defines deletion as selected groupChatId plus fileId only while preserving product data", () => {
    const result = canDeleteGroupFileRecord({
      worldId,
      groupChatId: "group:one",
      fileId: "file:brief"
    }, {
      ...realUploadInput,
      fileIds: ["file:brief"]
    });
    const otherGroup = canDeleteGroupFileRecord({
      worldId,
      groupChatId: "group:two",
      fileId: "file:brief"
    }, {
      ...realUploadInput,
      fileIds: ["file:brief"]
    });
    const rules = getGroupFileDeletionRules();

    assert.equal(result.valid, true);
    assert.equal(result.contract?.groupChatId, "group:one");
    assert.equal(otherGroup.valid, false);
    assert.equal(rules.scopedToGroupChatAndFile, true);
    assert.equal(rules.preservesMessagesHistory, true);
    assert.equal(rules.preservesHistoricalFileMentions, true);
    assert.equal(rules.preservesGroupMembers, true);
    assert.equal(rules.preservesGroupRules, true);
    assert.equal(rules.preservesChatAppearance, true);
    assert.equal(rules.preservesWorldContacts, true);
    assert.equal(rules.preservesPrivateChats, true);
    assert.equal(rules.preservesMemoryScopes, true);
    assert.equal(rules.preservesGlobalProviderData, true);
    assert.equal(rules.executesDeletion, false);
  });

  it("validates group file deletion commands for the selected current-world group file only", () => {
    const deletionInput = {
      ...realUploadInput,
      fileIds: ["file:brief"]
    };
    const valid = validateGroupFileDeletionCommand({
      worldId,
      groupChatId: "group:one",
      fileId: "file:brief"
    }, deletionInput);
    const privateChat = validateGroupFileDeletionCommand({
      worldId,
      groupChatId: "private:one",
      fileId: "file:brief"
    }, deletionInput);
    const crossWorld = validateGroupFileDeletionCommand({
      worldId: toWorldId("world:other"),
      groupChatId: "group:one",
      fileId: "file:brief"
    }, deletionInput);
    const wholeWorld = validateGroupFileDeletionCommand({
      worldId,
      groupChatId: "group:one",
      fileId: "file:brief",
      worldScope: true
    }, deletionInput);

    assert.equal(valid.valid, true);
    assert.equal(valid.command?.fileId, "file:brief");
    assert.equal(canDeleteGroupFile(valid.command, deletionInput), true);
    assert.equal(privateChat.valid, false);
    assert.equal(crossWorld.valid, false);
    assert.equal(wholeWorld.valid, false);
    assert.ok(wholeWorld.forbiddenFields.includes("wholeWorldScope"));
  });

  it("creates a descriptive-only deletion plan without runtime mutation", () => {
    const result = createGroupFileDeletionPlan({
      worldId,
      groupChatId: "group:one",
      fileId: "file:brief"
    }, {
      ...realUploadInput,
      fileIds: ["file:brief"]
    });
    const plan = result.plan;
    const boundary = getGroupFileDeletionBoundary();

    assert.equal(result.valid, true);
    assert.equal(plan?.descriptiveOnly, true);
    assert.equal(plan?.executesDeletion, false);
    assert.equal(plan?.deletesFileRecord, false);
    assert.equal(plan?.deletesStorageRef, false);
    assert.equal(plan?.deletesMessagesHistory, false);
    assert.equal(plan?.deletesHistoricalMentions, false);
    assert.equal(plan?.deletedFileAiReadable, false);
    assert.equal(canReadDeletedGroupFile("file:brief"), false);
    assert.equal(plan?.preservesGroupChat, true);
    assert.equal(plan?.preservesMessagesHistory, true);
    assert.equal(plan?.preservesHistoricalFileMentions, true);
    assert.equal(plan?.preservesGroupMembers, true);
    assert.equal(plan?.preservesGroupRules, true);
    assert.equal(plan?.preservesChatAppearance, true);
    assert.equal(plan?.preservesWorldContacts, true);
    assert.equal(plan?.preservesPrivateChats, true);
    assert.equal(plan?.preservesMemoryScopes, true);
    assert.equal(plan?.preservesGlobalProviderData, true);
    assert.equal(boundary.scopedToSelectedGroupChatAndFile, true);
    assert.equal(boundary.executesDeletion, false);
    assert.equal(boundary.deletesFileRecords, false);
    assert.equal(boundary.deletesStorageRefs, false);
    assert.equal(boundary.deletesHistoricalMentions, false);
    assert.equal(boundary.deletedFilesAiReadable, false);
    assert.equal(boundary.affectsPrivateChats, false);
    assert.equal(boundary.affectsOtherGroups, false);
    assert.equal(boundary.affectsOtherWorlds, false);
  });

  it("documents that upload never auto-injects file content into prompts", () => {
    const boundary = getGroupFilePromptInjectionBoundary();

    assert.equal(boundary.uploadAutoInjectsContent, false);
    assert.equal(boundary.storesPromptReadyContent, false);
    assert.equal(boundary.parsingSeparateFromUpload, true);
    assert.equal(boundary.retrievalSeparateFromUpload, true);
    assert.equal(boundary.changesAiRuntime, false);
  });

  it("creates a deterministic upload preflight plan in the required order and stops before writes", () => {
    const result = createGroupFileUploadPreflightPlan(validRealUploadContract, realUploadInput, validStorageAdapter, 12);

    assert.equal(result.valid, true);
    assert.deepEqual(result.plan?.steps, [
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
    assert.deepEqual(result.plan?.lifecyclePlan, ["metadata-only", "upload-pending"]);
    assert.equal(result.plan?.stopsBeforeRealFileWrite, true);
    assert.equal(result.plan?.executesUpload, false);
    assert.equal(result.plan?.writesFiles, false);
    assert.equal(result.plan?.storesBinaryContent, false);
    assert.equal(result.plan?.parsesFiles, false);
    assert.equal(result.plan?.retrievesFiles, false);
    assert.equal(result.plan?.injectsPromptContent, false);
    assert.equal(result.plan?.mutatesMessagesHistory, false);
    assert.equal(validateGroupFileUploadPreflightPlan(result.plan).valid, true);
  });

  it("rejects invalid upload preflight targets, scopes, metadata, storage refs, and adapters", () => {
    assert.equal(createGroupFileUploadPreflightPlan({
      ...validRealUploadContract,
      groupChatId: "private:one"
    }, realUploadInput, validStorageAdapter).errors.some((error) => error.code === "invalid-group-target"), true);
    assert.equal(createGroupFileUploadPreflightPlan({
      ...validRealUploadContract,
      worldId: toWorldId("world:other")
    }, realUploadInput, validStorageAdapter).errors.some((error) => error.code === "invalid-world-scope"), true);
    assert.equal(createGroupFileUploadPreflightPlan({
      ...validRealUploadContract,
      fileName: ""
    }, realUploadInput, validStorageAdapter).errors.some((error) => error.code === "invalid-file-metadata"), true);
    assert.equal(createGroupFileUploadPreflightPlan({
      ...validRealUploadContract,
      worldScope: true
    }, realUploadInput, validStorageAdapter).errors.some((error) => error.code === "invalid-group-target"), true);
    assert.equal(createGroupFileUploadPreflightPlan({
      ...validRealUploadContract,
      storageRef: {
        ...validStorageRef,
        rawBinary: new Uint8Array()
      }
    }, realUploadInput, validStorageAdapter).errors.some((error) => error.code === "invalid-storage-ref"), true);
    assert.equal(createGroupFileUploadPreflightPlan(validRealUploadContract, realUploadInput, {
      ...validStorageAdapter,
      writesFiles: true
    }).errors.some((error) => error.code === "invalid-storage-adapter"), true);
  });

  it("keeps the storage adapter contract interface-only", () => {
    const result = createGroupFileUploadPreflightPlan(validRealUploadContract, realUploadInput, validStorageAdapter);

    assert.equal(result.plan?.storageAdapter.interfaceOnly, true);
    assert.deepEqual(result.plan?.storageAdapter.methods, ["prepareUpload", "commitUpload", "abortUpload", "getUploadStatus"]);
    assert.equal(result.plan?.storageAdapter.writesFiles, false);
    assert.equal(result.plan?.storageAdapter.uploadsToCloud, false);
    assert.equal(result.plan?.storageAdapter.acceptsRawBinary, false);
    assert.equal(result.plan?.storageAdapter.storesBinaryInDomainState, false);
    assert.equal(result.plan?.storageAdapter.storesExtractedText, false);
    assert.equal(result.plan?.storageAdapter.storesChunks, false);
    assert.equal(result.plan?.storageAdapter.storesEmbeddings, false);
    assert.equal(result.plan?.storageAdapter.storesPromptReadyContent, false);
  });

  it("keeps upload execution disabled with the explicit product reason", () => {
    const result = createGroupFileUploadPreflightPlan(validRealUploadContract, realUploadInput, validStorageAdapter);
    const failureRules = getGroupFileUploadFailureRules();

    assert.equal(canExecuteGroupFileUpload(result.plan), false);
    assert.equal(failureRules.disabledReason, GROUP_FILES_REAL_UPLOAD_DISABLED_MESSAGE);
    assert.equal(failureRules.disabledReason, "真实群文件上传暂未开放");
    assert.equal(failureRules.realUploadEnabled, false);
    assert.equal(failureRules.executeUpload, false);
    assert.equal(failureRules.executeRollback, false);
    assert.equal(failureRules.preserveRuntimeData, true);
  });

  it("defines rollback as descriptive only and preserves runtime data", () => {
    const result = createGroupFileUploadPreflightPlan(validRealUploadContract, realUploadInput, validStorageAdapter);
    const rollback = result.plan?.rollbackPlan;

    assert.equal(rollback?.descriptiveOnly, true);
    assert.equal(rollback?.executesRollback, false);
    assert.deepEqual(rollback?.actions, [
      "remove-upload-pending-metadata-placeholder",
      "mark-file-record-as-failed",
      "discard-storage-ref-placeholder",
      "write-future-audit-failure-entry"
    ]);
    assert.equal(rollback?.preservesGroupChat, true);
    assert.equal(rollback?.preservesMessagesHistory, true);
    assert.equal(rollback?.preservesGroupMembers, true);
    assert.equal(rollback?.preservesGroupRules, true);
    assert.equal(rollback?.preservesChatAppearance, true);
    assert.equal(rollback?.preservesWorldContacts, true);
    assert.equal(rollback?.preservesPrivateChats, true);
    assert.equal(rollback?.preservesMemoryScopes, true);
    assert.equal(rollback?.preservesGlobalProviderData, true);
  });

  it("defines audit log boundaries without file content or derived retrieval data", () => {
    const result = createGroupFileUploadPreflightPlan(validRealUploadContract, realUploadInput, validStorageAdapter, 99);
    const audit = result.plan?.auditLogPlan;
    const boundary = getGroupFileUploadAuditBoundary();

    assert.equal(audit?.worldId, worldId);
    assert.equal(audit?.groupChatId, "group:one");
    assert.equal(audit?.fileId, "file:brief");
    assert.equal(audit?.fileName, "brief.pdf");
    assert.equal(audit?.lifecycleTransition, "metadata-only->upload-pending");
    assert.equal(audit?.actor, "user");
    assert.equal(audit?.timestamp, 99);
    assert.equal(audit?.resultStatus, "planned");
    assert.equal(audit?.containsRawFileContent, false);
    assert.equal(audit?.containsExtractedText, false);
    assert.equal(audit?.containsChunks, false);
    assert.equal(audit?.containsEmbeddings, false);
    assert.equal(audit?.containsPromptReadyContent, false);
    assert.equal(boundary.excludesRawFileContent, true);
    assert.equal(boundary.excludesExtractedText, true);
    assert.equal(boundary.excludesChunks, true);
    assert.equal(boundary.excludesEmbeddings, true);
    assert.equal(boundary.excludesPromptReadyContent, true);
  });
});
