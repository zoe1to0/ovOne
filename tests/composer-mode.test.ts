import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveComposerModes,
  resolveDefaultComposerMode,
  toggleComposerMode
} from "../src/platform/composer-mode.js";
import { createBehaviorRegistry, OVO_CHAT_ID } from "../src/platform/behavior-registry.js";
import type { SemanticMobileState } from "../src/platform/behavior-registry.js";
import { toWorldId } from "../src/world-domain/index.js";

describe("Composer mode state machine", () => {
  it("supports normal text and voice-button modes", () => {
    assert.deepEqual(resolveComposerModes("normal"), ["text", "voice-button"]);
    assert.equal(resolveDefaultComposerMode("normal"), "text");
    assert.equal(toggleComposerMode("normal", "text"), "voice-button");
    assert.equal(toggleComposerMode("normal", "voice-button"), "text");
  });

  it("supports ovO world-button and text modes with world-button default", () => {
    assert.deepEqual(resolveComposerModes("ovo"), ["world-button", "text"]);
    assert.equal(resolveDefaultComposerMode("ovo"), "world-button");
    assert.equal(toggleComposerMode("ovo", "world-button"), "text");
    assert.equal(toggleComposerMode("ovo", "text"), "world-button");
  });

  it("updates composer mode through explicit registry actions", () => {
    const registry = createBehaviorRegistry();
    const state = createState();

    assert.equal(registry.execute({ type: "TOGGLE_COMPOSER_MODE", kind: "normal" }, state).shouldRender, true);
    assert.equal(state.composerMode, "voice-button");
    assert.equal(registry.execute({ type: "TOGGLE_COMPOSER_MODE", kind: "normal" }, state).shouldRender, true);
    assert.equal(state.composerMode, "text");
    assert.equal(registry.execute({ type: "SET_COMPOSER_MODE", kind: "ovo", mode: "world-button" }, state).shouldRender, true);
    assert.equal(state.composerMode, "world-button");
    assert.equal(registry.execute({ type: "SET_COMPOSER_MODE", kind: "normal", mode: "world-button" }, state).shouldRender, true);
    assert.equal(state.composerMode, "world-button");
  });

  it("keeps text input working in text mode", () => {
    const registry = createBehaviorRegistry();
    const state = createState();

    const result = registry.execute({ type: "TEXT_INPUT", text: "hello composer" }, state);

    assert.equal(result.shouldRender, false);
    assert.equal(state.composerMode, "text");
    assert.equal(state.inputDraft, "hello composer");
  });

  it("opens ovO chat with world-button composer by default", () => {
    const registry = createBehaviorRegistry();
    const state = createState();
    state.activeView = "CONTACTS";
    state.activeChatId = "chat";
    state.selectedContactActorId = "actor";
    state.overlay = "ovo-control";
    state.settingsOpen = true;
    state.composerMode = "text";

    const result = registry.execute({ type: "OPEN_OVO_CHAT" }, state);

    assert.equal(result.shouldRender, true);
    assert.equal(state.activeView, "CHAT_VIEW");
    assert.equal(state.activeChatId, OVO_CHAT_ID);
    assert.equal(state.selectedContactActorId, null);
    assert.equal(state.overlay, null);
    assert.equal(state.settingsOpen, false);
    assert.equal(state.composerMode, "world-button");
  });

  it("opens normal chats with normal text composer by default", () => {
    const registry = createBehaviorRegistry();
    const state = createState();
    state.composerMode = "world-button";

    const result = registry.execute({ type: "OPEN_CHAT", chatId: "friend-chat" }, state);

    assert.equal(result.shouldRender, true);
    assert.equal(state.activeView, "CHAT_VIEW");
    assert.equal(state.activeChatId, "friend-chat");
    assert.equal(state.composerMode, "text");
  });

  it("opens ovO world menu and routes to switcher/editor selector overlays", () => {
    const registry = createBehaviorRegistry();
    const state = createState();
    state.activeView = "CHAT_VIEW";
    state.activeChatId = OVO_CHAT_ID;
    state.composerMode = "world-button";

    assert.equal(registry.execute({ type: "OPEN_OVO_WORLD_MENU" }, state).shouldRender, true);
    assert.equal(state.overlay, "ovo-world-menu");
    assert.equal(state.activeView, "CHAT_VIEW");
    assert.equal(state.activeChatId, OVO_CHAT_ID);

    assert.equal(registry.execute({ type: "OPEN_WORLD_SWITCHER" }, state).shouldRender, true);
    assert.equal(state.overlay, "world-switcher");

    assert.equal(registry.execute({ type: "OPEN_WORLD_EDITOR_SELECTOR" }, state).shouldRender, true);
    assert.equal(state.overlay, "world-editor-selector");
  });

  it("keeps world editor scaffold disabled without changing world state", () => {
    const registry = createBehaviorRegistry();
    const state = createState();
    state.overlay = "world-editor-selector";

    const result = registry.execute({ type: "OPEN_WORLD_EDITOR", worldId: state.currentWorldId }, state);

    assert.equal(result.shouldRender, true);
    assert.equal(result.disabledAction, "OPEN_WORLD_EDITOR");
    assert.equal(state.currentWorldId, toWorldId("reality"));
    assert.equal(state.overlay, null);
  });

  it("opens and updates create world draft without creating or switching worlds", () => {
    const registry = createBehaviorRegistry();
    const state = createState();
    const initialWorldId = state.currentWorldId;
    const worldCount = state.view.availableWorlds.length;

    assert.equal(registry.execute({ type: "OPEN_CREATE_WORLD_DRAFT" }, state).shouldRender, true);
    assert.equal(state.overlay, "create-world-draft");
    assert.equal(state.createWorldDraft?.worldName, "");
    assert.equal(state.createWorldDraft?.worldviewSourceType, "text");

    registry.execute({ type: "UPDATE_CREATE_WORLD_DRAFT", field: "worldName", value: "月面剧场" }, state);
    registry.execute({ type: "UPDATE_CREATE_WORLD_DRAFT", field: "worldviewText", value: "近未来月面城市" }, state);
    registry.execute({ type: "SELECT_WORLDVIEW_SOURCE", sourceType: "blank" }, state);
    registry.execute({ type: "TOGGLE_CREATE_WORLD_AI", aiModelId: "ai:friend" }, state);
    registry.execute({ type: "SELECT_CREATE_WORLD_NEXT_MODE", nextMode: "random-role" }, state);

    assert.equal(state.createWorldDraft?.worldName, "月面剧场");
    assert.equal(state.createWorldDraft?.worldviewText, "近未来月面城市");
    assert.equal(state.createWorldDraft?.worldviewSourceType, "blank");
    assert.deepEqual(state.createWorldDraft?.selectedAIModelIds, ["ai:friend"]);
    assert.equal(state.createWorldDraft?.nextMode, "random-role");

    registry.execute({ type: "CONFIRM_CREATE_WORLD_DRAFT" }, state);
    assert.equal(state.overlay, "create-world-draft");
    assert.equal(state.currentWorldId, initialWorldId);
    assert.equal(state.view.availableWorlds.length, worldCount);
  });

  it("cancels create world draft and clears draft state", () => {
    const registry = createBehaviorRegistry();
    const state = createState();

    registry.execute({ type: "OPEN_CREATE_WORLD_DRAFT" }, state);
    registry.execute({ type: "UPDATE_CREATE_WORLD_DRAFT", field: "worldName", value: "temporary" }, state);
    registry.execute({ type: "CANCEL_CREATE_WORLD_DRAFT" }, state);

    assert.equal(state.overlay, null);
    assert.equal(state.createWorldDraft, null);
    assert.equal(state.currentWorldId, toWorldId("reality"));
  });

  it("does not change world switching behavior", () => {
    const registry = createBehaviorRegistry();
    const state = createState();
    state.composerMode = "voice-button";
    state.activeView = "CHAT_VIEW";
    state.activeChatId = "chat";
    state.selectedContactActorId = "actor";
    state.overlay = "ovo-control";

    registry.execute({ type: "SWITCH_WORLD", worldId: toWorldId("custom:studio") }, state);

    assert.equal(state.composerMode, "voice-button");
    assert.equal(state.activeView, "CHAT_LIST");
    assert.equal(state.activeChatId, null);
    assert.equal(state.selectedContactActorId, null);
    assert.equal(state.overlay, null);
  });
});

