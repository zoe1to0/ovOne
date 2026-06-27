import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createBehaviorRegistry } from "../src/platform/behavior-registry.js";
import { createFlowExecutor } from "../src/platform/flow-executor.js";
import type { MinimalProductShellRuntime, MinimalProductShellView } from "../src/minimal-ui-shell/index.js";
import type { SemanticMobileState } from "../src/platform/behavior-registry.js";

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

    const transition = registry.execute({ type: "CREATE_WORLD" }, state);
    const flow = executor.run({ type: "CREATE_WORLD" }, { shell, state });

    assert.equal(transition.shouldRender, true);
    assert.equal(transition.disabledAction, "CREATE_WORLD");
    assert.equal(flow.shouldRender, false);
    assert.deepEqual(calls, []);
    assert.equal(state.activeChatId, "chat-before-disabled");
  });
});

function createState(view: MinimalProductShellView): SemanticMobileState {
  return {
    activeView: "CHAT_LIST",
    currentWorldId: view.product.snapshot.worldMeta.id,
    activeChatId: view.product.snapshot.chatState.activeChatId,
    overlay: "add-menu",
    selectedContactActorId: null,
    inputDraft: "draft",
    settingsOpen: false,
    splashVisible: false,
    view
  };
}

function createShell(sendMessage: (text: string) => MinimalProductShellView): MinimalProductShellRuntime {
  const view = createView("initial");
  return {
    openScreen: () => view,
    switchWorld: () => view,
    sendMessage,
    snapshot: () => view.product.snapshot,
    view: () => view
  };
}

function createView(activeChatId: string): MinimalProductShellView {
  const view = {
    screen: "chat",
    activeWorldId: "world",
    availableWorlds: [],
    product: {
      snapshot: {
        worldMeta: {
          id: "world",
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
          worldId: "world",
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
          id: "world",
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
        targetWorldId: "world",
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
