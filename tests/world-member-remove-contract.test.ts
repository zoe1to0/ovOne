import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  WORLD_MEMBER_REMOVE_NOT_FOUND_MESSAGE,
  WORLD_MEMBER_REMOVE_REALITY_LOCKED_MESSAGE,
  WORLD_MEMBER_REMOVE_WARNING_MESSAGE,
  canRemoveMemberFromWorld,
  getRemoveMemberWarning,
  validateWorldRemoveMemberCommand
} from "../src/domain/index.js";
import type { WorldContact, WorldScope } from "../src/domain/index.js";
import { toWorldId } from "../src/world-domain/index.js";

describe("World Editor remove-member contract", () => {
  it("allows custom worlds to open a remove-member confirmation for existing AI members", () => {
    const result = validateWorldRemoveMemberCommand(
      { worldId: toWorldId("custom:studio"), actorId: "ai:friend" },
      createInput("custom")
    );

    assert.equal(canRemoveMemberFromWorld({ type: "custom" }), true);
    assert.equal(result.valid, true);
    assert.equal(result.error, null);
    assert.deepEqual(result.command, { worldId: toWorldId("custom:studio"), actorId: "ai:friend" });
    assert.equal(result.warning, WORLD_MEMBER_REMOVE_WARNING_MESSAGE);
    assert.equal(getRemoveMemberWarning(), WORLD_MEMBER_REMOVE_WARNING_MESSAGE);
  });

  it("rejects Reality remove-member commands", () => {
    const result = validateWorldRemoveMemberCommand(
      { worldId: toWorldId("reality"), actorId: "ai:friend" },
      createInput("reality")
    );

    assert.equal(canRemoveMemberFromWorld({ type: "reality" }), false);
    assert.equal(result.valid, false);
    assert.equal(result.command, null);
    assert.equal(result.error, WORLD_MEMBER_REMOVE_REALITY_LOCKED_MESSAGE);
    assert.ok(result.forbiddenMutations.includes("Reality"));
  });

  it("rejects contacts that are not in the selected world", () => {
    const result = validateWorldRemoveMemberCommand(
      { worldId: toWorldId("custom:studio"), actorId: "ai:missing" },
      createInput("custom")
    );

    assert.equal(result.valid, false);
    assert.equal(result.command, null);
    assert.equal(result.error, WORLD_MEMBER_REMOVE_NOT_FOUND_MESSAGE);
  });

  it("documents allowed future cleanup and forbidden global mutations", () => {
    const result = validateWorldRemoveMemberCommand(
      { worldId: toWorldId("custom:studio"), actorId: "ai:friend" },
      createInput("custom")
    );

    assert.deepEqual(result.allowedFutureMutations, [
      "DeleteWorldContact",
      "DeletePrivateWorldChat",
      "DeleteWorldMemoryScope",
      "RemoveGroupMembershipLater"
    ]);
    assert.deepEqual(result.forbiddenMutations, [
      "OtherWorld",
      "GlobalAIModel",
      "GlobalAILink",
      "ProviderConnection",
      "GroupChatDeletion",
      "GroupMessageDeletion",
      "OtherGroupMember"
    ]);
  });
});

function createInput(type: WorldScope["world"]["type"]) {
  const contacts: readonly Pick<WorldContact, "actorId" | "kind">[] = [
    { actorId: "ai:friend", kind: "assistant" },
    { actorId: "user", kind: "human" }
  ];
  return {
    world: { type },
    contacts
  };
}
