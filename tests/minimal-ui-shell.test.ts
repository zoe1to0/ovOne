import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  MinimalUiShell,
  renderChatView,
  renderExperienceLayer,
  renderInputPanel,
  renderMessagePresentation,
  renderWorldListView,
  renderWorldView
} from "../src/minimal-ui-shell/index.js";
import { App } from "../src/app/index.js";
import { toWorldId } from "../src/world-domain/index.js";

describe("Minimal UI Shell", () => {
  it("renders product views as pure functions of WorldSnapshot", () => {
    const app = App.init();
    const snapshot = app.snapshot();

    const worldList = renderWorldListView(snapshot);
    const chat = renderChatView(snapshot);
    const world = renderWorldView(snapshot);
    const inputPanel = renderInputPanel(snapshot);

    assert.equal(worldList.activeWorld.worldId, snapshot.worldMeta.id);
    assert.equal(chat.title, snapshot.worldMeta.title);
    assert.equal(world.worldMeta.id, snapshot.worldMeta.id);
    assert.equal(world.memorySummary.namespace, `world:${snapshot.worldMeta.id}`);
    assert.equal(inputPanel.targetWorldId, snapshot.worldMeta.id);
    assert.equal(inputPanel.ownerActorId, snapshot.worldMeta.ownerActorId);
  });

  it("dispatches chat messages into runtime and receives a new WorldSnapshot", () => {
    const shell = MinimalUiShell.init(App.init());

    const next = shell.sendMessage("hello product");

    assert.equal(next.product.chat.messages.at(-1)?.text, "hello product");
    assert.equal(next.product.inputPanel.targetChatId, next.product.chat.chatId);
    assert.equal(shell.snapshot().chatState.chats.get(next.product.chat.chatId!)?.messages.at(-1)?.text, "hello product");
  });

  it("switches worlds without cross-world message leakage", () => {
    const shell = MinimalUiShell.init(App.init());
    const defaultWorldId = shell.view().activeWorldId;
    const realityWorldId = shell.view().availableWorlds.find((world) => world.worldId !== defaultWorldId)!.worldId;

    shell.sendMessage("default-only");
    const realityView = shell.switchWorld(realityWorldId);

    assert.equal(realityView.activeWorldId, realityWorldId);
    assert.equal(realityView.product.chat.messages.some((message) => message.text === "default-only"), false);

    shell.sendMessage("reality-only");
    const defaultView = shell.switchWorld(defaultWorldId);

    assert.equal(defaultView.product.chat.messages.some((message) => message.text === "default-only"), true);
    assert.equal(defaultView.product.chat.messages.some((message) => message.text === "reality-only"), false);
  });

  it("opens Reality from the same active snapshot", () => {
    const shell = MinimalUiShell.init(App.init());
    shell.sendMessage("stay with me");

    const view = shell.openScreen("reality");

    assert.equal(view.screen, "reality");
    assert.equal(view.product.world.worldMeta.id, view.product.snapshot.worldMeta.id);
    assert.equal(view.product.world.runtimeState.activeChatId, view.product.snapshot.runtimeState.activeChatId);
  });

  it("renders Dialogue mode as segmented conversational presentation", () => {
    const presentation = renderMessagePresentation("Hello there. I am listening.", "Dialogue");

    assert.equal(presentation.mode, "Dialogue");
    assert.equal(presentation.rhythm, "conversational");
    assert.deepEqual(presentation.segments.map((segment) => segment.text), ["Hello there.", "I am listening."]);
    assert.equal(presentation.segments.every((segment) => segment.pauseAfterMs > 0), true);
  });

  it("renders QA mode as a single structured block", () => {
    const presentation = renderMessagePresentation("One complete answer. With detail.", "QA");

    assert.equal(presentation.mode, "QA");
    assert.equal(presentation.rhythm, "single-block");
    assert.deepEqual(presentation.segments.map((segment) => segment.text), ["One complete answer. With detail."]);
  });

  it("adds first-entry and AI presence as UI-only experience state", () => {
    const shell = MinimalUiShell.init(App.init());
    const firstView = shell.view();
    const view = shell.sendMessage("are you there?");

    assert.equal(firstView.product.experience.worldEntrance.visible, true);
    assert.equal(firstView.product.experience.worldEntrance.text, "Entering Default World");
    assert.equal(view.product.experience.worldEntrance.visible, false);
    assert.equal(view.product.experience.worldEntrance.state, "settled");
    assert.equal(view.product.experience.worldEntrance.text, "Entering Default World");
    assert.equal(view.product.experience.aiPresence.state, "ACTIVE");
    assert.equal(view.product.experience.firstInteractionHint.text, "The world is listening.");
  });

  it("does not replay the entry moment when switching worlds", () => {
    const shell = MinimalUiShell.init(App.init());
    const defaultWorldId = shell.view().activeWorldId;
    const realityWorldId = shell.view().availableWorlds.find((world) => world.worldId !== defaultWorldId)!.worldId;

    assert.equal(shell.view().product.experience.worldEntrance.visible, true);

    const switched = shell.switchWorld(realityWorldId);
    const returned = shell.switchWorld(defaultWorldId);

    assert.equal(switched.product.experience.worldEntrance.visible, false);
    assert.equal(returned.product.experience.worldEntrance.visible, false);
  });

  it("keeps Reality contacts in QA presentation and custom contacts in Dialogue presentation", () => {
    const shell = MinimalUiShell.init(App.init());
    const custom = shell.sendMessage("custom rhythm");
    const realityWorldId = custom.availableWorlds.find((world) => world.worldId === toWorldId("reality"))!.worldId;
    const reality = shell.switchWorld(realityWorldId);
    const realityAfterMessage = shell.sendMessage("reality answer");

    assert.equal(custom.product.chat.messages.at(-1)?.presentation.mode, "Dialogue");
    assert.equal(reality.product.chat.messages.length, 0);
    assert.equal(realityAfterMessage.product.chat.messages.at(-1)?.presentation.mode, "QA");
  });
});
