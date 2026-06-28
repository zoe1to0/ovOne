import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  WORLD_EDITOR_EMPTY_WORLDVIEW_WARNING,
  WORLD_EDITOR_LARGE_WORLDVIEW_CHANGE_WARNING,
  WORLD_EDITOR_NAME_REQUIRED_MESSAGE,
  canEditWorld,
  getForbiddenWorldEditorPatchFields,
  getWorldEditorWarnings,
  validateWorldEditorPatch
} from "../src/domain/index.js";
import { toWorldId } from "../src/world-domain/index.js";

describe("World Editor save contract", () => {
  it("accepts a custom world patch with non-empty name and only allowed fields", () => {
    const result = validateWorldEditorPatch(
      {
        worldId: toWorldId("custom:studio"),
        name: "Studio",
        worldview: "Quiet city"
      },
      { worldType: "custom" }
    );

    assert.equal(result.valid, true);
    assert.deepEqual(Object.keys(result.patch ?? {}), ["worldId", "name", "worldview"]);
    assert.equal(result.patch?.name, "Studio");
    assert.equal(result.patch?.worldview, "Quiet city");
  });

  it("rejects an empty custom world name", () => {
    const result = validateWorldEditorPatch(
      {
        worldId: toWorldId("custom:studio"),
        name: "   ",
        worldview: ""
      },
      { worldType: "custom" }
    );

    assert.equal(result.valid, false);
    assert.equal(result.patch, null);
    assert.equal(result.fieldErrors.name, WORLD_EDITOR_NAME_REQUIRED_MESSAGE);
  });

  it("allows empty custom worldview with a warning", () => {
    const warnings = getWorldEditorWarnings({
      locked: false,
      originalWorldview: "Quiet city",
      nextWorldview: ""
    });

    assert.ok(warnings.includes(WORLD_EDITOR_EMPTY_WORLDVIEW_WARNING));
  });

  it("shows large-change warning for changed custom worldview", () => {
    const warnings = getWorldEditorWarnings({
      locked: false,
      originalWorldview: "Quiet city",
      nextWorldview: "Ocean city"
    });

    assert.ok(warnings.includes(WORLD_EDITOR_LARGE_WORLDVIEW_CHANGE_WARNING));
  });

  it("prevents Reality name and worldview editing", () => {
    const result = validateWorldEditorPatch(
      {
        worldId: toWorldId("reality"),
        name: "Edited Reality",
        worldview: "Changed"
      },
      { worldType: "reality" }
    );

    assert.equal(canEditWorld({ worldType: "reality" }), false);
    assert.equal(result.valid, false);
    assert.equal(result.patch, null);
  });

  it("forbids contact, chat, memory, global AI, and Reality mutations through the contract", () => {
    assert.deepEqual(getForbiddenWorldEditorPatchFields({ worldType: "custom" }), [
      "WorldContact",
      "WorldChat",
      "WorldMemory",
      "GlobalAIModel",
      "GlobalAILink"
    ]);
    assert.deepEqual(getForbiddenWorldEditorPatchFields({ worldType: "reality" }), [
      "WorldContact",
      "WorldChat",
      "WorldMemory",
      "GlobalAIModel",
      "GlobalAILink",
      "Reality"
    ]);
  });
});
