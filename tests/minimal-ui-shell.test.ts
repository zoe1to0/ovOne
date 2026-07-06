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
import { createAIProviderBridge, resolveGroupAddMemberCandidates } from "../src/domain/index.js";
import { toWorldId } from "../src/world-domain/index.js";
import { toChatEventId, toChatId, toMessageId, transition } from "../src/chat-kernel/index.js";
import type { ChatId } from "../src/chat-kernel/index.js";

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

  it("sends private chat messages through the AI provider bridge", async () => {
    const shell = MinimalUiShell.init(App.init());

    const next = await shell.sendMessageWithAI("hello provider");
    const messages = next.product.chat.messages;

    assert.equal(messages.at(-2)?.authorName, "You");
    assert.equal(messages.at(-2)?.text, "hello provider");
    assert.equal(messages.at(-1)?.authorName, "ovOne");
    assert.equal(messages.at(-1)?.text, "mock:hello provider");
    assert.equal(JSON.stringify(next).includes("OVONE_AI_API_KEY"), false);
  });

  it("sends group chat messages through a bounded multi-AI burst", async () => {
    const app = App.init();
    const realityWorldId = toWorldId("reality");
    app.worldDomain.applyStructuralPatch({
      type: "ai.contact.added",
      worldId: realityWorldId,
      timestamp: 9100,
      contact: {
        actorId: "ai:first",
        displayName: "First AI",
        kind: "assistant"
      }
    });
    app.worldDomain.applyStructuralPatch({
      type: "ai.contact.added",
      worldId: realityWorldId,
      timestamp: 9101,
      contact: {
        actorId: "ai:second",
        displayName: "Second AI",
        kind: "assistant"
      }
    });
    const shell = MinimalUiShell.init(app, { groupBurstRandom: queuedRandom([0.99, 0, 0, 0]) });
    shell.switchWorld(realityWorldId);
    const group = shell.createGroupChat({
      groupName: "Runtime Group",
      selectedWorldContactIds: ["ai:first", "ai:second"]
    });
    const groupChatId = group.product.snapshot.chatState.activeChatId!;

    const next = await shell.sendMessageWithAI("hello group");
    const messages = next.product.snapshot.chatState.chats.get(groupChatId)?.messages ?? [];

    assert.equal(messages.at(-4)?.authorActorId, "user");
    assert.equal(messages.at(-4)?.text, "hello group");
    assert.deepEqual(messages.slice(-3).map((message) => message.authorActorId), ["ai:first", "ai:second", "ai:first"]);
    assert.equal(messages.slice(-3).every((message) => message.text.startsWith("mock:")), true);
    assert.equal(messages.slice(1).length, 3);
  });

  it("lets later group AI turns see earlier turns from the same burst", async () => {
    const capturedBodies: string[] = [];
    let callCount = 0;
    const bridge = createAIProviderBridge({
      provider: "openai-compatible",
      baseUrl: "https://provider.invalid/v1",
      apiKey: "test-key",
      model: "trial-real"
    }, {
      fetchImpl: async (_url: string, init: { readonly body?: string }) => {
        capturedBodies.push(init.body ?? "");
        callCount += 1;
        return new Response(JSON.stringify({
          choices: [{ message: { content: `turn-${callCount}` } }]
        }), { status: 200 });
      }
    });
    const app = App.init();
    const realityWorldId = toWorldId("reality");
    app.worldDomain.applyStructuralPatch({
      type: "ai.contact.added",
      worldId: realityWorldId,
      timestamp: 9100,
      contact: {
        actorId: "ai:first",
        displayName: "First AI",
        kind: "assistant"
      }
    });
    app.worldDomain.applyStructuralPatch({
      type: "ai.contact.added",
      worldId: realityWorldId,
      timestamp: 9101,
      contact: {
        actorId: "ai:second",
        displayName: "Second AI",
        kind: "assistant"
      }
    });
    const shell = MinimalUiShell.init(app, {
      aiProviderBridge: bridge,
      groupBurstRandom: queuedRandom([0.99, 0, 0, 0])
    });
    shell.switchWorld(realityWorldId);
    shell.createGroupChat({
      groupName: "Context Group",
      selectedWorldContactIds: ["ai:first", "ai:second"]
    });

    const next = await shell.sendMessageWithAI("burst context");

    assert.equal(capturedBodies.length, 3);
    assert.equal(capturedBodies[0]?.includes("turn-1"), false);
    assert.equal(capturedBodies[1]?.includes("turn-1"), true);
    assert.equal(capturedBodies[2]?.includes("turn-2"), true);
    assert.deepEqual(next.product.chat.messages.slice(-3).map((message) => message.text), ["turn-1", "turn-2", "turn-3"]);
  });

  it("limits group burst responders to current group members and stops at one AI for one-member groups", async () => {
    const app = App.init();
    const realityWorldId = toWorldId("reality");
    app.worldDomain.applyStructuralPatch({
      type: "ai.contact.added",
      worldId: realityWorldId,
      timestamp: 9100,
      contact: {
        actorId: "ai:first",
        displayName: "First AI",
        kind: "assistant"
      }
    });
    app.worldDomain.applyStructuralPatch({
      type: "ai.contact.added",
      worldId: realityWorldId,
      timestamp: 9101,
      contact: {
        actorId: "ai:outside",
        displayName: "Outside AI",
        kind: "assistant"
      }
    });
    const shell = MinimalUiShell.init(app, { groupBurstRandom: queuedRandom([0.99, 0.99, 0.99, 0.99]) });
    shell.switchWorld(realityWorldId);
    const group = shell.createGroupChat({
      groupName: "One Member",
      selectedWorldContactIds: ["ai:first"]
    });
    const groupChatId = group.product.snapshot.chatState.activeChatId!;

    const next = await shell.sendMessageWithAI("only member");
    const messages = next.product.snapshot.chatState.chats.get(groupChatId)?.messages ?? [];

    assert.equal(messages.filter((message) => message.authorActorId !== "user").length, 1);
    assert.equal(messages.at(-1)?.authorActorId, "ai:first");
    assert.equal(messages.some((message) => message.authorActorId === "ovone"), false);
    assert.equal(messages.some((message) => message.authorActorId === "ai:outside"), false);
  });

  it("excludes removed group members from later burst responses", async () => {
    const app = App.init();
    const realityWorldId = toWorldId("reality");
    app.worldDomain.applyStructuralPatch({
      type: "ai.contact.added",
      worldId: realityWorldId,
      timestamp: 9100,
      contact: {
        actorId: "ai:first",
        displayName: "First AI",
        kind: "assistant"
      }
    });
    app.worldDomain.applyStructuralPatch({
      type: "ai.contact.added",
      worldId: realityWorldId,
      timestamp: 9101,
      contact: {
        actorId: "ai:second",
        displayName: "Second AI",
        kind: "assistant"
      }
    });
    const shell = MinimalUiShell.init(app, { groupBurstRandom: queuedRandom([0.99, 0, 0, 0]) });
    shell.switchWorld(realityWorldId);
    const group = shell.createGroupChat({
      groupName: "Removed Member",
      selectedWorldContactIds: ["ai:first", "ai:second"]
    });
    const groupChatId = group.product.snapshot.chatState.activeChatId!;
    shell.removeGroupMember({
      worldId: realityWorldId,
      groupChatId,
      worldContactId: "ai:first"
    });

    const next = await shell.sendMessageWithAI("after remove");
    const messages = next.product.snapshot.chatState.chats.get(groupChatId)?.messages ?? [];

    assert.equal(messages.filter((message) => message.text === "mock:after remove").length, 1);
    assert.equal(messages.at(-1)?.authorActorId, "ai:second");
    assert.equal(messages.some((message) => message.authorActorId === "ai:first"), false);
  });

  it("stops group bursts after a provider failure", async () => {
    let callCount = 0;
    const bridge = createAIProviderBridge({
      provider: "openai-compatible",
      baseUrl: "https://provider.invalid/v1",
      apiKey: "test-key",
      model: "trial-real"
    }, {
      fetchImpl: async () => {
        callCount += 1;
        return callCount === 1
          ? new Response(JSON.stringify({ choices: [{ message: { content: "turn-ok" } }] }), { status: 200 })
          : new Response(JSON.stringify({ error: { message: "provider down" } }), { status: 500 });
      }
    });
    const app = App.init();
    const realityWorldId = toWorldId("reality");
    app.worldDomain.applyStructuralPatch({
      type: "ai.contact.added",
      worldId: realityWorldId,
      timestamp: 9100,
      contact: {
        actorId: "ai:first",
        displayName: "First AI",
        kind: "assistant"
      }
    });
    app.worldDomain.applyStructuralPatch({
      type: "ai.contact.added",
      worldId: realityWorldId,
      timestamp: 9101,
      contact: {
        actorId: "ai:second",
        displayName: "Second AI",
        kind: "assistant"
      }
    });
    const shell = MinimalUiShell.init(app, {
      aiProviderBridge: bridge,
      groupBurstRandom: queuedRandom([0.99, 0, 0, 0])
    });
    shell.switchWorld(realityWorldId);
    shell.createGroupChat({
      groupName: "Failure Group",
      selectedWorldContactIds: ["ai:first", "ai:second"]
    });

    const next = await shell.sendMessageWithAI("fail mid-burst");
    const aiMessages = next.product.chat.messages.filter((message) => message.authorName !== "You");

    assert.equal(callCount, 2);
    assert.equal(aiMessages.length, 2);
    assert.equal(aiMessages[0]?.text, "turn-ok");
    assert.equal(aiMessages[1]?.text, "AI provider error: provider down");
  });

  it("appends provider failures clearly inside the active chat", async () => {
    const bridge = createAIProviderBridge({
      provider: "openai-compatible",
      baseUrl: "https://provider.invalid/v1",
      model: "trial-real"
    });
    const shell = MinimalUiShell.init(App.init(), { aiProviderBridge: bridge });

    const next = await shell.sendMessageWithAI("needs config");
    const errorMessage = next.product.chat.messages.at(-1);

    assert.equal(errorMessage?.authorName, "ovOne");
    assert.equal(errorMessage?.text, "AI provider error: AI provider API key is not configured.");
    assert.equal(JSON.stringify(next).includes("apiKey"), false);
  });

  it("writes AI responses only to the captured active world and chat", async () => {
    const app = App.init();
    const shell = MinimalUiShell.init(app);
    const defaultWorldId = shell.view().activeWorldId;
    const realityWorldId = toWorldId("reality");
    const defaultChatId = shell.view().product.snapshot.chatState.activeChatId!;

    await shell.sendMessageWithAI("default world only");
    const defaultAfter = shell.view();
    const realityAfter = shell.switchWorld(realityWorldId);

    assert.equal(defaultAfter.product.snapshot.chatState.chats.get(defaultChatId)?.messages.at(-1)?.text, "mock:default world only");
    assert.equal(realityAfter.product.chat.messages.some((message) => message.text === "mock:default world only"), false);

    await shell.sendMessageWithAI("reality only");
    const defaultReturned = shell.switchWorld(defaultWorldId);
    assert.equal(defaultReturned.product.snapshot.chatState.chats.get(defaultChatId)?.messages.some((message) => message.text === "mock:reality only"), false);
  });

  it("builds v1 provider prompts without memory, group rules, or group files", async () => {
    let capturedBody = "";
    const bridge = createAIProviderBridge({
      provider: "openai-compatible",
      baseUrl: "https://provider.invalid/v1",
      apiKey: "test-key",
      model: "trial-real"
    }, {
      fetchImpl: async (_url: string, init: { readonly body?: string }) => {
        capturedBody = init.body ?? "";
        return new Response(JSON.stringify({
          choices: [{ message: { content: "normalized provider response" } }]
        }), { status: 200 });
      }
    });
    const app = App.init();
    const realityWorldId = toWorldId("reality");
    app.worldDomain.applyStructuralPatch({
      type: "ai.contact.added",
      worldId: realityWorldId,
      timestamp: 9100,
      contact: {
        actorId: "ai:friend",
        displayName: "Friend",
        kind: "assistant"
      }
    });
    const shell = MinimalUiShell.init(app, { aiProviderBridge: bridge });
    shell.switchWorld(realityWorldId);
    const group = shell.createGroupChat({
      groupName: "No Context Leak",
      selectedWorldContactIds: ["ai:friend"]
    });
    const groupChatId = group.product.snapshot.chatState.activeChatId!;
    shell.saveGroupRules({
      worldId: realityWorldId,
      groupChatId,
      rulesText: "secret group rule"
    });
    shell.saveGroupFileMetadata({
      worldId: realityWorldId,
      groupChatId,
      fileName: "secret-file.pdf",
      fileType: "application/pdf",
      fileSize: 20
    });
    app.worldDomain.applyStructuralPatch({
      type: "world.settings.adjusted",
      worldId: realityWorldId,
      timestamp: 9102,
      settings: {
        memoryHint: "secret memory"
      }
    });

    await shell.sendMessageWithAI("prompt boundary");

    assert.equal(capturedBody.includes("prompt boundary"), true);
    assert.equal(capturedBody.includes("secret group rule"), false);
    assert.equal(capturedBody.includes("secret-file.pdf"), false);
    assert.equal(capturedBody.includes("secret memory"), false);
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

  it("creates current-world group chats with selected AI members and no initial messages", () => {
    const app = App.init();
    const shell = MinimalUiShell.init(app);
    const realityWorldId = toWorldId("reality");
    app.worldDomain.applyStructuralPatch({
      type: "ai.contact.added",
      worldId: realityWorldId,
      timestamp: 9100,
      contact: {
        actorId: "ai:friend",
        displayName: "Original Friend",
        kind: "assistant"
      }
    });
    const realityBefore = shell.switchWorld(realityWorldId);
    const beforeRealityGroups = realityBefore.product.snapshot.groups.length;
    const beforeRealityChats = realityBefore.product.snapshot.chatState.chats.size;

    const createdRealityGroup = shell.createGroupChat({
      groupName: "",
      selectedWorldContactIds: ["ai:friend"]
    });
    const realityGroupId = createdRealityGroup.product.snapshot.chatState.activeChatId!;
    const realityGroupChat = createdRealityGroup.product.snapshot.chatState.chats.get(realityGroupId)!;

    assert.equal(createdRealityGroup.activeWorldId, realityWorldId);
    assert.equal(createdRealityGroup.product.snapshot.groups.length, beforeRealityGroups + 1);
    assert.equal(createdRealityGroup.product.snapshot.chatState.chats.size, beforeRealityChats + 1);
    assert.equal(createdRealityGroup.product.snapshot.groups.at(-1)?.actorIds.includes("ai:friend"), true);
    assert.equal(realityGroupChat.title, "群聊");
    assert.equal(realityGroupChat.messages.length, 0);
    assert.equal(createdRealityGroup.product.inputPanel.targetChatId, realityGroupId);
    assert.equal(Boolean((createdRealityGroup.product.snapshot.runtimeState.metadata.settings.groupMemoryScopes as Record<string, unknown> | undefined)?.[realityGroupId]), true);
    assert.equal((createdRealityGroup.worldScopedSnapshot?.worlds.get(realityWorldId)?.chats.find((chat) => chat.chatId === realityGroupId) as { kind?: string } | undefined)?.kind, "group");

    const custom = shell.createWorldFromDraft({
      worldName: "Group Test World",
      worldviewSourceType: "blank",
      worldviewText: "",
      selectedAIModelIds: ["ai:friend"],
      nextMode: "random-role"
    });
    const customWorldId = custom.activeWorldId;
    const realityAfterCustomCreate = shell.switchWorld(realityWorldId);
    const customBeforeGroup = shell.switchWorld(customWorldId);

    const customGroup = shell.createGroupChat({
      groupName: "世界小队",
      selectedWorldContactIds: ["ai:friend"]
    });
    const customGroupId = customGroup.product.snapshot.chatState.activeChatId!;

    assert.equal(customGroup.activeWorldId, customWorldId);
    assert.equal(customGroup.product.snapshot.groups.at(-1)?.title, "世界小队");
    assert.equal(customGroup.product.snapshot.groups.at(-1)?.actorIds.includes("ai:friend"), true);
    assert.equal(customGroup.product.snapshot.chatState.chats.get(customGroupId)?.messages.length, 0);
    assert.equal(customGroup.product.snapshot.groups.length, customBeforeGroup.product.snapshot.groups.length + 1);

    const realityAfterCustomGroup = shell.switchWorld(realityWorldId);
    assert.equal(realityAfterCustomGroup.product.snapshot.groups.length, realityAfterCustomCreate.product.snapshot.groups.length);
    assert.equal(realityAfterCustomGroup.product.snapshot.chatState.chats.has(customGroupId), false);
  });

  it("adds a group member only to the selected current-world group", () => {
    const app = App.init();
    const shell = MinimalUiShell.init(app);
    const realityWorldId = toWorldId("reality");
    app.worldDomain.applyStructuralPatch({
      type: "ai.contact.added",
      worldId: realityWorldId,
      timestamp: 9100,
      contact: {
        actorId: "ai:friend",
        displayName: "Friend",
        kind: "assistant"
      }
    });
    app.worldDomain.applyStructuralPatch({
      type: "ai.contact.added",
      worldId: realityWorldId,
      timestamp: 9101,
      contact: {
        actorId: "ai:other",
        displayName: "Other",
        kind: "assistant"
      }
    });

    shell.switchWorld(realityWorldId);
    const created = shell.createWorldFromDraft({
      worldName: "Group Member World",
      worldviewSourceType: "blank",
      worldviewText: "",
      selectedAIModelIds: ["ai:friend", "ai:other"],
      nextMode: "random-role"
    });
    const customWorldId = created.activeWorldId;
    const group = shell.createGroupChat({
      groupName: "Member Group",
      selectedWorldContactIds: ["ai:friend"]
    });
    const groupChatId = group.product.snapshot.chatState.activeChatId!;
    const otherGroup = shell.createGroupChat({
      groupName: "Other Group",
      selectedWorldContactIds: ["ai:friend"]
    });
    const otherGroupChatId = otherGroup.product.snapshot.chatState.activeChatId!;
    const targetChatBefore = otherGroup.product.snapshot.chatState.chats.get(groupChatId)!;
    const otherChatBefore = otherGroup.product.snapshot.chatState.chats.get(otherGroupChatId)!;
    const friendPrivateChatBefore = otherGroup.product.snapshot.chatState.chats.get(`chat:${customWorldId}:ai:friend`);
    const otherPrivateChatBefore = otherGroup.product.snapshot.chatState.chats.get(`chat:${customWorldId}:ai:other`);
    const contactsBefore = otherGroup.product.snapshot.contacts;
    const metadataBefore = otherGroup.product.snapshot.runtimeState.metadata;
    const realityBefore = shell.switchWorld(realityWorldId);
    shell.switchWorld(customWorldId);

    const added = shell.addGroupMember({
      worldId: customWorldId,
      groupChatId,
      worldContactId: "ai:other"
    });

    assert.deepEqual(added.product.snapshot.groups.find((candidate) => candidate.id === groupChatId)?.actorIds, ["ai:friend", "ai:other"]);
    assert.deepEqual(resolveGroupAddMemberCandidates(groupChatId, {
      worldId: customWorldId,
      assistantActorId: added.product.snapshot.worldMeta.assistantActorId,
      contacts: added.product.snapshot.contacts,
      groups: added.product.snapshot.groups
    }), []);
    assert.deepEqual(added.product.snapshot.groups.find((candidate) => candidate.id === otherGroupChatId)?.actorIds, ["ai:friend"]);
    assert.deepEqual(added.product.snapshot.chatState.chats.get(groupChatId)?.messages, targetChatBefore.messages);
    assert.deepEqual(added.product.snapshot.chatState.chats.get(otherGroupChatId), otherChatBefore);
    assert.deepEqual(added.product.snapshot.chatState.chats.get(`chat:${customWorldId}:ai:friend`), friendPrivateChatBefore);
    assert.deepEqual(added.product.snapshot.chatState.chats.get(`chat:${customWorldId}:ai:other`), otherPrivateChatBefore);
    assert.deepEqual(added.product.snapshot.contacts, contactsBefore);
    assert.deepEqual(added.product.snapshot.runtimeState.metadata, metadataBefore);

    const realityAfter = shell.switchWorld(realityWorldId);
    assert.deepEqual(realityAfter.product.snapshot.groups, realityBefore.product.snapshot.groups);
    assert.deepEqual(realityAfter.product.snapshot.contacts, realityBefore.product.snapshot.contacts);
    assert.deepEqual(
      [...realityAfter.product.snapshot.chatState.chats.entries()],
      [...realityBefore.product.snapshot.chatState.chats.entries()]
    );
  });

  it("removes a group member only from the selected current-world group", () => {
    const app = App.init();
    const shell = MinimalUiShell.init(app);
    const realityWorldId = toWorldId("reality");
    app.worldDomain.applyStructuralPatch({
      type: "ai.contact.added",
      worldId: realityWorldId,
      timestamp: 9100,
      contact: {
        actorId: "ai:friend",
        displayName: "Friend",
        kind: "assistant"
      }
    });
    app.worldDomain.applyStructuralPatch({
      type: "ai.contact.added",
      worldId: realityWorldId,
      timestamp: 9101,
      contact: {
        actorId: "ai:other",
        displayName: "Other",
        kind: "assistant"
      }
    });

    shell.switchWorld(realityWorldId);
    const created = shell.createWorldFromDraft({
      worldName: "Group Remove World",
      worldviewSourceType: "blank",
      worldviewText: "",
      selectedAIModelIds: ["ai:friend", "ai:other"],
      nextMode: "random-role"
    });
    const customWorldId = created.activeWorldId;
    const group = shell.createGroupChat({
      groupName: "Member Group",
      selectedWorldContactIds: ["ai:friend", "ai:other"]
    });
    const groupChatId = group.product.snapshot.chatState.activeChatId!;
    const otherGroup = shell.createGroupChat({
      groupName: "Other Group",
      selectedWorldContactIds: ["ai:friend", "ai:other"]
    });
    const otherGroupChatId = otherGroup.product.snapshot.chatState.activeChatId!;
    const stateBeforeMessage = app.worldDomain.getWorldState(customWorldId);
    app.worldDomain.commitState(transition(stateBeforeMessage, {
      id: toChatEventId("event:group-remove-history"),
      type: "message.submitted",
      worldId: customWorldId,
      timestamp: 9900,
      payload: {
        chatId: toChatId(groupChatId),
        messageId: toMessageId("message:group-remove-history"),
        authorActorId: "ai:other",
        text: "Historical group line",
        createdAt: 9900
      }
    }));
    const before = shell.switchWorld(customWorldId);
    const targetChatBefore = before.product.snapshot.chatState.chats.get(groupChatId)!;
    const otherChatBefore = before.product.snapshot.chatState.chats.get(otherGroupChatId)!;
    const friendPrivateChatBefore = before.product.snapshot.chatState.chats.get(`chat:${customWorldId}:ai:friend`);
    const otherPrivateChatBefore = before.product.snapshot.chatState.chats.get(`chat:${customWorldId}:ai:other`);
    const contactsBefore = before.product.snapshot.contacts;
    const metadataBefore = before.product.snapshot.runtimeState.metadata;
    const realityBefore = shell.switchWorld(realityWorldId);
    shell.switchWorld(customWorldId);

    const removed = shell.removeGroupMember({
      worldId: customWorldId,
      groupChatId,
      worldContactId: "ai:other"
    });

    assert.deepEqual(removed.product.snapshot.groups.find((candidate) => candidate.id === groupChatId)?.actorIds, ["ai:friend"]);
    assert.deepEqual(resolveGroupAddMemberCandidates(groupChatId, {
      worldId: customWorldId,
      assistantActorId: removed.product.snapshot.worldMeta.assistantActorId,
      contacts: removed.product.snapshot.contacts,
      groups: removed.product.snapshot.groups
    }).map((candidate) => candidate.worldContactId), ["ai:other"]);
    assert.deepEqual(removed.product.snapshot.groups.find((candidate) => candidate.id === otherGroupChatId)?.actorIds, ["ai:friend", "ai:other"]);
    assert.equal(removed.product.snapshot.chatState.chats.has(groupChatId), true);
    assert.deepEqual(removed.product.snapshot.chatState.chats.get(groupChatId)?.messages, targetChatBefore.messages);
    assert.deepEqual(removed.product.snapshot.chatState.chats.get(groupChatId)?.messages.at(-1), {
      id: "message:group-remove-history",
      authorActorId: "ai:other",
      text: "Historical group line",
      createdAt: 9900
    });
    assert.deepEqual(removed.product.snapshot.chatState.chats.get(otherGroupChatId), otherChatBefore);
    assert.deepEqual(removed.product.snapshot.chatState.chats.get(`chat:${customWorldId}:ai:friend`), friendPrivateChatBefore);
    assert.deepEqual(removed.product.snapshot.chatState.chats.get(`chat:${customWorldId}:ai:other`), otherPrivateChatBefore);
    assert.deepEqual(removed.product.snapshot.contacts, contactsBefore);
    assert.deepEqual(removed.product.snapshot.runtimeState.metadata, metadataBefore);

    const realityAfter = shell.switchWorld(realityWorldId);
    assert.deepEqual(realityAfter.product.snapshot.groups, realityBefore.product.snapshot.groups);
    assert.deepEqual(realityAfter.product.snapshot.contacts, realityBefore.product.snapshot.contacts);
    assert.deepEqual(
      [...realityAfter.product.snapshot.chatState.chats.entries()],
      [...realityBefore.product.snapshot.chatState.chats.entries()]
    );
  });

  it("saves chat appearance settings only on the selected world chat", () => {
    const app = App.init();
    const shell = MinimalUiShell.init(app);
    const realityWorldId = toWorldId("reality");
    app.worldDomain.applyStructuralPatch({
      type: "ai.contact.added",
      worldId: realityWorldId,
      timestamp: 9100,
      contact: {
        actorId: "ai:friend",
        displayName: "Original Friend",
        kind: "assistant"
      }
    });
    app.worldDomain.applyStructuralPatch({
      type: "ai.contact.added",
      worldId: realityWorldId,
      timestamp: 9101,
      contact: {
        actorId: "ai:other",
        displayName: "Other Friend",
        kind: "assistant"
      }
    });

    shell.switchWorld(realityWorldId);
    const created = shell.createWorldFromDraft({
      worldName: "Appearance World",
      worldviewSourceType: "text",
      worldviewText: "A small shared place.",
      selectedAIModelIds: ["ai:friend", "ai:other"],
      nextMode: "random-role"
    });
    const customWorldId = created.activeWorldId;
    const privateChatId = `chat:${customWorldId}:ai:friend`;
    const otherPrivateChatId = `chat:${customWorldId}:ai:other`;
    const group = shell.createGroupChat({
      groupName: "Appearance Group",
      selectedWorldContactIds: ["ai:friend", "ai:other"]
    });
    const groupChatId = group.product.snapshot.chatState.activeChatId!;
    const secondGroup = shell.createGroupChat({
      groupName: "Other Group",
      selectedWorldContactIds: ["ai:friend"]
    });
    const secondGroupChatId = secondGroup.product.snapshot.chatState.activeChatId!;
    const privateMessagesBefore = secondGroup.product.snapshot.chatState.chats.get(privateChatId)?.messages;
    const groupMembersBefore = secondGroup.product.snapshot.groups.find((candidate) => candidate.id === groupChatId)?.actorIds;
    const contactsBefore = secondGroup.product.snapshot.contacts;
    const metadataBefore = secondGroup.product.snapshot.runtimeState.metadata;

    const savedPrivate = shell.saveChatAppearanceSettings({
      worldId: customWorldId,
      chatId: privateChatId,
      backgroundImageRef: "",
      backgroundColor: "#101010",
      myBubbleColor: "#202020",
      otherBubbleColor: "#303030"
    });
    assert.deepEqual(savedPrivate.product.snapshot.chatState.chats.get(privateChatId)?.appearance, {
      backgroundImageRef: "",
      backgroundColor: "#101010",
      myBubbleColor: "#202020",
      otherBubbleColor: "#303030"
    });
    assert.equal(savedPrivate.product.snapshot.chatState.chats.get(otherPrivateChatId)?.appearance, undefined);
    assert.deepEqual(savedPrivate.product.snapshot.chatState.chats.get(privateChatId)?.messages, privateMessagesBefore);
    assert.deepEqual(savedPrivate.product.snapshot.contacts, contactsBefore);
    assert.deepEqual(savedPrivate.product.snapshot.runtimeState.metadata, metadataBefore);

    const savedGroup = shell.saveChatAppearanceSettings({
      worldId: customWorldId,
      chatId: groupChatId,
      backgroundImageRef: "local:background",
      backgroundColor: "",
      myBubbleColor: "#abcdef",
      otherBubbleColor: ""
    });
    assert.deepEqual(savedGroup.product.snapshot.chatState.chats.get(groupChatId)?.appearance, {
      backgroundImageRef: "local:background",
      backgroundColor: "",
      myBubbleColor: "#abcdef",
      otherBubbleColor: ""
    });
    assert.equal(savedGroup.product.snapshot.chatState.chats.get(secondGroupChatId)?.appearance, undefined);
    assert.deepEqual(savedGroup.product.snapshot.groups.find((candidate) => candidate.id === groupChatId)?.actorIds, groupMembersBefore);

    const reality = shell.switchWorld(realityWorldId);
    const realityChatId = reality.product.snapshot.chatState.activeChatId!;
    assert.equal(reality.product.snapshot.chatState.chats.get(realityChatId)?.appearance, undefined);
    const savedReality = shell.saveChatAppearanceSettings({
      worldId: realityWorldId,
      chatId: realityChatId,
      backgroundImageRef: "",
      backgroundColor: "#ffffff",
      myBubbleColor: "",
      otherBubbleColor: ""
    });
    assert.deepEqual(savedReality.product.snapshot.chatState.chats.get(realityChatId)?.appearance, {
      backgroundImageRef: "",
      backgroundColor: "#ffffff",
      myBubbleColor: "",
      otherBubbleColor: ""
    });

    const customAfterRealitySave = shell.switchWorld(customWorldId);
    assert.deepEqual(customAfterRealitySave.product.snapshot.chatState.chats.get(privateChatId)?.appearance, {
      backgroundImageRef: "",
      backgroundColor: "#101010",
      myBubbleColor: "#202020",
      otherBubbleColor: "#303030"
    });
    assert.deepEqual(customAfterRealitySave.product.snapshot.chatState.chats.get(groupChatId)?.appearance, {
      backgroundImageRef: "local:background",
      backgroundColor: "",
      myBubbleColor: "#abcdef",
      otherBubbleColor: ""
    });
  });

  it("saves group rules only on the selected group chat", () => {
    const app = App.init();
    const shell = MinimalUiShell.init(app);
    const realityWorldId = toWorldId("reality");
    app.worldDomain.applyStructuralPatch({
      type: "ai.contact.added",
      worldId: realityWorldId,
      timestamp: 9200,
      contact: {
        actorId: "ai:friend",
        displayName: "Original Friend",
        kind: "assistant"
      }
    });
    app.worldDomain.applyStructuralPatch({
      type: "ai.contact.added",
      worldId: realityWorldId,
      timestamp: 9201,
      contact: {
        actorId: "ai:other",
        displayName: "Other Friend",
        kind: "assistant"
      }
    });

    shell.switchWorld(realityWorldId);
    const created = shell.createWorldFromDraft({
      worldName: "Group Rules World",
      worldviewSourceType: "text",
      worldviewText: "A rules test place.",
      selectedAIModelIds: ["ai:friend", "ai:other"],
      nextMode: "random-role"
    });
    const customWorldId = created.activeWorldId;
    const firstGroup = shell.createGroupChat({
      groupName: "Rules A",
      selectedWorldContactIds: ["ai:friend", "ai:other"]
    });
    const firstGroupId = firstGroup.product.snapshot.chatState.activeChatId!;
    const secondGroup = shell.createGroupChat({
      groupName: "Rules B",
      selectedWorldContactIds: ["ai:friend"]
    });
    const secondGroupId = secondGroup.product.snapshot.chatState.activeChatId!;
    const messagesBefore = secondGroup.product.snapshot.chatState.chats.get(firstGroupId)?.messages;
    const membersBefore = secondGroup.product.snapshot.groups.find((group) => group.id === firstGroupId)?.actorIds;
    const memoryBefore = secondGroup.product.snapshot.memorySummary;
    const contactsBefore = secondGroup.product.snapshot.contacts;
    const settingsBefore = secondGroup.product.snapshot.runtimeState.metadata.settings;

    const saved = shell.saveGroupRules({
      worldId: customWorldId,
      groupChatId: firstGroupId,
      rulesText: "Stay in the scene."
    });

    assert.deepEqual(saved.product.snapshot.chatState.chats.get(firstGroupId)?.groupRules, {
      rulesText: "Stay in the scene."
    });
    assert.equal(saved.product.snapshot.chatState.chats.get(secondGroupId)?.groupRules, undefined);
    assert.deepEqual(saved.product.snapshot.chatState.chats.get(firstGroupId)?.messages, messagesBefore);
    assert.deepEqual(saved.product.snapshot.groups.find((group) => group.id === firstGroupId)?.actorIds, membersBefore);
    assert.deepEqual(saved.product.snapshot.memorySummary, memoryBefore);
    assert.deepEqual(saved.product.snapshot.contacts, contactsBefore);
    assert.deepEqual(saved.product.snapshot.runtimeState.metadata.settings, settingsBefore);

    const cleared = shell.saveGroupRules({
      worldId: customWorldId,
      groupChatId: firstGroupId,
      rulesText: ""
    });
    assert.deepEqual(cleared.product.snapshot.chatState.chats.get(firstGroupId)?.groupRules, {
      rulesText: ""
    });

    const realityBefore = shell.switchWorld(realityWorldId);
    const realityGroup = shell.createGroupChat({
      groupName: "Reality Rules",
      selectedWorldContactIds: ["ai:friend"]
    });
    const realityGroupId = realityGroup.product.snapshot.chatState.activeChatId!;
    const savedReality = shell.saveGroupRules({
      worldId: realityWorldId,
      groupChatId: realityGroupId,
      rulesText: "Reality only."
    });
    assert.deepEqual(savedReality.product.snapshot.chatState.chats.get(realityGroupId)?.groupRules, {
      rulesText: "Reality only."
    });
    assert.equal(realityBefore.product.snapshot.chatState.chats.has(firstGroupId), false);

    const customAfterRealitySave = shell.switchWorld(customWorldId);
    assert.deepEqual(customAfterRealitySave.product.snapshot.chatState.chats.get(firstGroupId)?.groupRules, {
      rulesText: ""
    });
    assert.throws(() => shell.saveGroupRules({
      worldId: customWorldId,
      groupChatId: `chat:${customWorldId}:ai:friend`,
      rulesText: "Private chats cannot save group rules."
    }), /invalid group rules patch/);
  });

  it("adds group file metadata only on the selected group chat", () => {
    const app = App.init();
    const shell = MinimalUiShell.init(app);
    const realityWorldId = shell.view().activeWorldId;
    app.worldDomain.applyStructuralPatch({
      type: "ai.contact.added",
      worldId: realityWorldId,
      timestamp: 9300,
      contact: {
        actorId: "ai:friend",
        displayName: "Original Friend",
        kind: "assistant"
      }
    });
    app.worldDomain.applyStructuralPatch({
      type: "ai.contact.added",
      worldId: realityWorldId,
      timestamp: 9301,
      contact: {
        actorId: "ai:other",
        displayName: "Other Friend",
        kind: "assistant"
      }
    });

    shell.switchWorld(realityWorldId);
    const created = shell.createWorldFromDraft({
      worldName: "Group Files World",
      worldviewSourceType: "text",
      worldviewText: "A files test place.",
      selectedAIModelIds: ["ai:friend", "ai:other"],
      nextMode: "random-role"
    });
    const customWorldId = created.activeWorldId;
    const firstGroup = shell.createGroupChat({
      groupName: "Files A",
      selectedWorldContactIds: ["ai:friend", "ai:other"]
    });
    const firstGroupId = firstGroup.product.snapshot.chatState.activeChatId!;
    const secondGroup = shell.createGroupChat({
      groupName: "Files B",
      selectedWorldContactIds: ["ai:friend"]
    });
    const secondGroupId = secondGroup.product.snapshot.chatState.activeChatId!;
    const firstChatBefore = secondGroup.product.snapshot.chatState.chats.get(firstGroupId)!;
    const messagesBefore = firstChatBefore.messages;
    const membersBefore = secondGroup.product.snapshot.groups.find((group) => group.id === firstGroupId)?.actorIds;
    const rulesBefore = firstChatBefore.groupRules;
    const appearanceBefore = firstChatBefore.appearance;
    const memoryBefore = secondGroup.product.snapshot.memorySummary;
    const contactsBefore = secondGroup.product.snapshot.contacts;
    const settingsBefore = secondGroup.product.snapshot.runtimeState.metadata.settings;

    const saved = shell.saveGroupFileMetadata({
      worldId: customWorldId,
      groupChatId: firstGroupId,
      fileName: "brief.pdf",
      fileType: "application/pdf",
      fileSize: 1200
    });

    const files = saved.product.snapshot.chatState.chats.get(firstGroupId)?.groupFiles ?? [];
    assert.equal(files.length, 1);
    assert.equal(files[0]?.fileName, "brief.pdf");
    assert.equal(files[0]?.fileType, "application/pdf");
    assert.equal(files[0]?.fileSize, 1200);
    assert.equal("content" in files[0]!, false);
    assert.equal(saved.product.snapshot.chatState.chats.get(secondGroupId)?.groupFiles, undefined);
    assert.deepEqual(saved.product.snapshot.chatState.chats.get(firstGroupId)?.messages, messagesBefore);
    assert.deepEqual(saved.product.snapshot.groups.find((group) => group.id === firstGroupId)?.actorIds, membersBefore);
    assert.deepEqual(saved.product.snapshot.chatState.chats.get(firstGroupId)?.groupRules, rulesBefore);
    assert.deepEqual(saved.product.snapshot.chatState.chats.get(firstGroupId)?.appearance, appearanceBefore);
    assert.deepEqual(saved.product.snapshot.memorySummary, memoryBefore);
    assert.deepEqual(saved.product.snapshot.contacts, contactsBefore);
    assert.deepEqual(saved.product.snapshot.runtimeState.metadata.settings, settingsBefore);

    const realityGroup = shell.switchWorld(realityWorldId);
    assert.equal(realityGroup.product.snapshot.chatState.chats.has(firstGroupId), false);
    const customAfterReality = shell.switchWorld(customWorldId);
    assert.equal(customAfterReality.product.snapshot.chatState.chats.get(firstGroupId)?.groupFiles?.[0]?.fileName, "brief.pdf");
    assert.throws(() => shell.saveGroupFileMetadata({
      worldId: customWorldId,
      groupChatId: `chat:${customWorldId}:ai:friend`,
      fileName: "private.txt"
    }), /invalid file metadata command/);
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

  it("saves contact detail preferences only on the current world contact", () => {
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
      worldName: "Preference World",
      worldviewSourceType: "text",
      worldviewText: "Original worldview",
      selectedAIModelIds: [friend.actorId],
      nextMode: "random-role"
    });
    const customWorldId = created.activeWorldId;
    const customBefore = created.product.snapshot;
    const customFriendBefore = customBefore.contacts.find((contact) => contact.actorId === friend.actorId)!;
    const chatsBefore = customBefore.chatState.chats;
    const memoryBefore = customBefore.memorySummary;
    const worldViewBefore = customBefore.runtimeState.metadata.worldView;
    const settingsBefore = customBefore.runtimeState.metadata.settings;
    const linkedBefore = created.linkedAIModels;

    const savedCustom = shell.saveContactDetailPreferences({
      worldId: customWorldId,
      worldContactId: friend.actorId,
      remark: "Custom Buddy",
      perceivedPersonaNotes: "",
      answerMode: "qa",
      chatTone: "gentle",
      emojiPermission: false
    });
    const customFriend = savedCustom.product.snapshot.contacts.find((contact) => contact.actorId === friend.actorId)!;
    assert.equal(customFriend.remark, "Custom Buddy");
    assert.equal(customFriend.perceivedPersonaNotes, "");
    assert.equal(customFriend.answerMode, "qa");
    assert.equal(customFriend.chatTone, "gentle");
    assert.equal(customFriend.emojiPermission, false);
    assert.equal(customFriend.worldRoleName, customFriendBefore.worldRoleName);
    assert.equal(customFriend.worldPersonaNotes, customFriendBefore.worldPersonaNotes);
    assert.equal(savedCustom.product.snapshot.worldMeta.title, customBefore.worldMeta.title);
    assert.deepEqual(savedCustom.product.snapshot.runtimeState.metadata.worldView, worldViewBefore);
    assert.deepEqual(savedCustom.product.snapshot.runtimeState.metadata.settings, settingsBefore);
    assert.deepEqual([...savedCustom.product.snapshot.chatState.chats], [...chatsBefore]);
    assert.deepEqual(savedCustom.product.snapshot.memorySummary, memoryBefore);
    assert.deepEqual(savedCustom.linkedAIModels, linkedBefore);

    const realityAfterCustomSave = shell.switchWorld(realityWorldId);
    const realityFriendAfterCustomSave = realityAfterCustomSave.product.snapshot.contacts.find((contact) => contact.actorId === friend.actorId)!;
    assert.equal(realityFriendAfterCustomSave.remark, undefined);
    assert.equal(realityFriendAfterCustomSave.perceivedPersonaNotes, undefined);
    assert.equal(realityFriendAfterCustomSave.answerMode, undefined);
    assert.equal(realityFriendAfterCustomSave.chatTone, undefined);
    assert.equal(realityFriendAfterCustomSave.emojiPermission, undefined);

    const savedReality = shell.saveContactDetailPreferences({
      worldId: realityWorldId,
      worldContactId: friend.actorId,
      remark: "Reality Buddy",
      perceivedPersonaNotes: "New friend",
      answerMode: "conversational",
      chatTone: "direct",
      emojiPermission: true
    });
    const realityFriend = savedReality.product.snapshot.contacts.find((contact) => contact.actorId === friend.actorId)!;
    assert.equal(realityFriend.remark, "Reality Buddy");
    assert.equal(realityFriend.perceivedPersonaNotes, "New friend");
    assert.equal(realityFriend.answerMode, "conversational");
    assert.equal(realityFriend.chatTone, "direct");
    assert.equal(realityFriend.emojiPermission, true);

    const customAfterRealitySave = shell.switchWorld(customWorldId);
    const customFriendAfterRealitySave = customAfterRealitySave.product.snapshot.contacts.find((contact) => contact.actorId === friend.actorId)!;
    assert.equal(customFriendAfterRealitySave.remark, "Custom Buddy");
    assert.equal(customFriendAfterRealitySave.perceivedPersonaNotes, "");
    assert.equal(customFriendAfterRealitySave.answerMode, "qa");
    assert.equal(customFriendAfterRealitySave.chatTone, "gentle");
    assert.equal(customFriendAfterRealitySave.emojiPermission, false);
  });

  it("deletes a friend only from the current world without disconnecting global AI", () => {
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
    let realityState = app.worldDomain.getWorldState(realityWorldId);
    realityState = transition(realityState, {
      id: toChatEventId("event:test:reality-private-chat"),
      type: "chat.started",
      worldId: realityWorldId,
      timestamp: 9001,
      payload: {
        chatId: toChatId(`chat:${realityWorldId}:ai:friend`) as ChatId,
        title: "Original Friend"
      }
    });
    app.worldDomain.commitState(realityState);
    app.worldDomain.applyStructuralPatch({
      type: "world.settings.adjusted",
      worldId: realityWorldId,
      timestamp: 9002,
      settings: {
        memberMemoryScopes: {
          "ai:friend": {
            worldId: realityWorldId,
            actorId: "ai:friend",
            namespace: `world:${realityWorldId}:contact:ai:friend`,
            status: "placeholder"
          }
        }
      }
    });
    const realityBefore = shell.switchWorld(realityWorldId);
    const friend = realityBefore.product.snapshot.contacts.find((contact) => contact.actorId === "ai:friend")!;
    const linkedBefore = realityBefore.linkedAIModels;
    const created = shell.createWorldFromDraft({
      worldName: "Delete Friend World",
      worldviewSourceType: "text",
      worldviewText: "A scoped place.",
      selectedAIModelIds: [friend.actorId],
      nextMode: "random-role"
    });
    const customWorldId = created.activeWorldId;
    app.worldDomain.applyStructuralPatch({
      type: "world.settings.adjusted",
      worldId: customWorldId,
      timestamp: 9100,
      settings: {
        memberMemoryScopes: {
          "ai:friend": {
            worldId: customWorldId,
            actorId: "ai:friend",
            namespace: `world:${customWorldId}:contact:ai:friend`,
            status: "placeholder"
          }
        }
      }
    });
    const customBefore = shell.switchWorld(customWorldId);
    const otherWorld = shell.createWorldFromDraft({
      worldName: "Other Delete Friend World",
      worldviewSourceType: "text",
      worldviewText: "Another scoped place.",
      selectedAIModelIds: [friend.actorId],
      nextMode: "random-role"
    });
    const otherWorldId = otherWorld.activeWorldId;
    const otherContactsBefore = otherWorld.product.snapshot.contacts;
    const otherChatsBefore = otherWorld.product.snapshot.chatState.chats;
    const customChatId = `chat:${customWorldId}:ai:friend`;

    shell.switchWorld(customWorldId);
    const deletedCustom = shell.deleteFriend({
      worldId: customWorldId,
      worldContactId: friend.actorId
    });

    assert.equal(deletedCustom.activeWorldId, customWorldId);
    assert.equal(deletedCustom.product.snapshot.contacts.some((contact) => contact.actorId === friend.actorId), false);
    assert.equal(deletedCustom.product.snapshot.chatState.chats.has(customChatId), false);
    assert.equal(Boolean((deletedCustom.product.snapshot.runtimeState.metadata.settings.memberMemoryScopes as Record<string, unknown> | undefined)?.["ai:friend"]), false);
    assert.equal(deletedCustom.product.snapshot.groups.length, customBefore.product.snapshot.groups.length);

    const realityAfterCustomDelete = shell.switchWorld(realityWorldId);
    assert.equal(realityAfterCustomDelete.product.snapshot.contacts.some((contact) => contact.actorId === friend.actorId), true);
    assert.equal(realityAfterCustomDelete.product.snapshot.chatState.chats.has(`chat:${realityWorldId}:ai:friend`), true);
    assert.deepEqual(realityAfterCustomDelete.linkedAIModels, linkedBefore);

    const otherAfterCustomDelete = shell.switchWorld(otherWorldId);
    assert.deepEqual(otherAfterCustomDelete.product.snapshot.contacts, otherContactsBefore);
    assert.deepEqual([...otherAfterCustomDelete.product.snapshot.chatState.chats], [...otherChatsBefore]);

    shell.switchWorld(realityWorldId);
    const deletedReality = shell.deleteFriend({
      worldId: realityWorldId,
      worldContactId: friend.actorId
    });
    assert.equal(deletedReality.activeWorldId, realityWorldId);
    assert.equal(deletedReality.product.snapshot.contacts.some((contact) => contact.actorId === friend.actorId), false);
    assert.equal(deletedReality.product.snapshot.chatState.chats.has(`chat:${realityWorldId}:ai:friend`), false);
    assert.equal(Boolean((deletedReality.product.snapshot.runtimeState.metadata.settings.memberMemoryScopes as Record<string, unknown> | undefined)?.["ai:friend"]), false);
    assert.deepEqual(deletedReality.linkedAIModels, linkedBefore);

    const customAfterRealityDelete = shell.switchWorld(customWorldId);
    assert.equal(customAfterRealityDelete.product.snapshot.contacts.some((contact) => contact.actorId === friend.actorId), false);
    const otherAfterRealityDelete = shell.switchWorld(otherWorldId);
    assert.deepEqual(otherAfterRealityDelete.product.snapshot.contacts, otherContactsBefore);
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

function queuedRandom(values: readonly number[]): () => number {
  let index = 0;
  return () => {
    const value = values[index] ?? values.at(-1) ?? 0;
    index += 1;
    return value;
  };
}
