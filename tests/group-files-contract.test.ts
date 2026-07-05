import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canAttachFileToGroup,
  canDeleteGroupFileRecord,
  canReadGroupFileInChat,
  GROUP_FILES_FILE_NAME_REQUIRED_MESSAGE,
  getGroupFileAccessScope,
  getGroupFileDeletionRules,
  getGroupFilePromptInjectionBoundary,
  getGroupFileWarnings,
  validateGroupFileRealUploadContract,
  validateGroupFileStorageRef,
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

  it("documents that upload never auto-injects file content into prompts", () => {
    const boundary = getGroupFilePromptInjectionBoundary();

    assert.equal(boundary.uploadAutoInjectsContent, false);
    assert.equal(boundary.storesPromptReadyContent, false);
    assert.equal(boundary.parsingSeparateFromUpload, true);
    assert.equal(boundary.retrievalSeparateFromUpload, true);
    assert.equal(boundary.changesAiRuntime, false);
  });
});
