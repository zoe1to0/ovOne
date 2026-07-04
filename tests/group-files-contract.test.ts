import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canAttachFileToGroup,
  getGroupFileAccessScope,
  getGroupFileWarnings,
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

describe("Group Files contract scaffold", () => {
  it("accepts valid group file metadata for the selected group chat", () => {
    const result = validateGroupFileUploadCommand(validCommand, input);

    assert.equal(result.valid, true);
    assert.equal(result.command?.groupChatId, "group:one");
    assert.equal(canAttachFileToGroup(validCommand, input), true);
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
});
