import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  LINKED_AI_DISCONNECT_UNLINKED_MESSAGE,
  LINKED_AI_DISCONNECT_WARNING_MESSAGE,
  canDisconnectLinkedAI,
  getForbiddenLinkedAIDisconnectMutations,
  getLinkedAIDisconnectWarning,
  validateLinkedAIDisconnectCommand
} from "../src/domain/index.js";

describe("Me Settings linked AI disconnect contract", () => {
  const input = {
    globalAILinks: [
      { linkId: "link:ai:friend", status: "connected" as const },
      { linkId: "link:ai:offline", status: "disconnected" as const }
    ]
  };

  it("accepts connected linked AI and returns the strong disconnect warning", () => {
    const command = { globalAILinkId: "link:ai:friend" };
    const result = validateLinkedAIDisconnectCommand(command, input);

    assert.equal(result.valid, true);
    assert.deepEqual(result.command, command);
    assert.equal(canDisconnectLinkedAI(command, input), true);
    assert.equal(result.warning, LINKED_AI_DISCONNECT_WARNING_MESSAGE);
    assert.equal(getLinkedAIDisconnectWarning(), LINKED_AI_DISCONNECT_WARNING_MESSAGE);
  });

  it("rejects unlinked or disconnected AI without allowing scaffold mutation", () => {
    const missing = validateLinkedAIDisconnectCommand({ globalAILinkId: "link:missing" }, input);
    const disconnected = validateLinkedAIDisconnectCommand({ globalAILinkId: "link:ai:offline" }, input);

    assert.equal(missing.valid, false);
    assert.equal(missing.error, LINKED_AI_DISCONNECT_UNLINKED_MESSAGE);
    assert.equal(disconnected.valid, false);
    assert.equal(disconnected.error, LINKED_AI_DISCONNECT_UNLINKED_MESSAGE);
    assert.deepEqual(getForbiddenLinkedAIDisconnectMutations(), [
      "GlobalAIModel",
      "GlobalAILink",
      "ProviderConnection",
      "WorldContact",
      "WorldChat",
      "WorldMemory",
      "Reality",
      "CustomWorld"
    ]);
  });
});
