import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createBehaviorRegistry } from "../src/platform/behavior-registry.js";
import { createFlowExecutor } from "../src/platform/flow-executor.js";
import type { MinimalProductShellRuntime, MinimalProductShellView } from "../src/minimal-ui-shell/index.js";
import type { SemanticMobileState } from "../src/platform/behavior-registry.js";
import { toWorldId } from "../src/world-domain/index.js";

describe("FlowExecutor", () => {
  it("executes SUBMIT_MESSAGE runtime effect without BehaviorRegistry owning the shell call", () => {
    const calls: string[] = [];
    const nextView = createView("chat-after-send");
    const shell = createShell((text) => {
      calls.push(text);
      return nextView;
    });
    const state = createState(createView("chat-before-send"));
    const registry = createBehaviorRegistry();
    const executor = createFlowExecutor();

    const transition = registry.execute({ type: "SUBMIT_MESSAGE", text: "  hello flow  " }, state);
    const flow = executor.run({ type: "SUBMIT_MESSAGE", text: "  hello flow  " }, { shell, state });

    assert.equal(transition.shouldRender, true);
    assert.equal("runtimeEffect" in transition, false);
    assert.deepEqual(calls, ["hello flow"]);
    assert.equal(flow.executedFlow, "SEND_MESSAGE");
    assert.equal(flow.shouldRender, true);
    assert.equal(state.view, nextView);
    assert.equal(state.activeChatId, "chat-after-send");
    assert.equal(state.activeView, "CHAT_VIEW");
    assert.equal(state.inputDraft, "");
  });

  it("keeps TEXT_INPUT renderless and without runtime effects", () => {
    const calls: string[] = [];
    const shell = createShell((text) => {
      calls.push(text);
      return createView("unused");
    });
    const state = createState(createView("chat-before-input"));
    const registry = createBehaviorRegistry();
    const executor = createFlowExecutor();

    const transition = registry.execute({ type: "TEXT_INPUT", text: "typing" }, state);
    const flow = executor.run({ type: "TEXT_INPUT", text: "typing" }, { shell, state });

    assert.equal(transition.shouldRender, false);
    assert.equal(flow.shouldRender, false);
    assert.deepEqual(calls, []);
    assert.equal(state.inputDraft, "typing");
    assert.equal(state.activeChatId, "chat-before-input");
  });

  it("keeps disabled actions as no-op runtime flows", () => {
    const calls: string[] = [];
    const shell = createShell((text) => {
      calls.push(text);
      return createView("unused");
    });
    const state = createState(createView("chat-before-disabled"));
    const registry = createBehaviorRegistry();
    const executor = createFlowExecutor();

    const transition = registry.execute({ type: "OPEN_WORLD_EDITOR", worldId: state.currentWorldId }, state);
    const flow = executor.run({ type: "OPEN_WORLD_EDITOR", worldId: state.currentWorldId }, { shell, state });

    assert.equal(transition.shouldRender, true);
    assert.equal(transition.disabledAction, "OPEN_WORLD_EDITOR");
    assert.equal(flow.shouldRender, false);
    assert.deepEqual(calls, []);
    assert.equal(state.activeChatId, "chat-before-disabled");
  });

  it("executes SWITCH_WORLD by refreshing the runtime shell view", () => {
    const targetWorldId = toWorldId("custom:studio");
    const calls: string[] = [];
    const nextView = createView(null, targetWorldId);
    const shell = createShell(
      () => createView("unused"),
      (worldId) => {
        calls.push(worldId);
        return nextView;
      }
    );
    const state = createState(createView("chat-before-switch"));
    state.activeView = "CHAT_VIEW";
    state.activeChatId = "chat-before-switch";
    state.overlay = "ovo-control";
    state.selectedContactActorId = "actor:old";
    state.settingsOpen = true;
    const registry = createBehaviorRegistry();
    const executor = createFlowExecutor();

    const transition = registry.execute({ type: "SWITCH_WORLD", worldId: targetWorldId }, state);
    const flow = executor.run({ type: "SWITCH_WORLD", worldId: targetWorldId }, { shell, state });

    assert.equal(transition.shouldRender, true);
    assert.deepEqual(calls, [targetWorldId]);
    assert.equal(flow.executedFlow, "SWITCH_WORLD");
    assert.equal(flow.shouldRender, true);
    assert.equal(state.view, nextView);
    assert.equal(state.currentWorldId, targetWorldId);
    assert.equal(state.activeView, "CHAT_LIST");
    assert.equal(state.activeChatId, null);
    assert.equal(state.selectedContactActorId, null);
    assert.equal(state.overlay, null);
    assert.equal(state.settingsOpen, false);
  });

  it("executes random-role create world flow and clears draft after success", () => {
    const targetWorldId = toWorldId("custom:new-world");
    const nextView = createView(null, targetWorldId);
    const calls: unknown[] = [];
    const shell = createShell(
      () => createView("unused"),
      () => createView("unused"),
      (draft) => {
        calls.push(draft);
        return nextView;
      }
    );
    const state = createState(createView("chat-before-create"));
    state.overlay = null;
    state.activeView = "CREATE_WORLD_DRAFT";
    state.activeChatId = "chat-before-create";
    state.selectedContactActorId = "old-contact";
    state.settingsOpen = true;
    state.createWorldDraft = {
      worldName: "New World",
      worldviewSourceType: "blank",
      worldviewText: "",
      selectedAIModelIds: ["ai:friend"],
      nextMode: "random-role",
      detailRoleMode: "random-role",
      randomRoleSlots: [],
      selectedUserRoleSlotId: null,
      fixedRoles: []
    };
    const registry = createBehaviorRegistry();
    const executor = createFlowExecutor();

    const transition = registry.execute({ type: "CONFIRM_CREATE_WORLD_DRAFT" }, state);
    const flow = executor.run({ type: "CONFIRM_CREATE_WORLD_DRAFT" }, { shell, state });

    assert.equal(transition.shouldRender, true);
    assert.equal(flow.executedFlow, "CREATE_WORLD");
    assert.equal(flow.shouldRender, true);
    assert.equal(calls.length, 1);
    assert.equal(state.view, nextView);
    assert.equal(state.currentWorldId, targetWorldId);
    assert.equal(state.activeView, "CHAT_LIST");
    assert.equal(state.activeChatId, null);
    assert.equal(state.selectedContactActorId, null);
    assert.equal(state.overlay, null);
    assert.equal(state.settingsOpen, false);
    assert.equal(state.createWorldDraft, null);
  });

  it("does not create worlds for detailed-edit or missing-name draft confirmation", () => {
    const calls: unknown[] = [];
    const shell = createShell(
      () => createView("unused"),
      () => createView("unused"),
      (draft) => {
        calls.push(draft);
        return createView(null, toWorldId("custom:unexpected"));
      }
    );
    const executor = createFlowExecutor();

    const detailedEdit = createState(createView("chat-before-create"));
    detailedEdit.createWorldDraft = {
      worldName: "Future Edit",
      worldviewSourceType: "text",
      worldviewText: "placeholder",
      selectedAIModelIds: [],
      nextMode: "detailed-edit",
      detailRoleMode: "random-role",
      randomRoleSlots: [{ id: "role-slot:1", roleName: "", personaNotes: "" }],
      selectedUserRoleSlotId: null,
      fixedRoles: []
    };
    assert.equal(executor.run({ type: "CONFIRM_CREATE_WORLD_DRAFT" }, { shell, state: detailedEdit }).shouldRender, false);

    const missingName = createState(createView("chat-before-create"));
    missingName.createWorldDraft = {
      worldName: "   ",
      worldviewSourceType: "blank",
      worldviewText: "",
      selectedAIModelIds: [],
      nextMode: "random-role",
      detailRoleMode: "random-role",
      randomRoleSlots: [],
      selectedUserRoleSlotId: null,
      fixedRoles: []
    };
    assert.equal(executor.run({ type: "CONFIRM_CREATE_WORLD_DRAFT" }, { shell, state: missingName }).shouldRender, false);
    assert.deepEqual(calls, []);
  });

  it("executes detailed edit confirm for a valid detail draft", () => {
    const targetWorldId = toWorldId("custom:detail-world");
    const nextView = createView(null, targetWorldId);
    const calls: unknown[] = [];
    const shell = createShell(
      () => createView("unused"),
      () => createView("unused"),
      (draft) => {
        calls.push(draft);
        return nextView;
      }
    );
    const state = createState(createView("chat-before-detail-create"));
    state.activeView = "CREATE_WORLD_DETAIL_EDIT";
    state.activeChatId = "old-chat";
    state.createWorldDraft = {
      worldName: "Detail World",
      worldviewSourceType: "text",
      worldviewText: "expanded",
      selectedAIModelIds: ["ai:friend"],
      nextMode: "detailed-edit",
      detailRoleMode: "empty-role",
      randomRoleSlots: [{ id: "role-slot:1", roleName: "Watcher", personaNotes: "quiet" }],
      selectedUserRoleSlotId: "role-slot:1",
      fixedRoles: []
    };
    const registry = createBehaviorRegistry();
    const executor = createFlowExecutor();

    const transition = registry.execute({ type: "CONFIRM_CREATE_WORLD_DETAIL" }, state);
    const flow = executor.run({ type: "CONFIRM_CREATE_WORLD_DETAIL" }, { shell, state });

    assert.equal(transition.shouldRender, true);
    assert.equal(flow.executedFlow, "CREATE_WORLD");
    assert.equal(flow.shouldRender, true);
    assert.equal(calls.length, 1);
    assert.equal(state.currentWorldId, targetWorldId);
    assert.equal(state.activeView, "CHAT_LIST");
    assert.equal(state.activeChatId, null);
    assert.equal(state.createWorldDraft, null);
  });
});

