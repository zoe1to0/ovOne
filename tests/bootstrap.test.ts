import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { createOvOneRuntime, summarizeRuntime } from "../src/bootstrap/index.js";

describe("ovOne v2 bootstrap", () => {
  it("creates a minimal layered runtime", () => {
    const runtime = createOvOneRuntime();

    assert.equal(runtime.snapshot.worldMeta.title, "Default World");
    assert.equal(runtime.view.screen, "chat");
    assert.equal(runtime.view.ui.chatList.length, 1);
    assert.equal(runtime.aiAdapter.prepareModelRequest({
      snapshot: runtime.snapshot,
      actorId: "ovone",
      prompt: "Hello"
    }).outputMode, "Dialogue");
  });

  it("summarizes the runnable runtime deterministically", () => {
    assert.equal(
      summarizeRuntime(createOvOneRuntime()),
      [
        "ovOne v2 runtime ready",
        "world=Default World",
        "lifecycle=active",
        "contacts=2",
        "chats=1",
        "screen=chat"
      ].join("\n")
    );
  });
});
