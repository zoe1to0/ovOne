import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { planWorldBootstrap } from "../src/domain/index.js";
import { toWorldId } from "../src/world-domain/index.js";

describe("World Bootstrap Planner", () => {
  test("plans one private initial message per selected AI for non-empty role worlds", () => {
    const worldId = toWorldId("custom:planner-world");
    const plan = planWorldBootstrap({
      worldId,
      selectedAIContactIds: ["ai:one", "ai:two"],
      roleMode: "random-role",
      sourceType: "text"
    });

    assert.equal(plan.worldId, worldId);
    assert.equal(plan.roleMode, "random-role");
    assert.equal(plan.sourceType, "text");
    assert.deepEqual(plan.privateMessages.map((item) => item.contactId), ["ai:one", "ai:two"]);
    assert.equal(plan.privateMessages.every((item) => item.status === "planned"), true);
    assert.deepEqual(plan.groups, []);
  });

  test("plans zero private messages and zero groups for empty role worlds", () => {
    const worldId = toWorldId("custom:empty-planner-world");
    const plan = planWorldBootstrap({
      worldId,
      selectedAIContactIds: ["ai:one", "ai:two"],
      roleMode: "empty-role",
      sourceType: "text",
      groupCandidates: [{
        worldId,
        proposedGroupName: "Should Not Exist",
        memberContactIds: ["ai:one", "ai:two"],
        reason: "empty role worlds do not start active group plans",
        status: "planned"
      }]
    });

    assert.deepEqual(plan.privateMessages, []);
    assert.deepEqual(plan.groups, []);
  });

  test("does not plan groups just because many AI are selected and caps explicit group candidates at two", () => {
    const worldId = toWorldId("custom:group-planner-world");
    const noGroupPlan = planWorldBootstrap({
      worldId,
      selectedAIContactIds: ["ai:one", "ai:two", "ai:three", "ai:four"],
      roleMode: "fixed-role",
      sourceType: "official"
    });

    assert.deepEqual(noGroupPlan.groups, []);

    const cappedPlan = planWorldBootstrap({
      worldId,
      selectedAIContactIds: ["ai:one", "ai:two", "ai:three"],
      roleMode: "fixed-role",
      sourceType: "official",
      groupCandidates: [1, 2, 3].map((index) => ({
        worldId,
        proposedGroupName: `Group ${index}`,
        memberContactIds: ["ai:one", "ai:two", "ai:two"],
        reason: `candidate ${index}`,
        status: "planned" as const
      }))
    });

    assert.equal(cappedPlan.groups.length, 2);
    assert.deepEqual(cappedPlan.groups[0]?.memberContactIds, ["ai:one", "ai:two"]);
  });

  test("is deterministic and does not call LLM-like dependencies", () => {
    const worldId = toWorldId("custom:deterministic-planner-world");
    const input = {
      worldId,
      selectedAIContactIds: ["ai:one", "ai:one", "ai:two"],
      roleMode: "random-role" as const,
      sourceType: "blank"
    };

    assert.deepEqual(planWorldBootstrap(input), planWorldBootstrap(input));
    assert.deepEqual(planWorldBootstrap(input).privateMessages.map((item) => item.contactId), ["ai:one", "ai:two"]);
  });
});
