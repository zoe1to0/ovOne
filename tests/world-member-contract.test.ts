import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  WORLD_MEMBER_ALREADY_EXISTS_MESSAGE,
  WORLD_MEMBER_REALITY_LOCKED_MESSAGE,
  WORLD_MEMBER_UNLINKED_AI_MESSAGE,
  canAddMemberToWorld,
  resolveAddMemberCandidates,
  validateWorldAddMemberCommand
} from "../src/domain/index.js";
import type { GlobalAILink, GlobalAIModel, WorldContact, WorldScope } from "../src/domain/index.js";
import { toWorldId } from "../src/world-domain/index.js";

describe("World Editor add-member contract", () => {
  it("resolves linked AI candidates that are not already in a custom world", () => {
    const candidates = resolveAddMemberCandidates(createInput("custom"));

    assert.deepEqual(candidates.map((candidate) => candidate.globalAIModelId), ["model:qa"]);
    assert.equal(candidates[0]?.displayName, "QA Model");
  });

  it("excludes AI already present in the selected custom world", () => {
    const candidates = resolveAddMemberCandidates(createInput("custom"));

    assert.equal(candidates.some((candidate) => candidate.globalAIModelId === "model:dialogue"), false);
  });

  it("prevents Reality from using World Editor add member", () => {
    const input = createInput("reality");

    assert.equal(canAddMemberToWorld(input.world), false);
    assert.deepEqual(resolveAddMemberCandidates(input), []);
    assert.equal(
      validateWorldAddMemberCommand({ worldId: realityWorldId, globalAILinkId: "link:qa" }, input).error,
      WORLD_MEMBER_REALITY_LOCKED_MESSAGE
    );
  });

  it("rejects unlinked AI", () => {
    const result = validateWorldAddMemberCommand(
      { worldId: customWorldId, globalAILinkId: "link:missing" },
      createInput("custom")
    );

    assert.equal(result.valid, false);
    assert.equal(result.command, null);
    assert.equal(result.error, WORLD_MEMBER_UNLINKED_AI_MESSAGE);
  });

  it("rejects AI already in the world", () => {
    const result = validateWorldAddMemberCommand(
      { worldId: customWorldId, globalAILinkId: "link:dialogue" },
      createInput("custom")
    );

    assert.equal(result.valid, false);
    assert.equal(result.command, null);
    assert.equal(result.error, WORLD_MEMBER_ALREADY_EXISTS_MESSAGE);
  });

  it("documents future allowed mutations and current forbidden mutations", () => {
    const result = validateWorldAddMemberCommand(
      { worldId: customWorldId, globalAILinkId: "link:qa" },
      createInput("custom")
    );

    assert.equal(result.valid, true);
    assert.deepEqual(result.allowedFutureMutations, ["WorldContact", "WorldChat", "WorldMemoryScope"]);
    assert.deepEqual(result.forbiddenMutations, [
      "OtherWorld",
      "ExistingWorldContact",
      "ExistingWorldChat",
      "ExistingWorldMemory",
      "GlobalAIModel",
      "GlobalAILink",
      "GroupChat",
      "ProviderConnection"
    ]);
  });
});

const customWorldId = toWorldId("custom:studio");
const realityWorldId = toWorldId("reality");

function createInput(worldType: "custom" | "reality") {
  const globalAIModels: readonly GlobalAIModel[] = [
    { modelId: "model:dialogue", displayName: "Dialogue Model" },
    { modelId: "model:qa", displayName: "QA Model" },
    { modelId: "model:offline", displayName: "Offline Model" }
  ];
  const globalAILinks: readonly GlobalAILink[] = [
    { linkId: "link:dialogue", modelId: "model:dialogue", connectedAt: 1, status: "connected" },
    { linkId: "link:qa", modelId: "model:qa", connectedAt: 2, status: "connected" },
    { linkId: "link:offline", modelId: "model:offline", connectedAt: 3, status: "disconnected" }
  ];
  const contacts: readonly Pick<WorldContact, "baseModelId">[] = [
    { baseModelId: "model:dialogue" }
  ];
  const world: Pick<WorldScope["world"], "type"> = { type: worldType };
  return { world, contacts, globalAIModels, globalAILinks };
}
