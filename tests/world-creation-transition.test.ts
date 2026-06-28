import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createWorldCreationTransition, resolveWorldCreationIdentity } from "../src/platform/world-creation-transition.js";
import type { CreateWorldDraft } from "../src/platform/behavior-registry.js";
import { toWorldId } from "../src/world-domain/index.js";

describe("World creation welcome transition scaffold", () => {
  it("uses explicit user role names when detail scaffold provides identity", () => {
    const draft = createDraft({
      worldName: "星港",
      worldviewSourceType: "text",
      nextMode: "detailed-edit",
      detailRoleMode: "fixed-role",
      fixedRoles: [{ actorId: "user", roleName: "领航员", notes: "" }]
    });

    const identity = resolveWorldCreationIdentity(draft);
    const transition = createWorldCreationTransition({ worldId: toWorldId("custom:star-port"), draft });

    assert.equal(identity.hasIdentity, true);
    assert.equal(identity.userRoleName, "领航员");
    assert.equal(transition.loadingText, "星港 载入中…");
    assert.equal(transition.welcomeText, "你是 领航员，今天是你来到 星港 的第一天。");
    assert.equal(transition.phase, "welcome");
  });

  it("uses safe placeholder when identity exists but no generated role name exists yet", () => {
    const draft = createDraft({
      worldName: "魔法学院",
      worldviewSourceType: "official",
      nextMode: "random-role"
    });

    const identity = resolveWorldCreationIdentity(draft);
    const transition = createWorldCreationTransition({ worldId: toWorldId("custom:magic-school"), draft });

    assert.equal(identity.hasIdentity, true);
    assert.equal(identity.reason, "scaffold-placeholder");
    assert.equal(transition.welcomeText, "你是 新世界中的你，今天是你来到 魔法学院 的第一天。");
  });

  it("does not imply identity for empty role, blank world, or project isolation worlds", () => {
    for (const draft of [
      createDraft({
        worldName: "空角色世界",
        worldviewSourceType: "text",
        nextMode: "detailed-edit",
        detailRoleMode: "empty-role"
      }),
      createDraft({
        worldName: "空白世界",
        worldviewSourceType: "blank",
        nextMode: "random-role"
      }),
      createDraft({
        worldName: "项目隔离",
        worldviewSourceType: "project-document",
        nextMode: "random-role"
      })
    ]) {
      const identity = resolveWorldCreationIdentity(draft);
      const transition = createWorldCreationTransition({ worldId: toWorldId(`custom:${draft.worldName}`), draft });

      assert.equal(identity.hasIdentity, false);
      assert.equal(transition.welcomeText, `欢迎来到 ${draft.worldName}。`);
    }
  });
});

function createDraft(overrides: Partial<CreateWorldDraft>): CreateWorldDraft {
  return {
    worldName: "Test World",
    worldviewSourceType: "text",
    worldviewText: "",
    selectedAIModelIds: [],
    nextMode: "random-role",
    detailRoleMode: "random-role",
    randomRoleSlots: [],
    selectedUserRoleSlotId: null,
    fixedRoles: [],
    validationError: null,
    ...overrides
  };
}
