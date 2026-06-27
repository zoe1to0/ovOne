import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { AiAdapter, App, WorldDomain, toWorldId } from "../src/index.js";

describe("AI Adapter output modes", () => {
  it("defaults Reality contacts to QA mode", () => {
    const domain = WorldDomain.create({
      reality: {
        ownerActorId: "user",
        assistantActorId: "ovone"
      }
    });

    const snapshot = domain.generateSnapshot(toWorldId("reality"));

    assert.equal(snapshot.contacts.every((contact) => contact.outputMode === "QA"), true);
  });

  it("defaults custom world contacts to Dialogue mode", () => {
    const app = App.init();

    assert.equal(app.snapshot().contacts.every((contact) => contact.outputMode === "Dialogue"), true);
  });

  it("formats model input according to QA mode without changing state", () => {
    const domain = WorldDomain.create({
      reality: {
        ownerActorId: "user",
        assistantActorId: "ovone"
      }
    });
    const adapter = AiAdapter.create();
    const before = domain.generateSnapshot(toWorldId("reality"));

    const request = adapter.prepareModelRequest({
      snapshot: before,
      actorId: "ovone",
      prompt: "Explain the system."
    });
    const after = domain.generateSnapshot(toWorldId("reality"));

    assert.equal(request.outputMode, "QA");
    assert.match(request.formattingInstruction, /long-form structured answer/);
    assert.deepEqual(snapshotShape(after), snapshotShape(before));
  });

  it("formats model input according to Dialogue mode without changing app or kernel state", () => {
    const app = App.init();
    const adapter = AiAdapter.create();
    const beforeState = app.getState();
    const beforeSnapshot = app.snapshot();

    const request = adapter.prepareModelRequest({
      snapshot: beforeSnapshot,
      actorId: "ovone",
      prompt: "Hey."
    });

    assert.equal(request.outputMode, "Dialogue");
    assert.match(request.formattingInstruction, /conversational flow/);
    assert.equal(app.getState(), beforeState);
    assert.deepEqual(snapshotShape(app.snapshot()), snapshotShape(beforeSnapshot));
  });
});

function snapshotShape(snapshot: ReturnType<ReturnType<typeof App.init>["snapshot"]>): unknown {
  return {
    ...snapshot,
    chatState: {
      ...snapshot.chatState,
      chats: [...snapshot.chatState.chats.entries()]
    }
  };
}
