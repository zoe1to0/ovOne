import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CONTACT_DETAIL_DELETE_FRIEND_WARNING_MESSAGE,
  canDeleteFriendInCurrentWorld,
  getDeleteFriendWarning,
  validateContactDetailPreferencePatch,
  validateDeleteFriendCommand
} from "../src/domain/index.js";
import { toWorldId } from "../src/world-domain/index.js";

describe("Contacts Detail preference and delete contract", () => {
  const worldId = toWorldId("reality");
  const input = {
    worldId,
    contactActorIds: ["ai:friend"]
  };

  it("accepts only current-world contact preference fields", () => {
    const result = validateContactDetailPreferencePatch({
      worldId,
      worldContactId: "ai:friend",
      remark: "Friend",
      perceivedPersonaNotes: "Thoughtful",
      answerMode: "conversational",
      chatTone: "gentle",
      emojiPermission: true
    }, input);

    assert.equal(result.valid, true);
    assert.equal(result.patch?.remark, "Friend");
    assert.equal(result.patch?.perceivedPersonaNotes, "Thoughtful");
    assert.equal(result.patch?.answerMode, "conversational");
  });

  it("rejects world editor, global permission, provider, chat, and memory fields", () => {
    const result = validateContactDetailPreferencePatch({
      worldId,
      worldContactId: "ai:friend",
      remark: "Friend",
      perceivedPersonaNotes: "Thoughtful",
      answerMode: "qa",
      chatTone: "direct",
      emojiPermission: false,
      worldName: "Nope",
      worldview: "Nope",
      worldRoleName: "Nope",
      worldPersonaNotes: "Nope",
      weatherTimePermission: true,
      GlobalAIModel: "Nope",
      GlobalAILink: "Nope",
      ProviderConnection: "Nope",
      WorldMemory: "Nope",
      WorldChat: "Nope"
    }, input);

    assert.equal(result.valid, false);
    assert.ok(result.forbiddenFields.includes("worldName"));
    assert.ok(result.forbiddenFields.includes("worldview"));
    assert.ok(result.forbiddenFields.includes("worldRoleName"));
    assert.ok(result.forbiddenFields.includes("worldPersonaNotes"));
    assert.ok(result.forbiddenFields.includes("weatherTimePermission"));
    assert.ok(result.forbiddenFields.includes("GlobalAIModel"));
    assert.ok(result.forbiddenFields.includes("GlobalAILink"));
    assert.ok(result.forbiddenFields.includes("ProviderConnection"));
    assert.ok(result.forbiddenFields.includes("WorldMemory"));
    assert.ok(result.forbiddenFields.includes("WorldChat"));
  });

  it("validates delete friend only for the current world contact and returns the global-link warning", () => {
    const command = { worldId, worldContactId: "ai:friend" };
    const result = validateDeleteFriendCommand(command, input);

    assert.equal(result.valid, true);
    assert.equal(canDeleteFriendInCurrentWorld(command, input), true);
    assert.equal(result.warning, CONTACT_DETAIL_DELETE_FRIEND_WARNING_MESSAGE);
    assert.equal(getDeleteFriendWarning(), CONTACT_DETAIL_DELETE_FRIEND_WARNING_MESSAGE);
    assert.equal(validateDeleteFriendCommand({ worldId, worldContactId: "missing" }, input).valid, false);
    assert.equal(validateDeleteFriendCommand({ worldId: toWorldId("custom:other"), worldContactId: "ai:friend" }, input).valid, false);
  });
});
