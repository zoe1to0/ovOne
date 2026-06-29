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

  it("saves custom world role metadata without mutating chats, memory, or global links", () => {
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
    const linkedBefore = realityBefore.linkedAIModels;
    const created = shell.createWorldFromDraft({
      worldName: "Role World",
      worldviewSourceType: "text",
      worldviewText: "Original worldview",
      selectedAIModelIds: [friend.actorId],
      nextMode: "random-role"
    });
    const customWorldId = created.activeWorldId;
    const contactsBefore = created.product.snapshot.contacts;
    const chatsBefore = created.product.snapshot.chatState.chats;
    const memoryBefore = created.product.snapshot.memorySummary;
    const settingsBefore = created.product.snapshot.runtimeState.metadata.settings;

    const saved = shell.saveWorldRoleMetadata({
      worldId: customWorldId,
      userRole: {
        roleName: "Traveler",
        personaNotes: "New arrival"
      },
      memberRoles: [
        {
          worldContactId: friend.actorId,
          worldRoleName: "Guide",
          worldPersonaNotes: "Knows the city"
        }
      ]
    });

    const userRole = saved.product.snapshot.runtimeState.metadata.worldView.worldEditorUserRole as {
      readonly roleName: string;
      readonly personaNotes: string;
    };
    const savedFriend = saved.product.snapshot.contacts.find((contact) => contact.actorId === friend.actorId)!;
    const beforeFriend = contactsBefore.find((contact) => contact.actorId === friend.actorId)!;
    assert.equal(userRole.roleName, "Traveler");
    assert.equal(userRole.personaNotes, "New arrival");
    assert.equal(savedFriend.worldRoleName, "Guide");
    assert.equal(savedFriend.worldPersonaNotes, "Knows the city");
    assert.equal(savedFriend.displayName, beforeFriend.displayName);
    assert.equal(savedFriend.outputMode, beforeFriend.outputMode);
    assert.equal(savedFriend.kind, beforeFriend.kind);
    assert.equal(saved.product.snapshot.contacts.length, contactsBefore.length);
    assert.deepEqual([...saved.product.snapshot.chatState.chats], [...chatsBefore]);
    assert.deepEqual(saved.product.snapshot.memorySummary, memoryBefore);
    assert.deepEqual(saved.product.snapshot.runtimeState.metadata.settings, settingsBefore);
    assert.deepEqual(saved.linkedAIModels, linkedBefore);

    assert.throws(
      () => shell.saveWorldRoleMetadata({
        worldId: realityWorldId,
        userRole: { roleName: "Reality Role", personaNotes: "Nope" },
        memberRoles: []
      }),
      /invalid World Editor role patch/
    );
    assert.deepEqual(shell.switchWorld(realityWorldId).product.snapshot.contacts, realityBefore.product.snapshot.contacts);
  });

  it("adds a linked AI member to a custom world without touching Reality, groups, or messages", () => {
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
    const reality = shell.switchWorld(realityWorldId);
    const beforeContacts = reality.product.snapshot.contacts;
    const beforeChats = reality.product.snapshot.chatState.chats;
    const beforeMemory = reality.product.snapshot.memorySummary;
    const friend = reality.product.snapshot.contacts.find((contact) => contact.actorId === "ai:friend")!;
    const created = shell.createWorldFromDraft({
      worldName: "Member World",
      worldviewSourceType: "text",
      worldviewText: "A small shared place.",
      selectedAIModelIds: [],
      nextMode: "random-role"
    });
    const customWorldId = created.activeWorldId;

    const beforeAdd = shell.switchWorld(customWorldId);
    assert.equal(beforeAdd.product.snapshot.contacts.some((contact) => contact.actorId === friend.actorId), false);
    assert.equal(beforeAdd.availableWorlds.find((world) => world.worldId === customWorldId)?.memberActorIds?.includes(friend.actorId), false);

    const added = shell.addWorldMember({
      worldId: customWorldId,
      globalAILinkId: "link:ai:friend"
    });

    assert.equal(added.product.snapshot.contacts.some((contact) => contact.actorId === friend.actorId && contact.worldId === customWorldId), true);
    assert.equal(added.product.snapshot.chatState.chats.has(`chat:${customWorldId}:ai:friend`), true);
    assert.equal(added.product.snapshot.chatState.chats.get(`chat:${customWorldId}:ai:friend`)?.messages.length, 0);
    assert.equal(added.product.snapshot.groups.length, 0);
    assert.deepEqual(
      added.product.snapshot.runtimeState.metadata.settings.memberMemoryScopes,
      {
        "ai:friend": {
          worldId: customWorldId,
          actorId: "ai:friend",
          namespace: `world:${customWorldId}:contact:ai:friend`,
          status: "placeholder"
        }
      }
    );
    assert.equal(added.availableWorlds.find((world) => world.worldId === customWorldId)?.memberActorIds?.includes("ai:friend"), true);

    const realityAfter = shell.switchWorld(realityWorldId);
    assert.deepEqual(realityAfter.product.snapshot.contacts, beforeContacts);
    assert.deepEqual([...realityAfter.product.snapshot.chatState.chats], [...beforeChats]);
    assert.deepEqual(realityAfter.product.snapshot.memorySummary, beforeMemory);
  });

  it("adds a member to a non-current custom world without switching currentWorldId", () => {
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
    shell.switchWorld(realityWorldId);
    const created = shell.createWorldFromDraft({
      worldName: "Non Current Member World",
      worldviewSourceType: "text",
      worldviewText: "A small shared place.",
      selectedAIModelIds: [],
      nextMode: "random-role"
    });
    const customWorldId = created.activeWorldId;

    shell.switchWorld(realityWorldId);
    const added = shell.addWorldMember({
      worldId: customWorldId,
      globalAILinkId: "link:ai:friend"
    });

    assert.equal(added.activeWorldId, realityWorldId);
    assert.equal(added.availableWorlds.find((world) => world.worldId === customWorldId)?.memberActorIds?.includes("ai:friend"), true);
    assert.equal(shell.switchWorld(customWorldId).product.snapshot.contacts.some((contact) => contact.actorId === "ai:friend"), true);
  });

  it("rejects invalid member adds", () => {
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
    const created = shell.createWorldFromDraft({
      worldName: "Reject Member World",
      worldviewSourceType: "text",
      worldviewText: "A small shared place.",
      selectedAIModelIds: [],
      nextMode: "random-role"
    });
    const customWorldId = created.activeWorldId;

    assert.throws(() => shell.addWorldMember({ worldId: realityWorldId, globalAILinkId: "link:ai:friend" }));
    assert.throws(() => shell.addWorldMember({ worldId: customWorldId, globalAILinkId: "link:missing" }));

    shell.addWorldMember({ worldId: customWorldId, globalAILinkId: "link:ai:friend" });
    assert.throws(() => shell.addWorldMember({ worldId: customWorldId, globalAILinkId: "link:ai:friend" }));
  });

  it("removes a member from a custom world without touching Reality, other worlds, or global links", () => {
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
    shell.switchWorld(realityWorldId);
    const realityBefore = shell.view();
    const beforeRealityContacts = realityBefore.product.snapshot.contacts;
    const beforeRealityChats = realityBefore.product.snapshot.chatState.chats;
    const beforeRealityMemory = realityBefore.product.snapshot.memorySummary;
    const beforeLinkedModels = realityBefore.linkedAIModels;

    const currentCreated = shell.createWorldFromDraft({
      worldName: "Remove Member World",
      worldviewSourceType: "text",
      worldviewText: "A small shared place.",
      selectedAIModelIds: ["ai:friend"],
      nextMode: "random-role"
    });
    const currentWorldId = currentCreated.activeWorldId;
    const otherCreated = shell.createWorldFromDraft({
      worldName: "Other Member World",
      worldviewSourceType: "text",
      worldviewText: "Another place.",
      selectedAIModelIds: ["ai:friend"],
      nextMode: "random-role"
    });
    const otherWorldId = otherCreated.activeWorldId;
    const otherBefore = shell.switchWorld(otherWorldId);

    const beforeRemove = shell.switchWorld(currentWorldId);
    const privateChatId = `chat:${currentWorldId}:ai:friend`;
    assert.equal(beforeRemove.product.snapshot.contacts.some((contact) => contact.actorId === "ai:friend"), true);
    assert.equal(beforeRemove.product.snapshot.chatState.chats.has(privateChatId), true);
    assert.equal(Boolean((beforeRemove.product.snapshot.runtimeState.metadata.settings.memberMemoryScopes as Record<string, unknown> | undefined)?.["ai:friend"]), false);

    const removed = shell.removeWorldMember({
      worldId: currentWorldId,
      actorId: "ai:friend"
    });

    assert.equal(removed.activeWorldId, currentWorldId);
    assert.equal(removed.product.snapshot.contacts.some((contact) => contact.actorId === "ai:friend"), false);
    assert.equal(removed.product.snapshot.chatState.chats.has(privateChatId), false);
    assert.equal(removed.product.snapshot.chatState.activeChatId, null);
    assert.equal(removed.availableWorlds.find((world) => world.worldId === currentWorldId)?.memberActorIds?.includes("ai:friend"), false);
    assert.equal(removed.linkedAIModels?.some((model) => model.globalAILinkId === "link:ai:friend"), true);

    const realityAfter = shell.switchWorld(realityWorldId);
    assert.deepEqual(realityAfter.product.snapshot.contacts, beforeRealityContacts);
    assert.deepEqual([...realityAfter.product.snapshot.chatState.chats], [...beforeRealityChats]);
    assert.deepEqual(realityAfter.product.snapshot.memorySummary, beforeRealityMemory);
    assert.deepEqual(realityAfter.linkedAIModels, beforeLinkedModels);

    const otherAfter = shell.switchWorld(otherWorldId);
    assert.deepEqual(otherAfter.product.snapshot.contacts, otherBefore.product.snapshot.contacts);
    assert.deepEqual([...otherAfter.product.snapshot.chatState.chats], [...otherBefore.product.snapshot.chatState.chats]);
  });

  it("removes a member from a non-current custom world without switching currentWorldId", () => {
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
    shell.switchWorld(realityWorldId);
    const created = shell.createWorldFromDraft({
      worldName: "Remove Non Current World",
      worldviewSourceType: "text",
      worldviewText: "A small shared place.",
      selectedAIModelIds: [],
      nextMode: "random-role"
    });
    const customWorldId = created.activeWorldId;
    const added = shell.addWorldMember({
      worldId: customWorldId,
      globalAILinkId: "link:ai:friend"
    });
    assert.equal(Boolean((added.product.snapshot.runtimeState.metadata.settings.memberMemoryScopes as Record<string, unknown> | undefined)?.["ai:friend"]), true);

    shell.switchWorld(realityWorldId);
    const removed = shell.removeWorldMember({
      worldId: customWorldId,
      actorId: "ai:friend"
    });

    assert.equal(removed.activeWorldId, realityWorldId);
    assert.equal(removed.availableWorlds.find((world) => world.worldId === customWorldId)?.memberActorIds?.includes("ai:friend"), false);
    const customAfter = shell.switchWorld(customWorldId);
    assert.equal(customAfter.product.snapshot.contacts.some((contact) => contact.actorId === "ai:friend"), false);
    assert.equal(Boolean((customAfter.product.snapshot.runtimeState.metadata.settings.memberMemoryScopes as Record<string, unknown> | undefined)?.["ai:friend"]), false);
  });

  it("re-adds a removed member as a clean world-scoped instance without old chat or memory", () => {
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
    shell.switchWorld(realityWorldId);
    const created = shell.createWorldFromDraft({
      worldName: "Readd Member World",
      worldviewSourceType: "text",
      worldviewText: "A small shared place.",
      selectedAIModelIds: [],
      nextMode: "random-role"
    });
    const customWorldId = created.activeWorldId;
    const firstAdded = shell.addWorldMember({
      worldId: customWorldId,
      globalAILinkId: "link:ai:friend"
    });
    const chatId = `chat:${customWorldId}:ai:friend`;
    assert.equal(firstAdded.product.snapshot.chatState.chats.get(chatId)?.messages.length, 0);
    assert.equal(Boolean((firstAdded.product.snapshot.runtimeState.metadata.settings.memberMemoryScopes as Record<string, unknown> | undefined)?.["ai:friend"]), true);

    const removed = shell.removeWorldMember({
      worldId: customWorldId,
      actorId: "ai:friend"
    });
    assert.equal(removed.product.snapshot.contacts.some((contact) => contact.actorId === "ai:friend"), false);
    assert.equal(removed.product.snapshot.chatState.chats.has(chatId), false);
    assert.equal(Boolean((removed.product.snapshot.runtimeState.metadata.settings.memberMemoryScopes as Record<string, unknown> | undefined)?.["ai:friend"]), false);

    const readded = shell.addWorldMember({
      worldId: customWorldId,
      globalAILinkId: "link:ai:friend"
    });

    assert.equal(readded.product.snapshot.contacts.some((contact) => contact.actorId === "ai:friend"), true);
    assert.equal(readded.product.snapshot.chatState.chats.has(chatId), true);
    assert.equal(readded.product.snapshot.chatState.chats.get(chatId)?.messages.length, 0);
    assert.equal(Boolean((readded.product.snapshot.runtimeState.metadata.settings.memberMemoryScopes as Record<string, unknown> | undefined)?.["ai:friend"]), true);
    assert.equal(readded.linkedAIModels?.some((model) => model.globalAILinkId === "link:ai:friend"), true);
  });

  it("rejects invalid member removes", () => {
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
    const created = shell.createWorldFromDraft({
      worldName: "Reject Remove World",
      worldviewSourceType: "text",
      worldviewText: "A small shared place.",
      selectedAIModelIds: ["ai:friend"],
      nextMode: "random-role"
    });
    const customWorldId = created.activeWorldId;

    assert.throws(() => shell.removeWorldMember({ worldId: realityWorldId, actorId: "ai:friend" }));
    assert.throws(() => shell.removeWorldMember({ worldId: customWorldId, actorId: "ai:missing" }));
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
