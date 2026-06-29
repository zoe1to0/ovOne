import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  WORLD_ROLE_EDITOR_REALITY_LOCKED_MESSAGE,
  canEditWorldRoles,
  getForbiddenWorldRoleEditorFields,
  getWorldRoleEditorWarnings,
  validateWorldRoleEditorPatch
} from "../src/domain/index.js";
import { toWorldId } from "../src/world-domain/index.js";

describe("World Editor role/member save contract", () => {
  it("accepts custom world user role name and identity notes", () => {
    const result = validateWorldRoleEditorPatch({
      worldId: toWorldId("custom:studio"),
      userRole: {
        roleName: "Traveler",
        personaNotes: "New arrival"
      },
      memberRoles: []
    }, { worldType: "custom" });

    assert.equal(result.valid, true);
    assert.equal(result.patch?.userRole.roleName, "Traveler");
    assert.equal(result.patch?.userRole.personaNotes, "New arrival");
  });

  it("accepts custom world AI member role and background notes", () => {
    const result = validateWorldRoleEditorPatch({
      worldId: toWorldId("custom:studio"),
      userRole: {
        roleName: "Traveler",
        personaNotes: "New arrival"
      },
      memberRoles: [
        {
          worldContactId: "ai:friend",
          worldRoleName: "Guide",
          worldPersonaNotes: "Knows the city"
        }
      ]
    }, { worldType: "custom" });

    assert.equal(result.valid, true);
    assert.equal(result.patch?.memberRoles[0]?.worldContactId, "ai:friend");
    assert.equal(result.patch?.memberRoles[0]?.worldRoleName, "Guide");
    assert.equal(result.patch?.memberRoles[0]?.worldPersonaNotes, "Knows the city");
  });

  it("allows empty role fields so world/create defaults can apply later", () => {
    const result = validateWorldRoleEditorPatch({
      worldId: toWorldId("custom:blank"),
      userRole: {
        roleName: "",
        personaNotes: ""
      },
      memberRoles: [
        {
          worldContactId: "ai:friend",
          worldRoleName: "",
          worldPersonaNotes: ""
        }
      ]
    }, { worldType: "custom" });

    assert.equal(result.valid, true);
    assert.equal(result.patch?.userRole.roleName, "");
    assert.equal(result.patch?.memberRoles[0]?.worldRoleName, "");
  });

  it("rejects Reality role/member patches", () => {
    const result = validateWorldRoleEditorPatch({
      worldId: toWorldId("reality"),
      userRole: {
        roleName: "Someone",
        personaNotes: "Changed"
      },
      memberRoles: []
    }, { worldType: "reality" });

    assert.equal(canEditWorldRoles({ worldType: "reality" }), false);
    assert.equal(result.valid, false);
    assert.equal(result.patch, null);
    assert.equal(result.error, WORLD_ROLE_EDITOR_REALITY_LOCKED_MESSAGE);
    assert.ok(result.forbiddenFields.includes("Reality"));
  });

  it("rejects contact preference and global permission fields", () => {
    const patch = {
      worldId: toWorldId("custom:studio"),
      userRole: {
        roleName: "Traveler",
        personaNotes: "New arrival",
        nickname: "Not allowed",
        answerMode: "QA",
        chatTone: "gentle",
        emojiPermission: true,
        weatherTimePermission: false
      },
      memberRoles: [
        {
          worldContactId: "ai:friend",
          worldRoleName: "Guide",
          worldPersonaNotes: "Knows the city",
          remark: "Not allowed",
          relationshipPerception: "Not allowed"
        }
      ]
    };

    const result = validateWorldRoleEditorPatch(patch, { worldType: "custom" });

    assert.equal(result.valid, false);
    assert.equal(result.patch, null);
    assert.ok(result.forbiddenFields.includes("contactNickname"));
    assert.ok(result.forbiddenFields.includes("remark"));
    assert.ok(result.forbiddenFields.includes("relationshipPerception"));
    assert.ok(result.forbiddenFields.includes("answerMode"));
    assert.ok(result.forbiddenFields.includes("chatTone"));
    assert.ok(result.forbiddenFields.includes("emojiPermission"));
    assert.ok(result.forbiddenFields.includes("weatherTimePermission"));
  });

  it("documents forbidden runtime/global mutation targets", () => {
    const forbidden = getForbiddenWorldRoleEditorFields({
      worldId: toWorldId("custom:studio"),
      userRole: {
        roleName: "",
        personaNotes: ""
      },
      memberRoles: [],
      GlobalAIModel: "not allowed",
      GlobalAILink: "not allowed",
      WorldChat: "not allowed",
      WorldMemory: "not allowed",
      unapprovedField: "not allowed"
    }, { worldType: "custom" });

    assert.ok(forbidden.includes("GlobalAIModel"));
    assert.ok(forbidden.includes("GlobalAILink"));
    assert.ok(forbidden.includes("WorldChat"));
    assert.ok(forbidden.includes("WorldMemory"));
    assert.ok(forbidden.includes("UnknownField"));
  });

  it("returns a Reality warning but no custom world warnings", () => {
    assert.deepEqual(getWorldRoleEditorWarnings({ worldType: "custom" }), []);
    assert.deepEqual(getWorldRoleEditorWarnings({ worldType: "reality" }), [
      WORLD_ROLE_EDITOR_REALITY_LOCKED_MESSAGE
    ]);
  });
});
