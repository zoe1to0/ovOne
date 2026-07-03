import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createBehaviorRegistry } from "../src/platform/behavior-registry.js";
import { createFlowExecutor } from "../src/platform/flow-executor.js";
import { CHAT_SETTINGS_SAVE_SUCCESS_MESSAGE, CONTACT_DETAIL_SAVE_SUCCESS_MESSAGE, GROUP_RULES_SAVE_SUCCESS_MESSAGE, WORLD_EDITOR_NAME_REQUIRED_MESSAGE, WORLD_EDITOR_SAVE_SUCCESS_MESSAGE } from "../src/domain/index.js";
import { GROUP_MEMBER_ADD_SUCCESS_MESSAGE } from "../src/minimal-ui-shell/group-member-service.js";
import { WORLD_MEMBER_ADD_SUCCESS_MESSAGE } from "../src/minimal-ui-shell/world-member-service.js";
import { WORLD_MEMBER_REMOVE_SUCCESS_MESSAGE } from "../src/minimal-ui-shell/world-member-remove-service.js";
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

    const transition = registry.execute({ type: "CHAT_OPEN_SETTINGS" }, state);
    const flow = executor.run({ type: "CHAT_OPEN_SETTINGS" }, { shell, state });

    assert.equal(transition.shouldRender, true);
    assert.equal(transition.disabledAction, "CHAT_OPEN_SETTINGS");
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

  it("executes SAVE_WORLD_EDITOR through the runtime metadata save boundary", () => {
    const targetWorldId = toWorldId("custom:studio");
    const nextView = createView(null, toWorldId("reality"));
    const metadataCalls: unknown[] = [];
    const roleCalls: unknown[] = [];
    const shell = createShell(
      () => createView("unused"),
      () => createView("unused"),
      () => createView("unused"),
      (patch) => {
        metadataCalls.push(patch);
        return nextView;
      },
      undefined,
      undefined,
      (patch) => {
        roleCalls.push(patch);
        return nextView;
      }
    );
    const state = createState(createView("chat-before-save", toWorldId("reality")));
    state.activeView = "WORLD_EDITOR";
    state.selectedWorldIdForEditing = targetWorldId;
    state.activeChatId = "old-chat";
    state.overlay = "world-editor-selector";
    state.settingsOpen = true;
    state.worldEditorDraft = {
      worldId: targetWorldId,
      worldName: " Studio ",
      worldviewText: "Next worldview",
      originalWorldviewText: "Old worldview",
      locked: false,
      fieldErrors: { worldName: null },
      warnings: [],
      noticeMessage: null,
      userRole: {
        roleName: "Traveler",
        personaNotes: "New arrival"
      },
      memberRoles: [
        {
          worldContactId: "ai:friend",
          worldRoleName: "Guide",
          worldPersonaNotes: "Knows the city"
        }
      ],
      removeMemberConfirmation: null
    };
    const registry = createBehaviorRegistry();
    const executor = createFlowExecutor();

    const transition = registry.execute({ type: "SAVE_WORLD_EDITOR" }, state);
    const flow = executor.run({ type: "SAVE_WORLD_EDITOR" }, { shell, state });

    assert.equal(transition.shouldRender, true);
    assert.equal(flow.executedFlow, "SAVE_WORLD_METADATA");
    assert.equal(flow.shouldRender, true);
    assert.deepEqual(metadataCalls, [{ worldId: targetWorldId, name: "Studio", worldview: "Next worldview" }]);
    assert.deepEqual(roleCalls, [{
      worldId: targetWorldId,
      userRole: {
        roleName: "Traveler",
        personaNotes: "New arrival"
      },
      memberRoles: [
        {
          worldContactId: "ai:friend",
          worldRoleName: "Guide",
          worldPersonaNotes: "Knows the city"
        }
      ]
    }]);
    assert.equal(state.view, nextView);
    assert.equal(state.currentWorldId, toWorldId("reality"));
    assert.equal(state.activeView, "WORLD_EDITOR");
    assert.equal(state.activeChatId, null);
    assert.equal(state.overlay, null);
    assert.equal(state.settingsOpen, false);
    assert.equal(state.selectedWorldIdForEditing, targetWorldId);
    assert.equal(state.worldEditorDraft?.noticeMessage, WORLD_EDITOR_SAVE_SUCCESS_MESSAGE);
    assert.equal(state.worldEditorDraft?.originalWorldviewText, "Next worldview");
  });

  it("does not execute metadata save when World Editor validation fails", () => {
    const calls: unknown[] = [];
    const shell = createShell(
      () => createView("unused"),
      () => createView("unused"),
      () => createView("unused"),
      (patch) => {
        calls.push(patch);
        return createView("unused");
      }
    );
    const state = createState(createView("chat-before-save"));
    state.activeView = "WORLD_EDITOR";
    state.worldEditorDraft = {
      worldId: toWorldId("custom:studio"),
      worldName: " ",
      worldviewText: "",
      originalWorldviewText: "Old",
      locked: false,
      fieldErrors: { worldName: null },
      warnings: [],
      noticeMessage: null,
      removeMemberConfirmation: null
    };

    createBehaviorRegistry().execute({ type: "SAVE_WORLD_EDITOR" }, state);
    const flow = createFlowExecutor().run({ type: "SAVE_WORLD_EDITOR" }, { shell, state });

    assert.equal(flow.shouldRender, false);
    assert.deepEqual(calls, []);
    assert.equal(state.worldEditorDraft?.fieldErrors.worldName, WORLD_EDITOR_NAME_REQUIRED_MESSAGE);
  });

  it("executes SAVE_CONTACT_DETAIL_PREFERENCES through the runtime preference save boundary", () => {
    const targetWorldId = toWorldId("custom:studio");
    const nextView = createView(null, targetWorldId);
    const calls: unknown[] = [];
    const shell = createShell(
      () => createView("unused"),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      (patch) => {
        calls.push(patch);
        return nextView;
      }
    );
    const state = createState(createView("chat-before-contact-save", targetWorldId));
    state.view = {
      ...state.view,
      product: {
        ...state.view.product,
        snapshot: {
          ...state.view.product.snapshot,
          contacts: [
            {
              worldId: targetWorldId,
              actorId: "ai:friend",
              displayName: "Friend",
              kind: "assistant",
              outputMode: "Dialogue"
            } as never
          ]
        }
      }
    };
    state.activeView = "CONTACT_DETAIL";
    state.activeChatId = "old-chat";
    state.selectedContactActorId = "ai:friend";
    state.overlay = "add-menu";
    state.settingsOpen = true;
    state.contactDetailDraft = {
      worldId: targetWorldId,
      worldContactId: "ai:friend",
      remark: "Buddy",
      perceivedPersonaNotes: "",
      answerMode: "qa",
      chatTone: "gentle",
      emojiPermission: false,
      noticeMessage: null,
      deleteFriendConfirmation: {
        worldContactId: "ai:friend",
        displayName: "Friend",
        warning: "warning"
      }
    };
    const registry = createBehaviorRegistry();
    const executor = createFlowExecutor();

    const transition = registry.execute({ type: "SAVE_CONTACT_DETAIL_PREFERENCES" }, state);
    const flow = executor.run({ type: "SAVE_CONTACT_DETAIL_PREFERENCES" }, { shell, state });

    assert.equal(transition.shouldRender, true);
    assert.deepEqual(calls, [{
      worldId: targetWorldId,
      worldContactId: "ai:friend",
      remark: "Buddy",
      perceivedPersonaNotes: "",
      answerMode: "qa",
      chatTone: "gentle",
      emojiPermission: false
    }]);
    assert.equal(flow.executedFlow, "SAVE_CONTACT_DETAIL_PREFERENCES");
    assert.equal(flow.shouldRender, true);
    assert.equal(state.view, nextView);
    assert.equal(state.activeView, "CONTACT_DETAIL");
    assert.equal(state.activeChatId, null);
    assert.equal(state.selectedContactActorId, "ai:friend");
    assert.equal(state.overlay, null);
    assert.equal(state.settingsOpen, false);
    assert.equal(state.contactDetailDraft.noticeMessage, CONTACT_DETAIL_SAVE_SUCCESS_MESSAGE);
    assert.equal(state.contactDetailDraft.deleteFriendConfirmation, null);
  });

  it("executes SAVE_CHAT_SETTINGS through the runtime appearance save boundary", () => {
    const targetWorldId = toWorldId("custom:studio");
    const nextView = createView("chat:studio", targetWorldId);
    const calls: unknown[] = [];
    const shell = createShell(
      () => createView("unused"),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      (patch) => {
        calls.push(patch);
        return nextView;
      }
    );
    const state = createState(createView("chat:studio", targetWorldId));
    state.view = {
      ...state.view,
      product: {
        ...state.view.product,
        snapshot: {
          ...state.view.product.snapshot,
          chatState: {
            activeChatId: "chat:studio",
            chats: new Map([[
              "chat:studio",
              {
                id: "chat:studio",
                worldId: targetWorldId,
                title: "Studio",
                messages: []
              }
            ]])
          }
        }
      }
    };
    state.activeView = "CHAT_SETTINGS";
    state.activeChatId = "chat:studio";
    state.selectedChatIdForSettings = "chat:studio";
    state.overlay = "chat-menu";
    state.settingsOpen = true;
    state.chatSettingsDraft = {
      chatId: "chat:studio",
      groupRulesText: "",
      backgroundImagePlaceholder: "local:background",
      backgroundColor: "#111111",
      myBubbleColor: "#222222",
      otherBubbleColor: "#333333",
      groupMemberRemoveConfirmation: null,
      noticeMessage: null
    };
    const registry = createBehaviorRegistry();
    const executor = createFlowExecutor();

    const transition = registry.execute({ type: "SAVE_CHAT_SETTINGS" }, state);
    const flow = executor.run({ type: "SAVE_CHAT_SETTINGS" }, { shell, state });

    assert.equal(transition.shouldRender, true);
    assert.deepEqual(calls, [{
      worldId: targetWorldId,
      chatId: "chat:studio",
      backgroundImageRef: "local:background",
      backgroundColor: "#111111",
      myBubbleColor: "#222222",
      otherBubbleColor: "#333333"
    }]);
    assert.equal(flow.executedFlow, "SAVE_CHAT_SETTINGS");
    assert.equal(flow.shouldRender, true);
    assert.equal(state.view, nextView);
    assert.equal(state.currentWorldId, targetWorldId);
    assert.equal(state.activeView, "CHAT_SETTINGS");
    assert.equal(state.activeChatId, "chat:studio");
    assert.equal(state.selectedChatIdForSettings, "chat:studio");
    assert.equal(state.overlay, null);
    assert.equal(state.settingsOpen, false);
    assert.equal(state.chatSettingsDraft.noticeMessage, CHAT_SETTINGS_SAVE_SUCCESS_MESSAGE);
  });

  it("executes SAVE_GROUP_RULES through the runtime group rules save boundary", () => {
    const targetWorldId = toWorldId("custom:studio");
    const nextView = createView("group:studio:1", targetWorldId);
    const calls: unknown[] = [];
    const shell = createShell(
      () => createView("unused"),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      (patch) => {
        calls.push(patch);
        return nextView;
      }
    );
    const state = createState(createView("group:studio:1", targetWorldId));
    state.view = {
      ...state.view,
      product: {
        ...state.view.product,
        snapshot: {
          ...state.view.product.snapshot,
          groups: [
            {
              id: "group:studio:1",
              title: "Studio Group",
              actorIds: ["ai:friend"]
            }
          ],
          chatState: {
            activeChatId: "group:studio:1",
            chats: new Map([[
              "group:studio:1",
              {
                id: "group:studio:1",
                worldId: targetWorldId,
                title: "Studio Group",
                messages: []
              }
            ]])
          }
        }
      }
    };
    state.activeView = "CHAT_SETTINGS";
    state.activeChatId = "group:studio:1";
    state.selectedChatIdForSettings = "group:studio:1";
    state.overlay = "chat-menu";
    state.settingsOpen = true;
    state.chatSettingsDraft = {
      chatId: "group:studio:1",
      groupRulesText: "Stay in character.",
      backgroundImagePlaceholder: "",
      backgroundColor: "#ffffff",
      myBubbleColor: "#dcecff",
      otherBubbleColor: "#f2f2f2",
      groupMemberRemoveConfirmation: null,
      noticeMessage: null
    };
    const registry = createBehaviorRegistry();
    const executor = createFlowExecutor();

    const transition = registry.execute({ type: "SAVE_GROUP_RULES" }, state);
    const flow = executor.run({ type: "SAVE_GROUP_RULES" }, { shell, state });

    assert.equal(transition.shouldRender, true);
    assert.deepEqual(calls, [{
      worldId: targetWorldId,
      groupChatId: "group:studio:1",
      rulesText: "Stay in character."
    }]);
    assert.equal(flow.executedFlow, "SAVE_GROUP_RULES");
    assert.equal(flow.shouldRender, true);
    assert.equal(state.view, nextView);
    assert.equal(state.currentWorldId, targetWorldId);
    assert.equal(state.activeView, "CHAT_SETTINGS");
    assert.equal(state.activeChatId, "group:studio:1");
    assert.equal(state.selectedChatIdForSettings, "group:studio:1");
    assert.equal(state.overlay, null);
    assert.equal(state.settingsOpen, false);
    assert.equal(state.chatSettingsDraft.noticeMessage, GROUP_RULES_SAVE_SUCCESS_MESSAGE);
  });

  it("executes CONFIRM_GROUP_ADD_MEMBER through the runtime group member boundary", () => {
    const targetWorldId = toWorldId("custom:studio");
    const nextView = createView("group:studio:1", targetWorldId);
    const calls: unknown[] = [];
    const shell = createShell(
      () => createView("unused"),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      (command) => {
        calls.push(command);
        return nextView;
      }
    );
    const state = createState(createView("group:studio:1", targetWorldId));
    state.view = {
      ...state.view,
      product: {
        ...state.view.product,
        snapshot: {
          ...state.view.product.snapshot,
          contacts: [
            {
              worldId: targetWorldId,
              actorId: "ai:one",
              displayName: "One",
              kind: "assistant",
              outputMode: "Dialogue"
            },
            {
              worldId: targetWorldId,
              actorId: "ai:two",
              displayName: "Two",
              kind: "assistant",
              outputMode: "Dialogue"
            }
          ] as never,
          groups: [
            {
              id: "group:studio:1",
              title: "Studio Group",
              actorIds: ["ai:one"]
            }
          ],
          chatState: {
            activeChatId: "group:studio:1",
            chats: new Map([[
              "group:studio:1",
              {
                id: "group:studio:1",
                worldId: targetWorldId,
                title: "Studio Group",
                messages: []
              }
            ]])
          }
        }
      }
    };
    state.activeView = "CHAT_SETTINGS";
    state.activeChatId = "group:studio:1";
    state.selectedChatIdForSettings = "group:studio:1";
    state.overlay = "chat-menu";
    state.settingsOpen = true;
    state.chatSettingsDraft = {
      chatId: "group:studio:1",
      groupRulesText: "",
      backgroundImagePlaceholder: "",
      backgroundColor: "#ffffff",
      myBubbleColor: "#dcecff",
      otherBubbleColor: "#f2f2f2",
      groupMemberRemoveConfirmation: null,
      noticeMessage: null
    };
    const registry = createBehaviorRegistry();
    const executor = createFlowExecutor();

    const transition = registry.execute({ type: "CONFIRM_GROUP_ADD_MEMBER", worldContactId: "ai:two" }, state);
    const flow = executor.run({ type: "CONFIRM_GROUP_ADD_MEMBER", worldContactId: "ai:two" }, { shell, state });

    assert.equal(transition.shouldRender, true);
    assert.deepEqual(calls, [{
      worldId: targetWorldId,
      groupChatId: "group:studio:1",
      worldContactId: "ai:two"
    }]);
    assert.equal(flow.executedFlow, "ADD_GROUP_MEMBER");
    assert.equal(flow.shouldRender, true);
    assert.equal(state.view, nextView);
    assert.equal(state.currentWorldId, targetWorldId);
    assert.equal(state.activeView, "CHAT_SETTINGS");
    assert.equal(state.activeChatId, "group:studio:1");
    assert.equal(state.selectedChatIdForSettings, "group:studio:1");
    assert.equal(state.overlay, null);
    assert.equal(state.settingsOpen, false);
    assert.equal(state.chatSettingsDraft.noticeMessage, GROUP_MEMBER_ADD_SUCCESS_MESSAGE);
  });

  it("executes CONFIRM_DELETE_FRIEND only with matching contact detail confirmation", () => {
    const targetWorldId = toWorldId("custom:studio");
    const nextView = createView(`chat:${targetWorldId}:other`, targetWorldId);
    const calls: unknown[] = [];
    const shell = createShell(
      () => createView("unused"),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      (command) => {
        calls.push(command);
        return nextView;
      }
    );
    const state = createState(createView(`chat:${targetWorldId}:ai:friend`, targetWorldId));
    state.view = {
      ...state.view,
      product: {
        ...state.view.product,
        snapshot: {
          ...state.view.product.snapshot,
          contacts: [
            {
              worldId: targetWorldId,
              actorId: "ai:friend",
              displayName: "Friend",
              kind: "assistant",
              outputMode: "Dialogue"
            } as never
          ]
        }
      }
    };
    state.activeView = "CONTACT_DETAIL";
    state.activeChatId = `chat:${targetWorldId}:ai:friend`;
    state.selectedContactActorId = "ai:friend";
    state.overlay = "add-menu";
    state.settingsOpen = true;
    state.contactDetailDraft = {
      worldId: targetWorldId,
      worldContactId: "ai:friend",
      remark: "",
      perceivedPersonaNotes: "",
      answerMode: "conversational",
      chatTone: "",
      emojiPermission: true,
      noticeMessage: null,
      deleteFriendConfirmation: {
        worldContactId: "ai:friend",
        displayName: "Friend",
        warning: "warning"
      }
    };
    const registry = createBehaviorRegistry();
    const executor = createFlowExecutor();

    const transition = registry.execute({
      type: "CONFIRM_DELETE_FRIEND",
      worldId: targetWorldId,
      worldContactId: "ai:friend"
    }, state);
    const flow = executor.run({
      type: "CONFIRM_DELETE_FRIEND",
      worldId: targetWorldId,
      worldContactId: "ai:friend"
    }, { shell, state });

    assert.equal(transition.shouldRender, true);
    assert.deepEqual(calls, [{ worldId: targetWorldId, worldContactId: "ai:friend" }]);
    assert.equal(flow.executedFlow, "DELETE_FRIEND");
    assert.equal(flow.shouldRender, true);
    assert.equal(state.view, nextView);
    assert.equal(state.currentWorldId, targetWorldId);
    assert.equal(state.activeView, "CONTACTS");
    assert.equal(state.activeChatId, null);
    assert.equal(state.selectedContactActorId, null);
    assert.equal(state.overlay, null);
    assert.equal(state.settingsOpen, false);
    assert.equal(state.contactDetailDraft, null);
  });

  it("does not execute delete friend without confirmation", () => {
    const calls: unknown[] = [];
    const shell = createShell(
      () => createView("unused"),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      (command) => {
        calls.push(command);
        return createView("unused");
      }
    );
    const state = createState(createView("chat-before-delete"));
    state.contactDetailDraft = {
      worldId: state.currentWorldId,
      worldContactId: "ai:friend",
      remark: "",
      perceivedPersonaNotes: "",
      answerMode: "conversational",
      chatTone: "",
      emojiPermission: true,
      noticeMessage: null,
      deleteFriendConfirmation: null
    };

    const flow = createFlowExecutor().run({
      type: "CONFIRM_DELETE_FRIEND",
      worldId: state.currentWorldId,
      worldContactId: "ai:friend"
    }, { shell, state });

    assert.equal(flow.shouldRender, false);
    assert.deepEqual(calls, []);
  });

  it("executes ADD_WORLD_MEMBER through the runtime member boundary", () => {
    const targetWorldId = toWorldId("custom:studio");
    const nextView = createView(null, toWorldId("reality"));
    const calls: unknown[] = [];
    const shell = createShell(
      () => createView("unused"),
      () => createView("unused"),
      () => createView("unused"),
      () => createView("unused"),
      (command) => {
        calls.push(command);
        return nextView;
      }
    );
    const state = createState(createView("chat-before-add", toWorldId("reality")));
    state.activeView = "WORLD_EDITOR";
    state.selectedWorldIdForEditing = targetWorldId;
    state.activeChatId = "old-chat";
    state.overlay = "world-editor-selector";
    state.settingsOpen = true;
    state.view = {
      ...state.view,
      availableWorlds: [
        {
          worldId: targetWorldId,
          title: "Studio",
          type: "custom",
          memberActorIds: []
        }
      ],
      linkedAIModels: [
        {
          globalAILinkId: "link:ai:friend",
          globalAIModelId: "ai:friend",
          actorId: "ai:friend",
          displayName: "Friend"
        }
      ]
    };
    state.worldEditorDraft = {
      worldId: targetWorldId,
      worldName: "Studio",
      worldviewText: "",
      originalWorldviewText: "",
      locked: false,
      fieldErrors: { worldName: null },
      warnings: [],
      noticeMessage: null,
      removeMemberConfirmation: null
    };
    const registry = createBehaviorRegistry();
    const executor = createFlowExecutor();

    const transition = registry.execute({ type: "ADD_WORLD_MEMBER", worldId: targetWorldId, globalAILinkId: "link:ai:friend" }, state);
    const flow = executor.run({ type: "ADD_WORLD_MEMBER", worldId: targetWorldId, globalAILinkId: "link:ai:friend" }, { shell, state });

    assert.equal(transition.shouldRender, true);
    assert.equal(flow.executedFlow, "ADD_WORLD_MEMBER");
    assert.equal(flow.shouldRender, true);
    assert.deepEqual(calls, [{ worldId: targetWorldId, globalAILinkId: "link:ai:friend" }]);
    assert.equal(state.view, nextView);
    assert.equal(state.currentWorldId, toWorldId("reality"));
    assert.equal(state.activeView, "WORLD_EDITOR");
    assert.equal(state.activeChatId, null);
    assert.equal(state.overlay, null);
    assert.equal(state.settingsOpen, false);
    assert.equal(state.selectedWorldIdForEditing, targetWorldId);
    assert.equal(state.worldEditorDraft?.noticeMessage, WORLD_MEMBER_ADD_SUCCESS_MESSAGE);
  });

  it("executes CONFIRM_REMOVE_WORLD_MEMBER only with matching confirmation state", () => {
    const targetWorldId = toWorldId("custom:studio");
    const deletedChatId = `chat:${targetWorldId}:ai:friend`;
    const nextView = createView(null, targetWorldId);
    const calls: unknown[] = [];
    const shell = createShell(
      () => createView("unused"),
      () => createView("unused"),
      () => createView("unused"),
      () => createView("unused"),
      () => createView("unused"),
      (command) => {
        calls.push(command);
        return nextView;
      }
    );
    const state = createState(createView(deletedChatId, targetWorldId));
    state.activeView = "WORLD_EDITOR";
    state.activeChatId = deletedChatId;
    state.selectedWorldIdForEditing = targetWorldId;
    state.worldEditorDraft = {
      worldId: targetWorldId,
      worldName: "Studio",
      worldviewText: "",
      originalWorldviewText: "",
      locked: false,
      fieldErrors: { worldName: null },
      warnings: [],
      noticeMessage: null,
      removeMemberConfirmation: {
        actorId: "ai:friend",
        displayName: "Friend",
        warning: "warning"
      }
    };

    const flow = createFlowExecutor().run(
      { type: "CONFIRM_REMOVE_WORLD_MEMBER", worldId: targetWorldId, actorId: "ai:friend" },
      { shell, state }
    );

    assert.equal(flow.executedFlow, "REMOVE_WORLD_MEMBER");
    assert.equal(flow.shouldRender, true);
    assert.deepEqual(calls, [{ worldId: targetWorldId, actorId: "ai:friend" }]);
    assert.equal(state.view, nextView);
    assert.equal(state.currentWorldId, targetWorldId);
    assert.equal(state.activeView, "CHAT_LIST");
    assert.equal(state.activeChatId, null);
    assert.equal(state.worldEditorDraft?.noticeMessage, WORLD_MEMBER_REMOVE_SUCCESS_MESSAGE);
    assert.equal(state.worldEditorDraft?.removeMemberConfirmation, null);
  });

  it("does not execute remove-member without confirmation", () => {
    const calls: unknown[] = [];
    const shell = createShell(
      () => createView("unused"),
      () => createView("unused"),
      () => createView("unused"),
      () => createView("unused"),
      () => createView("unused"),
      (command) => {
        calls.push(command);
        return createView("unused");
      }
    );
    const state = createState(createView("chat-before-remove"));
    state.worldEditorDraft = {
      worldId: toWorldId("custom:studio"),
      worldName: "Studio",
      worldviewText: "",
      originalWorldviewText: "",
      locked: false,
      fieldErrors: { worldName: null },
      warnings: [],
      noticeMessage: null,
      removeMemberConfirmation: null
    };

    const flow = createFlowExecutor().run(
      { type: "CONFIRM_REMOVE_WORLD_MEMBER", worldId: toWorldId("custom:studio"), actorId: "ai:friend" },
      { shell, state }
    );

    assert.equal(flow.shouldRender, false);
    assert.deepEqual(calls, []);
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
      fixedRoles: [],
      validationError: null,
      fieldErrors: emptyFieldErrors(),
      noticeMessage: null
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
    assert.equal("validationError" in (calls[0] as Record<string, unknown>), false);
    assert.equal(state.currentWorldId, targetWorldId);
    assert.equal(state.activeView, "CHAT_LIST");
    assert.equal(state.activeChatId, null);
    assert.equal(state.selectedContactActorId, null);
    assert.equal(state.overlay, null);
    assert.equal(state.settingsOpen, false);
    assert.equal(state.createWorldDraft, null);
    assert.equal(state.worldCreationTransition?.worldId, targetWorldId);
    assert.equal(state.worldCreationTransition?.worldName, "New World");
    assert.equal(state.worldCreationTransition?.loadingText, "New World 载入中…");
    assert.equal(state.worldCreationTransition?.welcomeText, "欢迎来到 New World。");
    assert.equal(state.worldCreationTransition?.phase, "welcome");
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
      selectedAIModelIds: ["ai:friend"],
      nextMode: "detailed-edit",
      detailRoleMode: "random-role",
      randomRoleSlots: [{ id: "role-slot:1", roleName: "", personaNotes: "" }],
      selectedUserRoleSlotId: null,
      fixedRoles: [],
      validationError: null,
      fieldErrors: emptyFieldErrors(),
      noticeMessage: null
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
      fixedRoles: [],
      validationError: null,
      fieldErrors: emptyFieldErrors(),
      noticeMessage: null
    };
    assert.equal(executor.run({ type: "CONFIRM_CREATE_WORLD_DRAFT" }, { shell, state: missingName }).shouldRender, false);
    assert.equal(missingName.createWorldDraft.validationError, "请输入世界名称");
    assert.deepEqual(calls, []);
  });

  it("does not create worlds when no AI friend is selected", () => {
    const calls: unknown[] = [];
    const shell = createShell(
      () => createView("unused"),
      () => createView("unused"),
      (draft) => {
        calls.push(draft);
        return createView(null, toWorldId("custom:unexpected"));
      }
    );
    const state = createState(createView("chat-before-create"));
    state.activeView = "CREATE_WORLD_DRAFT";
    state.createWorldDraft = {
      worldName: "No AI World",
      worldviewSourceType: "text",
      worldviewText: "placeholder",
      selectedAIModelIds: [],
      nextMode: "random-role",
      detailRoleMode: "random-role",
      randomRoleSlots: [],
      selectedUserRoleSlotId: null,
      fixedRoles: [],
      validationError: null,
      fieldErrors: emptyFieldErrors(),
      noticeMessage: null
    };

    const flow = createFlowExecutor().run({ type: "CONFIRM_CREATE_WORLD_DRAFT" }, { shell, state });

    assert.equal(flow.shouldRender, false);
    assert.equal(state.activeView, "CREATE_WORLD_DRAFT");
    assert.equal(state.createWorldDraft.validationError, "请选择至少一个 AI 朋友");
    assert.equal(state.createWorldDraft.fieldErrors.selectedAI, "请选择至少一个 AI 朋友");
    assert.deepEqual(calls, []);
  });

  it("executes create group only after member validation and enters the new group chat", () => {
    const nextView = createView("group:world:1");
    const calls: unknown[] = [];
    const shell = createShell(
      () => createView("unused"),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      (input) => {
        calls.push(input);
        return nextView;
      }
    );
    const state = createState(createView(null));
    const registry = createBehaviorRegistry();
    const executor = createFlowExecutor();

    registry.execute({ type: "OPEN_CREATE_GROUP_DRAFT" }, state);
    registry.execute({ type: "CONFIRM_CREATE_GROUP" }, state);
    let flow = executor.run({ type: "CONFIRM_CREATE_GROUP" }, { shell, state });
    assert.equal(flow.shouldRender, false);
    assert.deepEqual(calls, []);
    assert.equal(state.createGroupDraft?.fieldErrors.selectedMembers, "请选择至少一个 AI 成员");

    registry.execute({ type: "TOGGLE_CREATE_GROUP_MEMBER", worldContactId: "ai:friend" }, state);
    flow = executor.run({ type: "CONFIRM_CREATE_GROUP" }, { shell, state });

    assert.equal(flow.executedFlow, "CREATE_GROUP");
    assert.equal(flow.shouldRender, true);
    assert.deepEqual(calls, [{ groupName: "群聊", selectedWorldContactIds: ["ai:friend"] }]);
    assert.equal(state.view, nextView);
    assert.equal(state.activeView, "CHAT_VIEW");
    assert.equal(state.activeChatId, "group:world:1");
    assert.equal(state.createGroupDraft, null);
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
      fixedRoles: [],
      validationError: null,
      fieldErrors: emptyFieldErrors(),
      noticeMessage: null
    };
    const registry = createBehaviorRegistry();
    const executor = createFlowExecutor();

    const transition = registry.execute({ type: "CONFIRM_CREATE_WORLD_DETAIL" }, state);
    const flow = executor.run({ type: "CONFIRM_CREATE_WORLD_DETAIL" }, { shell, state });

    assert.equal(transition.shouldRender, true);
    assert.equal(flow.executedFlow, "CREATE_WORLD");
    assert.equal(flow.shouldRender, true);
    assert.equal(calls.length, 1);
    assert.equal((calls[0] as unknown as { selectedUserRoleSlotId: string | null }).selectedUserRoleSlotId, "role-slot:1");
    assert.equal("validationError" in (calls[0] as Record<string, unknown>), false);
    assert.equal(state.currentWorldId, targetWorldId);
    assert.equal(state.activeView, "CHAT_LIST");
    assert.equal(state.activeChatId, null);
    assert.equal(state.createWorldDraft, null);
    assert.equal(state.worldCreationTransition?.welcomeText, "欢迎来到 Detail World。");
  });

  it("validates detail confirmation and sanitizes invalid random user role slots", () => {
    const calls: unknown[] = [];
    const shell = createShell(
      () => createView("unused"),
      () => createView("unused"),
      (draft) => {
        calls.push(draft);
        return createView(null, toWorldId("custom:sanitized-world"));
      }
    );
    const registry = createBehaviorRegistry();
    const executor = createFlowExecutor();

    const missingName = createState(createView("chat-before-detail-create"));
    missingName.activeView = "CREATE_WORLD_DETAIL_EDIT";
    missingName.createWorldDraft = {
      worldName: "",
      worldviewSourceType: "text",
      worldviewText: "expanded",
      selectedAIModelIds: ["ai:friend"],
      nextMode: "detailed-edit",
      detailRoleMode: "random-role",
      randomRoleSlots: [{ id: "role-slot:1", roleName: "Lead", personaNotes: "" }],
      selectedUserRoleSlotId: "role-slot:missing",
      fixedRoles: [],
      validationError: null,
      fieldErrors: emptyFieldErrors(),
      noticeMessage: null
    };
    registry.execute({ type: "CONFIRM_CREATE_WORLD_DETAIL" }, missingName);
    const missingFlow = executor.run({ type: "CONFIRM_CREATE_WORLD_DETAIL" }, { shell, state: missingName });

    assert.equal(missingFlow.shouldRender, false);
    assert.equal(missingName.activeView, "CREATE_WORLD_DETAIL_EDIT");
    assert.equal(missingName.createWorldDraft?.validationError, "请输入世界名称");
    assert.equal(missingName.createWorldDraft?.selectedUserRoleSlotId, null);
    assert.deepEqual(calls, []);

    const valid = createState(createView("chat-before-detail-create"));
    valid.activeView = "CREATE_WORLD_DETAIL_EDIT";
    valid.createWorldDraft = {
      worldName: "Sanitized World",
      worldviewSourceType: "text",
      worldviewText: "expanded",
      selectedAIModelIds: ["ai:friend"],
      nextMode: "detailed-edit",
      detailRoleMode: "random-role",
      randomRoleSlots: [{ id: "role-slot:1", roleName: "Lead", personaNotes: "" }],
      selectedUserRoleSlotId: "role-slot:missing",
      fixedRoles: [],
      validationError: null,
      fieldErrors: emptyFieldErrors(),
      noticeMessage: null
    };
    registry.execute({ type: "CONFIRM_CREATE_WORLD_DETAIL" }, valid);
    const validFlow = executor.run({ type: "CONFIRM_CREATE_WORLD_DETAIL" }, { shell, state: valid });

    assert.equal(validFlow.executedFlow, "CREATE_WORLD");
    assert.equal((calls[calls.length - 1] as unknown as { selectedUserRoleSlotId: string | null }).selectedUserRoleSlotId, null);
  });

  it("creates identity welcome transition from explicit and scaffold roles", () => {
    const targetWorldId = toWorldId("custom:identity-world");
    const shell = createShell(
      () => createView("unused"),
      () => createView("unused"),
      () => createView(null, targetWorldId)
    );
    const registry = createBehaviorRegistry();
    const executor = createFlowExecutor();

    const fixedRole = createState(createView("chat-before-detail-create"));
    fixedRole.activeView = "CREATE_WORLD_DETAIL_EDIT";
    fixedRole.createWorldDraft = {
      worldName: "Identity World",
      worldviewSourceType: "text",
      worldviewText: "has role context",
      selectedAIModelIds: ["ai:friend"],
      nextMode: "detailed-edit",
      detailRoleMode: "fixed-role",
      randomRoleSlots: [],
      selectedUserRoleSlotId: null,
      fixedRoles: [{ actorId: "user", roleName: "旅人", notes: "" }],
      validationError: null,
      fieldErrors: emptyFieldErrors(),
      noticeMessage: null
    };

    registry.execute({ type: "CONFIRM_CREATE_WORLD_DETAIL" }, fixedRole);
    executor.run({ type: "CONFIRM_CREATE_WORLD_DETAIL" }, { shell, state: fixedRole });

    assert.equal(fixedRole.activeView, "CHAT_LIST");
    assert.equal(fixedRole.worldCreationTransition?.welcomeText, "你是 旅人，今天是你来到 Identity World 的第一天。");

    const scaffoldRole = createState(createView("chat-before-create"));
    scaffoldRole.createWorldDraft = {
      worldName: "Scaffold World",
      worldviewSourceType: "official",
      worldviewText: "",
      selectedAIModelIds: ["ai:friend"],
      nextMode: "random-role",
      detailRoleMode: "random-role",
      randomRoleSlots: [],
      selectedUserRoleSlotId: null,
      fixedRoles: [],
      validationError: null,
      fieldErrors: emptyFieldErrors(),
      noticeMessage: null
    };

    registry.execute({ type: "CONFIRM_CREATE_WORLD_DRAFT" }, scaffoldRole);
    executor.run({ type: "CONFIRM_CREATE_WORLD_DRAFT" }, { shell, state: scaffoldRole });

    assert.equal(scaffoldRole.worldCreationTransition?.welcomeText, "你是 新世界中的你，今天是你来到 Scaffold World 的第一天。");
  });
});

