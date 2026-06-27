import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { createOnboardedProductRuntime } from "../src/onboarding/index.js";
import { createMemoryWorldStorage } from "../src/persistence/index.js";
import { toWorldId } from "../src/world-domain/index.js";

describe("Onboarding Flow", () => {
  it("creates a zero-friction first-run chat experience", () => {
    const storage = createMemoryWorldStorage();
    const runtime = createOnboardedProductRuntime({ storage });
    const view = runtime.shell.view();

    assert.equal(view.onboarding.firstRun, true);
    assert.equal(view.screen, "chat");
    assert.equal(view.product.inputPanel.canSubmit, true);
    assert.equal(view.product.chat.messages.at(-1)?.authorName, "Default AI Friend");
    assert.equal(view.product.chat.messages.at(-1)?.text, "I am here with you. Send a message whenever you are ready.");
    assert.equal(view.product.snapshot.contacts.find((contact) => contact.actorId === "default-ai-friend")?.outputMode, "Dialogue");
  });

  it("allows the first user message immediately and replies without setup", () => {
    const runtime = createOnboardedProductRuntime({ storage: createMemoryWorldStorage() });

    const next = runtime.shell.sendMessage("hello first run");

    assert.equal(next.product.chat.messages.at(-2)?.text, "hello first run");
    assert.equal(next.product.chat.messages.at(-1)?.authorName, "Default AI Friend");
    assert.equal(next.product.chat.messages.at(-1)?.text, "I hear you. Tell me a little more.");
    assert.equal(runtime.shell.view().onboarding.firstRun, false);
  });

  it("persists onboarding so restart resumes without repeating first-run state", () => {
    const storage = createMemoryWorldStorage();
    const first = createOnboardedProductRuntime({ storage });
    first.shell.sendMessage("persist onboarding");

    const second = createOnboardedProductRuntime({ storage });

    assert.equal(second.shell.view().onboarding.firstRun, false);
    assert.equal(second.shell.view().product.chat.messages.some((message) => message.text === "persist onboarding"), true);
  });

  it("guarantees an AI contact and usable chat for every visible chat", () => {
    const runtime = createOnboardedProductRuntime({ storage: createMemoryWorldStorage() });

    for (const chat of runtime.shell.view().availableWorlds) {
      const view = runtime.shell.switchWorld(chat.worldId);

      assert.equal(view.product.inputPanel.canSubmit, true);
      assert.equal(view.product.snapshot.contacts.some((contact) => contact.kind === "assistant"), true);
    }
  });

  it("regenerates a usable chat when stored snapshots are corrupt", () => {
    const storage = createMemoryWorldStorage();
    storage.writeRawWorld(toWorldId("custom:default"), { corrupt: true });

    const runtime = createOnboardedProductRuntime({ storage });
    const view = runtime.shell.view();

    assert.equal(view.screen, "chat");
    assert.equal(view.product.inputPanel.canSubmit, true);
    assert.equal(view.product.snapshot.contacts.some((contact) => contact.kind === "assistant"), true);
  });

  it("ignores invalid chat operations safely", () => {
    const runtime = createOnboardedProductRuntime({ storage: createMemoryWorldStorage() });
    const before = runtime.shell.view();

    const after = runtime.shell.switchWorld(toWorldId("missing"));

    assert.equal(after.screen, "chat");
    assert.equal(after.activeWorldId, before.activeWorldId);
    assert.equal(after.product.inputPanel.canSubmit, true);
  });

  it("keeps default AI behavior conversational and non-systemic", () => {
    const runtime = createOnboardedProductRuntime({ storage: createMemoryWorldStorage() });
    const messages = runtime.shell.sendMessage("hello").product.chat.messages.map((message) => message.text).join(" ");

    assert.equal(/world|runtime|system|architecture|snapshot|routing/i.test(messages), false);
  });
});
