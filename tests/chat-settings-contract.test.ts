import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canEditChatSettings,
  getChatSettingsWarnings,
  validateChatSettingsPatch
} from "../src/domain/index.js";
import { toWorldId } from "../src/world-domain/index.js";

const worldId = toWorldId("world:demo");
const input = Object.freeze({
  worldId,
  chatIds: Object.freeze(["private:one", "group:one"])
});

describe("Chat Settings save contract", () => {
  it("accepts private chat appearance fields only", () => {
    const result = validateChatSettingsPatch(
      {
        worldId,
        chatId: "private:one",
        backgroundImageRef: "image:bg",
        backgroundColor: "#ffffff",
        myBubbleColor: "#dcecff",
        otherBubbleColor: "#f2f2f2"
      },
      input
    );

    assert.equal(result.valid, true);
    assert.equal(result.patch?.chatId, "private:one");
    assert.deepEqual(Object.keys(result.patch ?? {}), [
      "worldId",
      "chatId",
      "backgroundImageRef",
      "backgroundColor",
      "myBubbleColor",
      "otherBubbleColor"
    ]);
  });

  it("accepts group chat appearance fields only", () => {
    const patch = {
      worldId,
      chatId: "group:one",
      backgroundImageRef: "",
      backgroundColor: "",
      myBubbleColor: "",
      otherBubbleColor: ""
    };
    const result = validateChatSettingsPatch(patch, input);

    assert.equal(result.valid, true);
    assert.equal(canEditChatSettings(patch, input), true);
    assert.deepEqual(getChatSettingsWarnings(), []);
  });

  it("allows empty fields as default appearance values", () => {
    const result = validateChatSettingsPatch(
      {
        worldId,
        chatId: "private:one",
        backgroundImageRef: "",
        backgroundColor: "",
        myBubbleColor: "",
        otherBubbleColor: ""
      },
      input
    );

    assert.equal(result.valid, true);
    assert.equal(result.patch?.backgroundColor, "");
  });

  it("rejects message and history mutation fields", () => {
    const result = validateChatSettingsPatch(
      {
        worldId,
        chatId: "private:one",
        backgroundImageRef: "",
        backgroundColor: "",
        myBubbleColor: "",
        otherBubbleColor: "",
        messages: [],
        history: []
      },
      input
    );

    assert.equal(result.valid, false);
    assert.ok(result.forbiddenFields.includes("messages"));
    assert.ok(result.forbiddenFields.includes("history"));
  });

  it("rejects group membership, rules, and files fields", () => {
    const result = validateChatSettingsPatch(
      {
        worldId,
        chatId: "group:one",
        backgroundImageRef: "",
        backgroundColor: "",
        myBubbleColor: "",
        otherBubbleColor: "",
        memberIds: ["ai:one"],
        groupRules: "be kind",
        groupFiles: ["notes.pdf"]
      },
      input
    );

    assert.equal(result.valid, false);
    assert.ok(result.forbiddenFields.includes("groupMembership"));
    assert.ok(result.forbiddenFields.includes("groupRules"));
    assert.ok(result.forbiddenFields.includes("groupFiles"));
  });

  it("rejects contact, world, global, provider, and permission fields", () => {
    const result = validateChatSettingsPatch(
      {
        worldId,
        chatId: "private:one",
        backgroundImageRef: "",
        backgroundColor: "",
        myBubbleColor: "",
        otherBubbleColor: "",
        remark: "friend",
        worldview: "changed",
        worldRoleName: "mentor",
        GlobalAIModel: {},
        GlobalAILink: {},
        ProviderConnection: {},
        weatherTimePermission: true
      },
      input
    );

    assert.equal(result.valid, false);
    assert.ok(result.forbiddenFields.includes("contactPreferences"));
    assert.ok(result.forbiddenFields.includes("worldMetadata"));
    assert.ok(result.forbiddenFields.includes("worldRoleMetadata"));
    assert.ok(result.forbiddenFields.includes("GlobalAIModel"));
    assert.ok(result.forbiddenFields.includes("GlobalAILink"));
    assert.ok(result.forbiddenFields.includes("ProviderConnection"));
    assert.ok(result.forbiddenFields.includes("weatherTimePermission"));
  });

  it("rejects invalid world or chat pairs", () => {
    assert.equal(validateChatSettingsPatch(
      {
        worldId: toWorldId("world:other"),
        chatId: "private:one",
        backgroundImageRef: "",
        backgroundColor: "",
        myBubbleColor: "",
        otherBubbleColor: ""
      },
      input
    ).valid, false);
    assert.equal(validateChatSettingsPatch(
      {
        worldId,
        chatId: "missing",
        backgroundImageRef: "",
        backgroundColor: "",
        myBubbleColor: "",
        otherBubbleColor: ""
      },
      input
    ).valid, false);
  });
});