function createState(view: MinimalProductShellView): SemanticMobileState {
  return {
    activeView: "CHAT_LIST",
    currentWorldId: view.product.snapshot.worldMeta.id,
    activeChatId: view.product.snapshot.chatState.activeChatId,
    overlay: "add-menu",
    selectedContactActorId: null,
    composerMode: "text",
    inputDraft: "draft",
    settingsOpen: false,
    createWorldDraft: null,
    splashVisible: false,
    view
  };
}

function createShell(
  sendMessage: (text: string) => MinimalProductShellView,
  switchWorld: (worldId: string) => MinimalProductShellView = () => createView("initial"),
  createWorldFromDraft: MinimalProductShellRuntime["createWorldFromDraft"] = () => createView("initial")
): MinimalProductShellRuntime {
  const view = createView("initial");
  return {
    openScreen: () => view,
    switchWorld,
    createWorldFromDraft,
    sendMessage,
    snapshot: () => view.product.snapshot,
    view: () => view
  };
}

function createView(activeChatId: string | null, worldId = toWorldId("world")): MinimalProductShellView {
  const view = {
    screen: "chat",
    activeWorldId: worldId,
    availableWorlds: [],
    product: {
      snapshot: {
        worldMeta: {
          id: worldId,
          title: "Reality",
          type: "reality",
          lifecycle: "active",
          ownerActorId: "owner",
          assistantActorId: "assistant",
          memoryNamespace: "memory"
        },
        contacts: [],
        groups: [],
        chatState: {
          activeChatId,
          chats: new Map()
        },
        memorySummary: {
          scope: "world",
          namespace: "memory",
          entries: []
        },
        runtimeState: {
          active: true,
          typing: false,
          pendingEvents: []
        }
      },
      worldList: {
        activeWorld: {
          worldId,
          title: "Reality",
          type: "reality",
          lifecycle: "active",
          memoryNamespace: "memory"
        }
      },
      chat: {
        chatId: activeChatId,
        title: "Chat",
        messages: []
      },
      world: {
        worldMeta: {
          id: worldId,
          title: "Reality",
          type: "reality",
          lifecycle: "active",
          ownerActorId: "owner",
          assistantActorId: "assistant",
          memoryNamespace: "memory"
        },
        contacts: [],
        groups: [],
        memorySummary: {
          scope: "world",
          namespace: "memory",
          entries: []
        },
        runtimeState: {
          active: true,
          typing: false,
          pendingEvents: []
        }
      },
      inputPanel: {
        targetWorldId: worldId,
        targetChatId: activeChatId,
        ownerActorId: "owner",
        placeholder: "message",
        canSubmit: true
      },
      experience: {
        worldEntrance: {
          state: "settled",
          visible: false,
          text: ""
        },
        contextualPresence: {
          situation: "",
          narrativeState: ""
        },
        firstInteractionHint: {
          kind: "ai-prompt",
          text: ""
        },
        aiPresence: {
          state: "IDLE",
          text: ""
        }
      }
    }
  };
  return view as unknown as MinimalProductShellView;
}
