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
import type { MinimalProductShellRuntime } from "../src/minimal-ui-shell/index.js";
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

  it("creates a custom world from a random-role draft without changing Reality", () => {
    const app = App.init();
    const shell = MinimalUiShell.init(app);
    const realityWorldId = toWorldId("reality");
    app.worldDomain.applyStructuralPatch({
      type: "ai.contact.added",
      worldId: realityWorldId,
      timestamp: 9000,
      contact: {
        actorId: "ai:friend",
        displayName: "Original Friend",
        kind: "assistant"
      }
    });
    const realityBefore = shell.switchWorld(realityWorldId);
    const friend = realityBefore.product.snapshot.contacts.find((contact) => contact.actorId === "ai:friend")!;
    const beforeWorlds = realityBefore.availableWorlds.length;
    const beforeRealityContactCount = realityBefore.product.snapshot.contacts.length;
    const beforeRealityChatCount = realityBefore.product.snapshot.chatState.chats.size;

    const created = shell.createWorldFromDraft({
      worldName: "Blank Test World",
      worldviewSourceType: "blank",
      worldviewText: "",
      selectedAIModelIds: [friend.actorId],
      nextMode: "random-role"
    });

    assert.equal(created.availableWorlds.length, beforeWorlds + 1);
    assert.equal(created.activeWorldId, toWorldId("custom:blank-test-world"));
    assert.equal(created.screen, "chat");
    assert.equal(created.product.snapshot.worldMeta.type, "custom");
    assert.equal(created.product.snapshot.worldMeta.title, "Blank Test World");
    assert.equal(createWorldSettings(created).roleAssignment, "none");
    assert.equal(createWorldBootstrapPlan(created).privateMessages.length, 1);
    assert.equal(createWorldBootstrapPlan(created).privateMessages[0]?.contactId, friend.actorId);
    assert.equal(createWorldBootstrapPlan(created).privateMessages[0]?.status, "stub-generated");
    assert.deepEqual(createWorldBootstrapPlan(created).groups, []);
    assert.equal(created.product.snapshot.contacts.some((contact) => contact.actorId === friend.actorId && contact.worldId === created.activeWorldId), true);
    assert.equal(created.product.snapshot.chatState.chats.size, 1);
    const chat = created.product.snapshot.chatState.chats.values().next().value;
    assert.equal(chat?.title, friend.displayName);
    assert.equal(chat?.messages.length, 1);
    assert.equal(chat?.messages[0]?.authorActorId, friend.actorId);
    assert.equal(chat?.messages[0]?.text, "初始消息待生成");

    const realityAfter = shell.switchWorld(realityWorldId);
    assert.equal(realityAfter.product.snapshot.contacts.length, beforeRealityContactCount);
    assert.equal(realityAfter.product.snapshot.contacts.find((contact) => contact.actorId === friend.actorId)?.worldId, realityWorldId);
    assert.equal(realityAfter.product.snapshot.chatState.chats.size, beforeRealityChatCount);
  });

  it("keeps non-blank role assignment as an explicit placeholder", () => {
    const app = App.init();
    const shell = MinimalUiShell.init(app);
    const worldId = shell.view().activeWorldId;
    app.worldDomain.applyStructuralPatch({
      type: "ai.contact.added",
      worldId,
      timestamp: 9000,
      contact: {
        actorId: "ai:friend",
        displayName: "Original Friend",
        kind: "assistant"
      }
    });
    const friend = shell.view().product.snapshot.contacts.find((contact) => contact.actorId === "ai:friend")!;

    const created = shell.createWorldFromDraft({
      worldName: "Story Test World",
      worldviewSourceType: "text",
      worldviewText: "A tiny studio world.",
      selectedAIModelIds: [friend.actorId],
      nextMode: "random-role"
    });

    assert.equal(created.product.snapshot.runtimeState.metadata.worldView.roleAssignment, "placeholder");
    assert.equal(createWorldSettings(created).roleAssignment, "placeholder");
    assert.equal(createWorldBootstrapPlan(created).privateMessages.length, 1);
    assert.equal(created.product.snapshot.chatState.chats.values().next().value?.messages[0]?.text, "初始消息待生成");
  });

  it("saves custom world metadata without mutating contacts, chats, memory, or current world selection", () => {
    const app = App.init();
    const shell = MinimalUiShell.init(app);
    const realityWorldId = toWorldId("reality");
    app.worldDomain.applyStructuralPatch({
      type: "ai.contact.added",
      worldId: realityWorldId,
      timestamp: 9000,
      contact: {
        actorId: "ai:friend",
        displayName: "Original Friend",
        kind: "assistant"
      }
    });
    const realityBefore = shell.switchWorld(realityWorldId);
    const friend = realityBefore.product.snapshot.contacts.find((contact) => contact.actorId === "ai:friend")!;
    const created = shell.createWorldFromDraft({
      worldName: "Editable World",
      worldviewSourceType: "text",
      worldviewText: "Original worldview",
      selectedAIModelIds: [friend.actorId],
      nextMode: "random-role"
    });
    const customWorldId = created.activeWorldId;
    const contactsBefore = created.product.snapshot.contacts;
    const chatsBefore = created.product.snapshot.chatState.chats;
    const memoryBefore = created.product.snapshot.memorySummary;

    const savedCurrent = shell.saveWorldMetadata({
      worldId: customWorldId,
      name: "Edited World",
      worldview: ""
    });

    assert.equal(savedCurrent.activeWorldId, customWorldId);
    assert.equal(savedCurrent.product.snapshot.worldMeta.title, "Edited World");
    assert.equal(savedCurrent.product.snapshot.runtimeState.metadata.title, "Edited World");
    assert.deepEqual(savedCurrent.product.snapshot.runtimeState.metadata.worldView, {});
    assert.equal(savedCurrent.availableWorlds.find((world) => world.worldId === customWorldId)?.title, "Edited World");
    assert.deepEqual(savedCurrent.product.snapshot.contacts, contactsBefore);
    assert.deepEqual([...savedCurrent.product.snapshot.chatState.chats], [...chatsBefore]);
    assert.deepEqual(savedCurrent.product.snapshot.memorySummary, memoryBefore);

    const realityActive = shell.switchWorld(realityWorldId);
    const savedNonCurrent = shell.saveWorldMetadata({
      worldId: customWorldId,
      name: "Edited Again",
      worldview: "Next worldview"
    });

    assert.equal(realityActive.activeWorldId, realityWorldId);
    assert.equal(savedNonCurrent.activeWorldId, realityWorldId);
    assert.equal(savedNonCurrent.availableWorlds.find((world) => world.worldId === customWorldId)?.title, "Edited Again");
    assert.equal(savedNonCurrent.availableWorlds.find((world) => world.worldId === customWorldId)?.worldView?.text, "Next worldview");
  });

  it("rejects Reality metadata saves", () => {
    const shell = MinimalUiShell.init(App.init());

    assert.throws(() =>
      shell.saveWorldMetadata({
        worldId: toWorldId("reality"),
        name: "Edited Reality",
        worldview: "Changed"
      })
    );
    assert.equal(shell.switchWorld(toWorldId("reality")).product.snapshot.worldMeta.title, "Reality");
  });

  it("creates a custom world from detailed edit empty role without active initial messages", () => {
    const app = App.init();
    const shell = MinimalUiShell.init(app);
    const realityWorldId = toWorldId("reality");
    app.worldDomain.applyStructuralPatch({
      type: "ai.contact.added",
      worldId: realityWorldId,
      timestamp: 9000,
      contact: {
        actorId: "ai:friend",
        displayName: "Original Friend",
        kind: "assistant"
      }
    });
    const realityBefore = shell.switchWorld(realityWorldId);
    const friend = realityBefore.product.snapshot.contacts.find((contact) => contact.actorId === "ai:friend")!;
    const beforeWorlds = realityBefore.availableWorlds.length;
    const beforeRealityContactCount = realityBefore.product.snapshot.contacts.length;
    const beforeRealityChatCount = realityBefore.product.snapshot.chatState.chats.size;

    const created = shell.createWorldFromDraft({
      worldName: "Empty Role World",
      worldviewSourceType: "text",
      worldviewText: "A quiet place.",
      selectedAIModelIds: [friend.actorId],
      nextMode: "detailed-edit",
      detailRoleMode: "empty-role",
      randomRoleSlots: [],
      selectedUserRoleSlotId: null,
      fixedRoles: []
    });

    assert.equal(created.availableWorlds.length, beforeWorlds + 1);
    assert.equal(created.activeWorldId, toWorldId("custom:empty-role-world"));
    assert.equal(created.screen, "chat");
    assert.equal(created.product.snapshot.worldMeta.title, "Empty Role World");
    assert.equal(created.product.snapshot.runtimeState.metadata.worldView.roleAssignment, "none");
    assert.equal(createWorldSettings(created).roleAssignment, "none");
    assert.equal(createWorldSettings(created).detailRoleMode, "empty-role");
    assert.deepEqual(createWorldBootstrapPlan(created).privateMessages, []);
    assert.deepEqual(createWorldBootstrapPlan(created).groups, []);
    assert.equal(created.product.snapshot.groups.length, 0);
    assert.equal(created.product.snapshot.chatState.chats.size, 1);
    assert.equal(created.product.snapshot.chatState.chats.values().next().value?.messages.length, 0);

    const realityAfter = shell.switchWorld(realityWorldId);
    assert.equal(realityAfter.product.snapshot.contacts.length, beforeRealityContactCount);
    assert.equal(realityAfter.product.snapshot.chatState.chats.size, beforeRealityChatCount);
  });
});

function createWorldSettings(view: ReturnType<MinimalProductShellRuntime["view"]>): Record<string, unknown> {
  return view.product.snapshot.runtimeState.metadata.settings.createWorld as Record<string, unknown>;
}

function createWorldBootstrapPlan(view: ReturnType<MinimalProductShellRuntime["view"]>): {
  privateMessages: { contactId: string; status: string }[];
  groups: unknown[];
} {
  return createWorldSettings(view).bootstrapPlan as {
    privateMessages: { contactId: string; status: string }[];
    groups: unknown[];
  };
}