function createState(view: MinimalProductShellView): SemanticMobileState {
  return {
    activeView: "CHAT_LIST",
    currentWorldId: view.product.snapshot.worldMeta.id,
    activeChatId: view.product.snapshot.chatState.activeChatId,
    overlay: "add-menu",
    selectedContactActorId: null,
    selectedChatIdForSettings: null,
    selectedWorldIdForEditing: null,
    composerMode: "text",
    inputDraft: "draft",
    settingsOpen: false,
    createGroupDraft: null,
    chatSettingsDraft: null,
    createWorldDraft: null,
    worldEditorDraft: null,
    contactDetailDraft: null,
    linkedAIDisconnectConfirmation: null,
    worldCreationTransition: null,
    splashVisible: false,
    view
  };
}

function emptyFieldErrors() {
  return {
    worldName: null,
    selectedAI: null
  };
}

function createShell(
  sendMessage: (text: string) => MinimalProductShellView,
  switchWorld: (worldId: string) => MinimalProductShellView = () => createView("initial"),
  createWorldFromDraft: MinimalProductShellRuntime["createWorldFromDraft"] = () => createView("initial"),
  saveWorldMetadata: MinimalProductShellRuntime["saveWorldMetadata"] = () => createView("initial"),
  addWorldMember: MinimalProductShellRuntime["addWorldMember"] = () => createView("initial"),
  removeWorldMember: MinimalProductShellRuntime["removeWorldMember"] = () => createView("initial"),
  saveWorldRoleMetadata: MinimalProductShellRuntime["saveWorldRoleMetadata"] = () => createView("initial"),
  saveContactDetailPreferences: MinimalProductShellRuntime["saveContactDetailPreferences"] = () => createView("initial"),
  deleteFriend: MinimalProductShellRuntime["deleteFriend"] = () => createView("initial"),
  createGroupChat: MinimalProductShellRuntime["createGroupChat"] = () => createView("initial"),
  saveChatAppearanceSettings: MinimalProductShellRuntime["saveChatAppearanceSettings"] = () => createView("initial"),
  saveGroupRules: MinimalProductShellRuntime["saveGroupRules"] = () => createView("initial"),
  addGroupMember: MinimalProductShellRuntime["addGroupMember"] = () => createView("initial")
): MinimalProductShellRuntime {
  const view = createView("initial");
  return {
    openScreen: () => view,
    switchWorld,
    createWorldFromDraft,
    saveWorldMetadata,
    saveWorldRoleMetadata,
    saveContactDetailPreferences,
    saveChatAppearanceSettings,
    saveGroupRules,
    addGroupMember,
    deleteFriend,
    addWorldMember,
    removeWorldMember,
    createGroupChat,
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
