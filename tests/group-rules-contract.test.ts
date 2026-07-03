import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canEditGroupRules,
  getGroupRulesWarnings,
  validateGroupRulesPatch
} from "../src/domain/index.js";
import { toWorldId } from "../src/world-domain/index.js";

const worldId = toWorldId("world:demo");
const input = Object.freeze({
  worldId,
  chatIds: Object.freeze(["private:one", "group:one"]),
  groupChatIds: Object.freeze(["group:one"])
});

describe("Group Rules contract scaffold", () => {
  it("accepts group chat text rules scoped to the selected world", () => {
    const patch = {
      worldId,
      groupChatId: "group:one",
      rulesText: "Stay in character."
    };
    const result = validateGroupRulesPatch(patch, input);

    assert.equal(result.valid, true);
    assert.equal(result.patch?.groupChatId, "group:one");
    assert.equal(canEditGroupRules(patch, input), true);
    assert.deepEqual(getGroupRulesWarnings(), []);
  });

  it("allows empty rules text as no extra group rules", () => {
    const result = validateGroupRulesPatch(
      {
        worldId,
        groupChatId: "group:one",
        rulesText: ""
      },
      input
    );

    assert.equal(result.valid, true);
    assert.equal(result.patch?.rulesText, "");
  });

  it("rejects private chats and invalid world/chat pairs", () => {
    assert.equal(validateGroupRulesPatch(
      {
        worldId,
        groupChatId: "private:one",
        rulesText: "No private rules."
      },
      input
    ).valid, false);
    assert.equal(validateGroupRulesPatch(
      {
        worldId: toWorldId("world:other"),
        groupChatId: "group:one",
        rulesText: ""
      },
      input
    ).valid, false);
    assert.equal(validateGroupRulesPatch(
      {
        worldId,
        groupChatId: "missing",
        rulesText: ""
      },
      input
    ).valid, false);
  });

  it("rejects member, file, message, history, memory, contact, world, global, and AI behavior fields", () => {
    const result = validateGroupRulesPatch(
      {
        worldId,
        groupChatId: "group:one",
        rulesText: "",
        memberIds: ["ai:one"],
        groupFiles: ["notes.pdf"],
        messages: [],
        history: [],
        groupMemory: {},
        remark: "friend",
        worldview: "changed",
        GlobalAIModel: {},
        GlobalAILink: {},
        ProviderConnection: {},
        systemPrompt: "inject this"
      },
      input
    );

    assert.equal(result.valid, false);
    assert.ok(result.forbiddenFields.includes("groupMembership"));
    assert.ok(result.forbiddenFields.includes("groupFiles"));
    assert.ok(result.forbiddenFields.includes("messages"));
    assert.ok(result.forbiddenFields.includes("history"));
    assert.ok(result.forbiddenFields.includes("groupMemory"));
    assert.ok(result.forbiddenFields.includes("contactPreferences"));
    assert.ok(result.forbiddenFields.includes("worldMetadata"));
    assert.ok(result.forbiddenFields.includes("GlobalAIModel"));
    assert.ok(result.forbiddenFields.includes("GlobalAILink"));
    assert.ok(result.forbiddenFields.includes("ProviderConnection"));
    assert.ok(result.forbiddenFields.includes("aiBehavior"));
  });
});