function createState(): SemanticMobileState {
  const worldId = toWorldId("reality");
  return {
    activeView: "CHAT_LIST",
    currentWorldId: worldId,
    activeChatId: null,
    overlay: null,
    selectedContactActorId: null,
    composerMode: "text",
    inputDraft: "",
    settingsOpen: false,
    createWorldDraft: null,
    splashVisible: false,
    view: {
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
            assistantActorId: "assistant"
          },
          contacts: [],
          groups: [],
          chatState: {
            activeChatId: null,
            chats: new Map()
          },
          memorySummary: {
            scope: {
              worldId,
              namespace: "world:reality"
            },
            namespace: "world:reality"
          },
          runtimeState: {
            metadata: {
              title: "Reality",
              type: "reality",
              worldView: {},
              settings: {},
              personaOverlays: {}
            },
            activeChatId: null
          }
        },
        worldList: {
          activeWorld: {
            worldId,
            title: "Reality",
            type: "reality",
            lifecycle: "active",
            memoryNamespace: "world:reality"
          }
        },
        chat: {
          chatId: null,
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
            assistantActorId: "assistant"
          },
          contacts: [],
          groups: [],
          memorySummary: {
            scope: {
              worldId,
              namespace: "world:reality"
            },
            namespace: "world:reality"
          },
          runtimeState: {
            metadata: {
              title: "Reality",
              type: "reality",
              worldView: {},
              settings: {},
              personaOverlays: {}
            },
            activeChatId: null
          }
        },
        inputPanel: {
          targetWorldId: worldId,
          targetChatId: null,
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
    }
  };
}
