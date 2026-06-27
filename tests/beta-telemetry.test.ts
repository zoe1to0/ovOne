import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  createBetaTelemetry,
  toWorldId
} from "../src/index.js";
import { createOnboardedProductRuntime } from "../src/onboarding/index.js";
import { createMemoryWorldStorage } from "../src/persistence/index.js";

describe("Beta Telemetry", () => {
  it("tracks session length, first message time, interaction depth, and engagement", () => {
    let tick = 1000;
    const telemetry = createBetaTelemetry({ now: () => tick });
    const runtime = createOnboardedProductRuntime({
      storage: createMemoryWorldStorage(),
      telemetry
    });

    tick = 1500;
    runtime.shell.sendMessage("hello beta");

    const summary = telemetry.summary();
    assert.equal(summary.sessionStartedAt, 1000);
    assert.equal(summary.sessionLengthMs, 500);
    assert.equal(summary.firstMessageAt, 1500);
    assert.equal(summary.firstSuccessfulInteractionAt, 1500);
    assert.equal(summary.userMessageCount, 1);
    assert.equal(summary.aiMessageCount, 1);
    assert.equal(summary.aiInteractionDepth, 2);
    assert.equal(summary.aiEngagementRate, 1);
  });

  it("tracks chat switching frequency without routing the user away", () => {
    const telemetry = createBetaTelemetry({ now: () => 2000 });
    const runtime = createOnboardedProductRuntime({
      storage: createMemoryWorldStorage(),
      telemetry
    });
    const alternate = runtime.shell.view().availableWorlds.find((chat) => chat.worldId !== runtime.shell.view().activeWorldId)!;

    runtime.shell.switchWorld(alternate.worldId);

    assert.equal(telemetry.summary().worldSwitchCount, 1);
    assert.equal(telemetry.events().at(-1)?.type, "chat.switched");
  });

  it("captures invalid operations and fallback triggers without blocking the chat", () => {
    const telemetry = createBetaTelemetry({ now: () => 3000 });
    const runtime = createOnboardedProductRuntime({
      storage: createMemoryWorldStorage(),
      telemetry
    });

    const view = runtime.shell.switchWorld(toWorldId("missing"));

    assert.equal(view.product.inputPanel.canSubmit, true);
    assert.deepEqual(
      telemetry.summary().errors.map((event) => event.type),
      ["error.invalid-event"]
    );
  });

  it("records corrupted snapshot recovery observations", () => {
    const storage = createMemoryWorldStorage();
    storage.writeRawWorld(toWorldId("custom:default"), { corrupt: true });
    const telemetry = createBetaTelemetry({ now: () => 4000 });

    createOnboardedProductRuntime({ storage, telemetry });

    assert.equal(
      telemetry.summary().errors.some((event) => event.type === "error.snapshot-recovered"),
      true
    );
  });

  it("records drop-off point as the latest observed beta signal", () => {
    const telemetry = createBetaTelemetry({ now: () => 5000 });
    const runtime = createOnboardedProductRuntime({
      storage: createMemoryWorldStorage(),
      telemetry
    });

    runtime.shell.sendMessage("still here");

    assert.equal(telemetry.summary().dropOffPoint, "message.ai-replied");
  });
});
