import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveComposerModes,
  resolveDefaultComposerMode,
  toggleComposerMode
} from "../src/platform/composer-mode.js";
import { createBehaviorRegistry, OVO_CHAT_ID } from "../src/platform/behavior-registry.js";
import type { SemanticMobileState } from "../src/platform/behavior-registry.js";
import {
  CONTACT_DETAIL_DELETE_FRIEND_WARNING_MESSAGE,
  GROUP_FILES_UPLOAD_UNAVAILABLE_MESSAGE,
  LINKED_AI_DISCONNECT_CONFIRMATION_MISMATCH_MESSAGE,
  LINKED_AI_DISCONNECT_DRY_RUN_CONFIRMED_MESSAGE,
  LINKED_AI_DISCONNECT_PREVIEW_REQUIRED_MESSAGE,
  LINKED_AI_DISCONNECT_WARNING_MESSAGE,
  WORLD_EDITOR_EMPTY_WORLDVIEW_WARNING,
  WORLD_EDITOR_LARGE_WORLDVIEW_CHANGE_WARNING,
  WORLD_EDITOR_NAME_REQUIRED_MESSAGE,
  WORLD_MEMBER_REMOVE_REALITY_LOCKED_MESSAGE,
  WORLD_MEMBER_REMOVE_WARNING_MESSAGE
} from "../src/domain/index.js";
import { toWorldId } from "../src/world-domain/index.js";
import type { WorldScopedSnapshot } from "../src/domain/index.js";

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

  it("opens and validates create group draft through explicit actions", () => {
    const registry = createBehaviorRegistry();
    const state = createState();

    assert.equal(registry.execute({ type: "OPEN_CREATE_GROUP_DRAFT" }, state).shouldRender, true);
    assert.equal(state.activeView, "CREATE_GROUP_DRAFT");
    assert.equal(state.overlay, null);
    assert.equal(state.createGroupDraft?.groupName, "");

    registry.execute({ type: "UPDATE_CREATE_GROUP_DRAFT", field: "groupName", value: "夜谈小组" }, state);
    assert.equal(state.createGroupDraft?.groupName, "夜谈小组");

    registry.execute({ type: "CONFIRM_CREATE_GROUP" }, state);
    assert.equal(state.createGroupDraft?.fieldErrors.selectedMembers, "请选择至少一个 AI 成员");

    registry.execute({ type: "TOGGLE_CREATE_GROUP_MEMBER", worldContactId: "ai:friend" }, state);
    assert.deepEqual(state.createGroupDraft?.selectedWorldContactIds, ["ai:friend"]);
    assert.equal(state.createGroupDraft?.fieldErrors.selectedMembers, null);

    registry.execute({ type: "CANCEL_CREATE_GROUP" }, state);
    assert.equal(state.activeView, "CHAT_LIST");
    assert.equal(state.createGroupDraft, null);
  });

  it("opens chat settings as a route and keeps settings actions scaffolded locally", () => {
    const registry = createBehaviorRegistry();
    const state = createState();
    const originalChat = Object.freeze({
      id: "chat:friend",
      worldId: state.currentWorldId,
      title: "Friend",
      messages: Object.freeze([
        Object.freeze({
          id: "message:one",
          authorActorId: "ai:friend",
          text: "hello",
          createdAt: 1
        })
      ])
    });
    state.view = {
      ...state.view,
      product: {
        ...state.view.product,
        snapshot: {
          ...state.view.product.snapshot,
          chatState: {
            activeChatId: "chat:friend",
            chats: new Map([["chat:friend", originalChat]])
          }
        }
      }
    };
    state.activeView = "CHAT_VIEW";
    state.activeChatId = "chat:friend";

    assert.equal(registry.execute({ type: "OPEN_CHAT_SETTINGS" }, state).shouldRender, true);
    assert.equal(state.activeView, "CHAT_SETTINGS");
    assert.equal(state.selectedChatIdForSettings, "chat:friend");
    assert.equal(state.chatSettingsDraft?.chatId, "chat:friend");
    assert.equal(state.overlay, null);

    registry.execute({ type: "UPDATE_CHAT_SETTINGS_DRAFT", field: "backgroundColor", value: "#111111" }, state);
    registry.execute({ type: "UPDATE_CHAT_SETTINGS_DRAFT", field: "myBubbleColor", value: "#222222" }, state);
    registry.execute({ type: "UPDATE_CHAT_SETTINGS_DRAFT", field: "otherBubbleColor", value: "#333333" }, state);
    assert.equal(state.chatSettingsDraft?.backgroundColor, "#111111");
    assert.equal(state.chatSettingsDraft?.myBubbleColor, "#222222");
    assert.equal(state.chatSettingsDraft?.otherBubbleColor, "#333333");
    registry.execute({ type: "UPDATE_GROUP_RULES_DRAFT", rulesText: "No spoilers" }, state);
    assert.equal(state.chatSettingsDraft?.groupRulesText, "No spoilers");

    registry.execute({ type: "UPLOAD_CHAT_BACKGROUND_IMAGE" }, state);
    assert.equal(state.chatSettingsDraft?.noticeMessage, "背景图片上传暂未开放");
    registry.execute({ type: "OPEN_GROUP_ADD_MEMBER" }, state);
    assert.equal(state.chatSettingsDraft?.noticeMessage, "添加群成员暂未开放");
    registry.execute({ type: "OPEN_GROUP_REMOVE_MEMBER" }, state);
    assert.equal(state.chatSettingsDraft?.noticeMessage, "移除群成员暂未开放");
    registry.execute({ type: "OPEN_GROUP_RULES" }, state);
    assert.equal(state.chatSettingsDraft?.noticeMessage, "群规则暂未开放");
    registry.execute({ type: "SAVE_GROUP_RULES" }, state);
    assert.equal(state.chatSettingsDraft?.noticeMessage, "GroupRules: invalid group rules patch.");
    registry.execute({ type: "OPEN_GROUP_FILES" }, state);
    assert.equal(state.chatSettingsDraft?.noticeMessage, GROUP_FILES_UPLOAD_UNAVAILABLE_MESSAGE);
    registry.execute({ type: "SAVE_CHAT_SETTINGS" }, state);
    assert.equal(state.chatSettingsDraft?.noticeMessage, null);
    assert.equal(state.view.product.snapshot.chatState.chats.get("chat:friend"), originalChat);
    assert.equal(state.view.product.snapshot.chatState.chats.get("chat:friend")?.messages.length, 1);

    registry.execute({ type: "CANCEL_CHAT_SETTINGS" }, state);
    assert.equal(state.activeView, "CHAT_VIEW");
    assert.equal(state.activeChatId, "chat:friend");
    assert.equal(state.selectedChatIdForSettings, null);
    assert.equal(state.chatSettingsDraft, null);
  });

  it("updates contact detail preference draft locally and scaffolds delete friend confirmation", () => {
    const registry = createBehaviorRegistry();
    const state = createState();
    state.view = {
      ...state.view,
      product: {
        ...state.view.product,
        snapshot: {
          ...state.view.product.snapshot,
          contacts: [
            {
              worldId: state.currentWorldId,
              actorId: "ai:friend",
              displayName: "Friend",
              kind: "assistant",
              outputMode: "Dialogue",
              worldRoleName: "Guide",
              worldPersonaNotes: "Knows the city"
            } as never
          ]
        }
      }
    };

    assert.equal(registry.execute({ type: "OPEN_CONTACT", actorId: "ai:friend" }, state).shouldRender, true);
    assert.equal(state.activeView, "CONTACT_DETAIL");
    assert.equal(state.contactDetailDraft?.worldContactId, "ai:friend");
    assert.equal(state.contactDetailDraft?.perceivedPersonaNotes, "");

    registry.execute({ type: "UPDATE_CONTACT_DETAIL_DRAFT", field: "remark", value: "小友" }, state);
    registry.execute({ type: "UPDATE_CONTACT_DETAIL_DRAFT", field: "perceivedPersonaNotes", value: "可靠的新朋友" }, state);
    registry.execute({ type: "UPDATE_CONTACT_DETAIL_DRAFT", field: "answerMode", value: "qa" }, state);
    registry.execute({ type: "UPDATE_CONTACT_DETAIL_DRAFT", field: "chatTone", value: "gentle" }, state);
    registry.execute({ type: "UPDATE_CONTACT_DETAIL_DRAFT", field: "emojiPermission", value: false }, state);

    assert.equal(state.contactDetailDraft?.remark, "小友");
    assert.equal(state.contactDetailDraft?.perceivedPersonaNotes, "可靠的新朋友");
    assert.equal(state.contactDetailDraft?.answerMode, "qa");
    assert.equal(state.contactDetailDraft?.chatTone, "gentle");
    assert.equal(state.contactDetailDraft?.emojiPermission, false);
    assert.deepEqual(state.view.product.snapshot.chatState.chats, new Map());
    assert.deepEqual(state.view.product.snapshot.memorySummary.namespace, "world:reality");

    registry.execute({
      type: "OPEN_DELETE_FRIEND_CONFIRMATION",
      worldId: state.currentWorldId,
      worldContactId: "ai:friend",
      displayName: "Friend"
    }, state);
    assert.equal(state.contactDetailDraft?.deleteFriendConfirmation?.warning, CONTACT_DETAIL_DELETE_FRIEND_WARNING_MESSAGE);

    registry.execute({ type: "CANCEL_DELETE_FRIEND" }, state);
    assert.equal(state.contactDetailDraft?.deleteFriendConfirmation, null);

    registry.execute({
      type: "OPEN_DELETE_FRIEND_CONFIRMATION",
      worldId: state.currentWorldId,
      worldContactId: "ai:friend",
      displayName: "Friend"
    }, state);
    registry.execute({
      type: "CONFIRM_DELETE_FRIEND",
      worldId: state.currentWorldId,
      worldContactId: "ai:friend"
    }, state);
    assert.equal(state.contactDetailDraft?.noticeMessage, "删除好友暂未开放");
    assert.equal(state.view.product.snapshot.contacts.length, 1);
  });

  it("opens and cancels linked AI disconnect confirmation without mutating data", () => {
    const registry = createBehaviorRegistry();
    const state = createState();
    state.activeView = "ME";
    state.settingsOpen = true;
    state.view = {
      ...state.view,
      linkedAIModels: [
        {
          globalAILinkId: "link:ai:friend",
          globalAIModelId: "ai:friend",
          actorId: "ai:friend",
          displayName: "Friend"
        }
      ],
      worldScopedSnapshot: linkedAIDisconnectPreviewSnapshot()
    };

    registry.execute({
      type: "OPEN_LINKED_AI_DISCONNECT_CONFIRMATION",
      globalAILinkId: "link:ai:friend",
      displayName: "Friend"
    }, state);

    assert.equal(state.linkedAIDisconnectConfirmation?.globalAILinkId, "link:ai:friend");
    assert.equal(state.linkedAIDisconnectConfirmation?.warning, LINKED_AI_DISCONNECT_WARNING_MESSAGE);
    assert.equal(state.linkedAIDisconnectConfirmation?.status, "preview");
    assert.equal(state.linkedAIDisconnectConfirmation?.preview?.affectedWorlds[0]?.worldId, "reality");
    assert.deepEqual(state.linkedAIDisconnectConfirmation?.preview?.affectedWorlds[0]?.privateContactIds, ["ai:friend"]);
    assert.deepEqual(state.view.linkedAIModels?.map((model) => model.globalAILinkId), ["link:ai:friend"]);

    registry.execute({ type: "CONFIRM_LINKED_AI_DISCONNECT", globalAILinkId: "link:ai:friend" }, state);
    assert.equal(state.linkedAIDisconnectConfirmation?.globalAILinkId, "link:ai:friend");
    assert.equal(state.linkedAIDisconnectConfirmation?.status, "dry-run-confirmed");
    assert.equal(state.linkedAIDisconnectConfirmation?.noticeMessage, LINKED_AI_DISCONNECT_DRY_RUN_CONFIRMED_MESSAGE);
    assert.equal(state.linkedAIDisconnectConfirmation?.errorMessage, null);
    assert.deepEqual(state.view.linkedAIModels?.map((model) => model.globalAILinkId), ["link:ai:friend"]);

    registry.execute({ type: "CANCEL_LINKED_AI_DISCONNECT" }, state);
    assert.equal(state.linkedAIDisconnectConfirmation, null);
    assert.deepEqual(state.view.linkedAIModels?.map((model) => model.globalAILinkId), ["link:ai:friend"]);
  });

  it("scaffolds group member add and remove without mutating group membership", () => {
    const registry = createBehaviorRegistry();
    const state = createState();
    const group = Object.freeze({
      id: "group:one",
      title: "Group One",
      actorIds: Object.freeze(["ai:one", "ai:two"])
    });
    state.view = {
      ...state.view,
      product: {
        ...state.view.product,
        snapshot: {
          ...state.view.product.snapshot,
          contacts: [
            {
              worldId: state.currentWorldId,
              actorId: "ai:one",
              displayName: "One",
              kind: "assistant",
              outputMode: "Dialogue"
            },
            {
              worldId: state.currentWorldId,
              actorId: "ai:two",
              displayName: "Two",
              kind: "assistant",
              outputMode: "Dialogue"
            },
            {
              worldId: state.currentWorldId,
              actorId: "ai:three",
              displayName: "Three",
              kind: "assistant",
              outputMode: "Dialogue"
            }
          ] as never,
          groups: [group],
          chatState: {
            activeChatId: "group:one",
            chats: new Map([[
              "group:one",
              Object.freeze({
                id: "group:one",
                worldId: state.currentWorldId,
                title: "Group One",
                messages: []
              })
            ]])
          }
        }
      }
    };
    state.activeView = "CHAT_VIEW";
    state.activeChatId = "group:one";

    registry.execute({ type: "OPEN_CHAT_SETTINGS" }, state);
    registry.execute({ type: "OPEN_GROUP_ADD_MEMBER", worldContactId: "ai:three" }, state);
    assert.equal(state.chatSettingsDraft?.noticeMessage, "添加群成员暂未开放");
    assert.deepEqual(state.view.product.snapshot.groups[0]?.actorIds, ["ai:one", "ai:two"]);

    registry.execute({ type: "OPEN_GROUP_REMOVE_MEMBER", worldContactId: "ai:one" }, state);
    assert.equal(state.chatSettingsDraft?.noticeMessage, "移除后，该 AI 只会离开此群，群聊与历史消息仍会保留。");
    assert.equal(state.chatSettingsDraft?.groupMemberRemoveConfirmation?.worldContactId, "ai:one");
    registry.execute({ type: "CONFIRM_GROUP_REMOVE_MEMBER", worldContactId: "ai:one" }, state);
    assert.equal(state.chatSettingsDraft?.noticeMessage, "移除后，该 AI 只会离开此群，群聊与历史消息仍会保留。");
    assert.equal(state.chatSettingsDraft?.groupMemberRemoveConfirmation?.worldContactId, "ai:one");
    assert.deepEqual(state.view.product.snapshot.groups[0]?.actorIds, ["ai:one", "ai:two"]);

    state.view = {
      ...state.view,
      product: {
        ...state.view.product,
        snapshot: {
          ...state.view.product.snapshot,
          groups: [Object.freeze({
            id: "group:one",
            title: "Group One",
            actorIds: Object.freeze(["ai:one"])
          })]
        }
      }
    };
    registry.execute({ type: "OPEN_GROUP_REMOVE_MEMBER", worldContactId: "ai:one" }, state);
    assert.equal(state.chatSettingsDraft?.noticeMessage, "移除后将解散该群");
    assert.equal(state.chatSettingsDraft?.groupMemberRemoveConfirmation, null);
  });

  it("guards linked AI disconnect confirmation failures without mutating data", () => {
    const registry = createBehaviorRegistry();
    const state = createState();
    state.activeView = "ME";
    state.settingsOpen = true;
    state.view = {
      ...state.view,
      linkedAIModels: [
        {
          globalAILinkId: "link:ai:friend",
          globalAIModelId: "ai:friend",
          actorId: "ai:friend",
          displayName: "Friend"
        }
      ],
      worldScopedSnapshot: linkedAIDisconnectPreviewSnapshot()
    };

    registry.execute({ type: "CONFIRM_LINKED_AI_DISCONNECT", globalAILinkId: "link:ai:friend" }, state);
    assert.equal(state.linkedAIDisconnectConfirmation, null);
    assert.deepEqual(state.view.linkedAIModels?.map((model) => model.globalAILinkId), ["link:ai:friend"]);

    registry.execute({
      type: "OPEN_LINKED_AI_DISCONNECT_CONFIRMATION",
      globalAILinkId: "link:ai:friend",
      displayName: "Friend"
    }, state);
    state.linkedAIDisconnectConfirmation = Object.freeze({
      ...state.linkedAIDisconnectConfirmation!,
      preview: null
    });
    registry.execute({ type: "CONFIRM_LINKED_AI_DISCONNECT", globalAILinkId: "link:ai:friend" }, state);
    assert.equal(state.linkedAIDisconnectConfirmation?.status, "guard-failed");
    assert.equal(state.linkedAIDisconnectConfirmation?.errorMessage, LINKED_AI_DISCONNECT_PREVIEW_REQUIRED_MESSAGE);

    registry.execute({
      type: "OPEN_LINKED_AI_DISCONNECT_CONFIRMATION",
      globalAILinkId: "link:ai:friend",
      displayName: "Friend"
    }, state);
    registry.execute({ type: "CONFIRM_LINKED_AI_DISCONNECT", globalAILinkId: "link:ai:other" }, state);
    assert.equal(state.linkedAIDisconnectConfirmation?.status, "guard-failed");
    assert.equal(state.linkedAIDisconnectConfirmation?.errorMessage, LINKED_AI_DISCONNECT_CONFIRMATION_MISMATCH_MESSAGE);
    assert.deepEqual(state.view.linkedAIModels?.map((model) => model.globalAILinkId), ["link:ai:friend"]);
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

  it("opens world editor page scaffold without changing current world", () => {
    const registry = createBehaviorRegistry();
    const state = createState();
    state.overlay = "world-editor-selector";
    state.view = {
      ...state.view,
      availableWorlds: [
        { worldId: state.currentWorldId, title: "Reality", type: "reality" },
        { worldId: toWorldId("custom:studio"), title: "Studio", type: "custom" }
      ]
    };

    const result = registry.execute({ type: "OPEN_WORLD_EDITOR", worldId: state.currentWorldId }, state);

    assert.equal(result.shouldRender, true);
    assert.equal(state.currentWorldId, toWorldId("reality"));
    assert.equal(state.activeView, "WORLD_EDITOR");
    assert.equal(state.selectedWorldIdForEditing, toWorldId("reality"));
    assert.equal(state.worldEditorDraft?.worldName, "Reality");
    assert.equal(state.worldEditorDraft?.locked, true);
    assert.equal(state.overlay, null);

    registry.execute({ type: "SAVE_WORLD_EDITOR" }, state);
    assert.equal(state.worldEditorDraft?.noticeMessage, null);
    registry.execute({ type: "UPDATE_WORLD_EDITOR_USER_ROLE_DRAFT", field: "roleName", value: "Should stay locked" }, state);
    assert.equal(state.worldEditorDraft?.userRole?.roleName, "");

    registry.execute({ type: "CANCEL_WORLD_EDITOR" }, state);
    assert.equal(state.activeView, "CHAT_LIST");
    assert.equal(state.selectedWorldIdForEditing, null);
    assert.equal(state.worldEditorDraft, null);
  });

  it("updates custom world editor draft without mutating world context", () => {
    const registry = createBehaviorRegistry();
    const state = createState();
    const customWorldId = toWorldId("custom:studio");
    state.view = {
      ...state.view,
      availableWorlds: [
        { worldId: state.currentWorldId, title: "Reality", type: "reality" },
        { worldId: customWorldId, title: "Studio", type: "custom" }
      ]
    };

    registry.execute({ type: "OPEN_WORLD_EDITOR", worldId: customWorldId }, state);
    registry.execute({ type: "UPDATE_WORLD_EDITOR_DRAFT", field: "worldName", value: "Edited Studio" }, state);
    registry.execute({ type: "UPDATE_WORLD_EDITOR_DRAFT", field: "worldviewText", value: "Quiet city" }, state);

    assert.equal(state.currentWorldId, toWorldId("reality"));
    assert.equal(state.activeView, "WORLD_EDITOR");
    assert.equal(state.selectedWorldIdForEditing, customWorldId);
    assert.equal(state.worldEditorDraft?.worldName, "Edited Studio");
    assert.equal(state.worldEditorDraft?.worldviewText, "Quiet city");
    assert.ok(state.worldEditorDraft?.warnings.includes(WORLD_EDITOR_LARGE_WORLDVIEW_CHANGE_WARNING));
    assert.equal(state.view.product.snapshot.worldMeta.title, "Reality");

    registry.execute({ type: "SAVE_WORLD_EDITOR" }, state);
    assert.equal(state.worldEditorDraft?.noticeMessage, null);
    assert.equal(state.view.product.snapshot.worldMeta.title, "Reality");
  });

  it("updates world editor role member draft locally before save", () => {
    const registry = createBehaviorRegistry();
    const state = createState();
    const customWorldId = toWorldId("custom:studio");
    state.view = {
      ...state.view,
      availableWorlds: [
        { worldId: state.currentWorldId, title: "Reality", type: "reality", memberActorIds: [] },
        { worldId: customWorldId, title: "Studio", type: "custom", memberActorIds: ["ai:friend"] }
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

    registry.execute({ type: "OPEN_WORLD_EDITOR", worldId: customWorldId }, state);
    registry.execute({ type: "UPDATE_WORLD_EDITOR_USER_ROLE_DRAFT", field: "roleName", value: "Traveler" }, state);
    registry.execute({ type: "UPDATE_WORLD_EDITOR_USER_ROLE_DRAFT", field: "personaNotes", value: "New arrival" }, state);
    registry.execute({
      type: "UPDATE_WORLD_EDITOR_MEMBER_ROLE_DRAFT",
      worldContactId: "ai:friend",
      field: "worldRoleName",
      value: "Guide"
    }, state);
    registry.execute({
      type: "UPDATE_WORLD_EDITOR_MEMBER_ROLE_DRAFT",
      worldContactId: "ai:friend",
      field: "worldPersonaNotes",
      value: "Knows the city"
    }, state);

    assert.equal(state.worldEditorDraft?.userRole?.roleName, "Traveler");
    assert.equal(state.worldEditorDraft?.userRole?.personaNotes, "New arrival");
    assert.equal(state.worldEditorDraft?.memberRoles?.[0]?.worldContactId, "ai:friend");
    assert.equal(state.worldEditorDraft?.memberRoles?.[0]?.worldRoleName, "Guide");
    assert.equal(state.worldEditorDraft?.memberRoles?.[0]?.worldPersonaNotes, "Knows the city");
    assert.equal(state.worldEditorDraft?.noticeMessage, "角色设定将在保存时更新");
    assert.deepEqual(state.view.product.snapshot.contacts, []);

    registry.execute({ type: "SAVE_WORLD_EDITOR" }, state);
    assert.equal(state.worldEditorDraft?.userRole?.roleName, "Traveler");
    assert.equal(state.worldEditorDraft?.memberRoles?.[0]?.worldRoleName, "Guide");
    assert.deepEqual(state.view.product.snapshot.contacts, []);
  });

  it("validates world editor name and allows cleared worldview with warning", () => {
    const registry = createBehaviorRegistry();
    const state = createState();
    const customWorldId = toWorldId("custom:studio");
    state.view = {
      ...state.view,
      availableWorlds: [
        { worldId: state.currentWorldId, title: "Reality", type: "reality" },
        { worldId: customWorldId, title: "Studio", type: "custom" }
      ]
    };

    registry.execute({ type: "OPEN_WORLD_EDITOR", worldId: customWorldId }, state);
    registry.execute({ type: "UPDATE_WORLD_EDITOR_DRAFT", field: "worldName", value: "" }, state);
    registry.execute({ type: "UPDATE_WORLD_EDITOR_DRAFT", field: "worldviewText", value: "" }, state);
    registry.execute({ type: "SAVE_WORLD_EDITOR" }, state);

    assert.equal(state.worldEditorDraft?.fieldErrors.worldName, WORLD_EDITOR_NAME_REQUIRED_MESSAGE);
    assert.ok(state.worldEditorDraft?.warnings.includes(WORLD_EDITOR_EMPTY_WORLDVIEW_WARNING));
    assert.equal(state.worldEditorDraft?.noticeMessage, null);
  });

  it("opens and cancels remove-member confirmation without mutating world data", () => {
    const registry = createBehaviorRegistry();
    const state = createState();
    const customWorldId = toWorldId("custom:studio");
    state.view = {
      ...state.view,
      availableWorlds: [
        { worldId: state.currentWorldId, title: "Reality", type: "reality", memberActorIds: [] },
        { worldId: customWorldId, title: "Studio", type: "custom", memberActorIds: ["ai:friend"] }
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

    registry.execute({ type: "OPEN_WORLD_EDITOR", worldId: customWorldId }, state);
    registry.execute({
      type: "OPEN_REMOVE_WORLD_MEMBER_CONFIRMATION",
      worldId: customWorldId,
      actorId: "ai:friend",
      displayName: "Friend"
    }, state);

    assert.equal(state.worldEditorDraft?.removeMemberConfirmation?.actorId, "ai:friend");
    assert.equal(state.worldEditorDraft?.removeMemberConfirmation?.warning, WORLD_MEMBER_REMOVE_WARNING_MESSAGE);
    assert.equal(state.worldEditorDraft?.noticeMessage, null);
    assert.equal(state.view.availableWorlds.find((world) => world.worldId === customWorldId)?.memberActorIds?.includes("ai:friend"), true);

    registry.execute({ type: "CONFIRM_REMOVE_WORLD_MEMBER", worldId: customWorldId, actorId: "ai:friend" }, state);
    assert.equal(state.worldEditorDraft?.noticeMessage, "删除暂未开放");
    assert.equal(state.view.availableWorlds.find((world) => world.worldId === customWorldId)?.memberActorIds?.includes("ai:friend"), true);

    registry.execute({ type: "CANCEL_REMOVE_WORLD_MEMBER" }, state);
    assert.equal(state.worldEditorDraft?.removeMemberConfirmation, null);
    assert.equal(state.worldEditorDraft?.noticeMessage, null);
  });

  it("rejects remove-member confirmation in Reality", () => {
    const registry = createBehaviorRegistry();
    const state = createState();
    state.view = {
      ...state.view,
      availableWorlds: [
        { worldId: state.currentWorldId, title: "Reality", type: "reality", memberActorIds: ["ai:friend"] }
      ]
    };

    registry.execute({ type: "OPEN_WORLD_EDITOR", worldId: state.currentWorldId }, state);
    registry.execute({
      type: "OPEN_REMOVE_WORLD_MEMBER_CONFIRMATION",
      worldId: state.currentWorldId,
      actorId: "ai:friend",
      displayName: "Friend"
    }, state);

    assert.equal(state.worldEditorDraft?.removeMemberConfirmation, null);
    assert.equal(state.worldEditorDraft?.noticeMessage, WORLD_MEMBER_REMOVE_REALITY_LOCKED_MESSAGE);
  });

  it("opens and updates create world draft without creating or switching worlds", () => {
    const registry = createBehaviorRegistry();
    const state = createState();
    const initialWorldId = state.currentWorldId;
    const worldCount = state.view.availableWorlds.length;

    assert.equal(registry.execute({ type: "OPEN_CREATE_WORLD_DRAFT" }, state).shouldRender, true);
    assert.equal(state.activeView, "CREATE_WORLD_DRAFT");
    assert.equal(state.overlay, null);
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
    assert.equal(state.activeView, "CREATE_WORLD_DRAFT");
    assert.equal(state.overlay, null);
    assert.equal(state.currentWorldId, initialWorldId);
    assert.equal(state.view.availableWorlds.length, worldCount);
  });

  it("routes detailed edit to a scaffold page without creating or bouncing back", () => {
    const registry = createBehaviorRegistry();
    const state = createState();

    registry.execute({ type: "OPEN_CREATE_WORLD_DRAFT" }, state);
    registry.execute({ type: "UPDATE_CREATE_WORLD_DRAFT", field: "worldName", value: "detail world" }, state);
    registry.execute({ type: "UPDATE_CREATE_WORLD_DRAFT", field: "worldviewText", value: "detail view" }, state);
    registry.execute({ type: "TOGGLE_CREATE_WORLD_AI", aiModelId: "ai:friend" }, state);
    const result = registry.execute({ type: "OPEN_CREATE_WORLD_DETAIL_EDIT" }, state);

    assert.equal(result.shouldRender, true);
    assert.equal(state.activeView, "CREATE_WORLD_DETAIL_EDIT");
    assert.equal(state.createWorldDraft?.nextMode, "detailed-edit");
    assert.equal(state.createWorldDraft?.detailRoleMode, "random-role");
    assert.equal(state.createWorldDraft?.worldviewText, "detail view");
    assert.equal(state.createWorldDraft?.randomRoleSlots.length, 2);
    assert.equal(state.overlay, null);

    registry.execute({ type: "CONFIRM_CREATE_WORLD_DRAFT" }, state);
    assert.equal(state.activeView, "CREATE_WORLD_DETAIL_EDIT");
    assert.equal(state.currentWorldId, toWorldId("reality"));

    registry.execute({ type: "UPDATE_CREATE_WORLD_DETAIL", field: "worldName", value: "edited detail world" }, state);
    registry.execute({ type: "UPDATE_CREATE_WORLD_RANDOM_ROLE_SLOT", slotId: "role-slot:1", field: "roleName", value: "Watcher" }, state);
    registry.execute({ type: "UPDATE_CREATE_WORLD_RANDOM_ROLE_SLOT", slotId: "role-slot:1", field: "personaNotes", value: "quiet observer" }, state);
    registry.execute({ type: "TOGGLE_RANDOM_ROLE_USER_SLOT", slotId: "role-slot:1" }, state);

    assert.equal(state.createWorldDraft?.worldName, "edited detail world");
    assert.equal(state.createWorldDraft?.randomRoleSlots.find((slot) => slot.id === "role-slot:1")?.roleName, "Watcher");
    assert.equal(state.createWorldDraft?.randomRoleSlots.find((slot) => slot.id === "role-slot:1")?.personaNotes, "quiet observer");
    assert.equal(state.createWorldDraft?.selectedUserRoleSlotId, "role-slot:1");

    registry.execute({ type: "TOGGLE_RANDOM_ROLE_USER_SLOT", slotId: "role-slot:1" }, state);
    assert.equal(state.createWorldDraft?.selectedUserRoleSlotId, null);

    registry.execute({ type: "TOGGLE_RANDOM_ROLE_USER_SLOT", slotId: "role-slot:2" }, state);
    assert.equal(state.createWorldDraft?.selectedUserRoleSlotId, "role-slot:2");

    registry.execute({ type: "TOGGLE_RANDOM_ROLE_USER_SLOT", slotId: "role-slot:missing" }, state);
    assert.equal(state.createWorldDraft?.selectedUserRoleSlotId, null);

    registry.execute({ type: "SELECT_DETAIL_ROLE_MODE", roleMode: "fixed-role" }, state);
    registry.execute({ type: "UPDATE_CREATE_WORLD_FIXED_ROLE", actorId: "user", field: "roleName", value: "Observer" }, state);
    registry.execute({ type: "UPDATE_CREATE_WORLD_FIXED_ROLE", actorId: "ai:friend", field: "notes", value: "old friend" }, state);

    assert.equal(state.createWorldDraft?.worldName, "edited detail world");
    assert.equal(state.createWorldDraft?.detailRoleMode, "fixed-role");
    assert.deepEqual(state.createWorldDraft?.fixedRoles.map((role) => role.actorId), ["user", "ai:friend"]);
    assert.equal(state.createWorldDraft?.fixedRoles.find((role) => role.actorId === "user")?.roleName, "Observer");
    assert.equal(state.createWorldDraft?.fixedRoles.find((role) => role.actorId === "ai:friend")?.notes, "old friend");

    registry.execute({ type: "SELECT_DETAIL_ROLE_MODE", roleMode: "empty-role" }, state);
    assert.equal(state.createWorldDraft?.detailRoleMode, "empty-role");

    registry.execute({ type: "NAV_BACK" }, state);
    assert.equal(state.activeView, "CREATE_WORLD_DRAFT");
    assert.equal(state.createWorldDraft?.worldName, "edited detail world");
  });

  it("shows create world validation without leaving the current create route", () => {
    const registry = createBehaviorRegistry();
    const state = createState();

    registry.execute({ type: "OPEN_CREATE_WORLD_DRAFT" }, state);
    registry.execute({ type: "SELECT_CREATE_WORLD_NEXT_MODE", nextMode: "random-role" }, state);
    registry.execute({ type: "CONFIRM_CREATE_WORLD_DRAFT" }, state);

    assert.equal(state.activeView, "CREATE_WORLD_DRAFT");
    assert.equal(state.createWorldDraft?.validationError, "请输入世界名称");

    registry.execute({ type: "UPDATE_CREATE_WORLD_DRAFT", field: "worldName", value: "valid world" }, state);
    assert.equal(state.createWorldDraft?.validationError, null);

    registry.execute({ type: "OPEN_CREATE_WORLD_DETAIL_EDIT" }, state);
    registry.execute({ type: "UPDATE_CREATE_WORLD_DETAIL", field: "worldName", value: "" }, state);
    registry.execute({ type: "CONFIRM_CREATE_WORLD_DETAIL" }, state);

    assert.equal(state.activeView, "CREATE_WORLD_DETAIL_EDIT");
    assert.equal(state.createWorldDraft?.validationError, "请输入世界名称");
  });

  it("cancels create world draft and clears draft state", () => {
    const registry = createBehaviorRegistry();
    const state = createState();

    registry.execute({ type: "OPEN_CREATE_WORLD_DRAFT" }, state);
    registry.execute({ type: "UPDATE_CREATE_WORLD_DRAFT", field: "worldName", value: "temporary" }, state);
    registry.execute({ type: "CANCEL_CREATE_WORLD_DRAFT" }, state);

    assert.equal(state.overlay, null);
    assert.equal(state.createWorldDraft, null);
    assert.equal(state.activeView, "CHAT_LIST");
    assert.equal(state.currentWorldId, toWorldId("reality"));
  });

  it("keeps create world draft visible when no AI is selected", () => {
    const registry = createBehaviorRegistry();
    const state = createState();

    registry.execute({ type: "OPEN_CREATE_WORLD_DRAFT" }, state);
    registry.execute({ type: "UPDATE_CREATE_WORLD_DRAFT", field: "worldName", value: "valid world" }, state);
    registry.execute({ type: "SELECT_CREATE_WORLD_NEXT_MODE", nextMode: "random-role" }, state);
    registry.execute({ type: "CONFIRM_CREATE_WORLD_DRAFT" }, state);

    assert.equal(state.activeView, "CREATE_WORLD_DRAFT");
    assert.equal(state.createWorldDraft?.worldName, "valid world");
    assert.equal(state.createWorldDraft?.selectedAIModelIds.length, 0);
    assert.equal(state.createWorldDraft?.fieldErrors.selectedAI, "请选择至少一个 AI 朋友");

    registry.execute({ type: "TOGGLE_CREATE_WORLD_AI", aiModelId: "ai:friend" }, state);
    assert.equal(state.createWorldDraft?.fieldErrors.selectedAI, null);
  });

  it("shows unavailable import notice without changing source state", () => {
    const registry = createBehaviorRegistry();
    const state = createState();

    registry.execute({ type: "OPEN_CREATE_WORLD_DRAFT" }, state);
    registry.execute({ type: "SELECT_WORLDVIEW_SOURCE", sourceType: "blank" }, state);
    registry.execute({ type: "SELECT_WORLDVIEW_SOURCE", sourceType: "worldview-document" }, state);

    assert.equal(state.createWorldDraft?.worldviewSourceType, "blank");
    assert.equal(state.createWorldDraft?.noticeMessage, "文档导入暂未开放");

    registry.execute({ type: "SELECT_WORLDVIEW_SOURCE", sourceType: "official" }, state);
    assert.equal(state.createWorldDraft?.worldviewSourceType, "official");
    assert.equal(state.createWorldDraft?.noticeMessage, null);
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

  it("completes world creation transition without changing world context", () => {
    const registry = createBehaviorRegistry();
    const state = createState();
    const newWorldId = toWorldId("custom:new-world");
    state.currentWorldId = newWorldId;
    state.activeView = "CHAT_LIST";
    state.activeChatId = null;
    state.selectedContactActorId = null;
    state.overlay = "add-menu";
    state.settingsOpen = true;
    state.worldCreationTransition = {
      worldId: newWorldId,
      worldName: "New World",
      phase: "welcome",
      loadingText: "New World loading",
      welcomeText: "Welcome"
    };

    const result = registry.execute({ type: "COMPLETE_WORLD_CREATION_TRANSITION" }, state);

    assert.equal(result.shouldRender, true);
    assert.equal(state.worldCreationTransition, null);
    assert.equal(state.currentWorldId, newWorldId);
    assert.equal(state.activeView, "CHAT_LIST");
    assert.equal(state.activeChatId, null);
    assert.equal(state.selectedContactActorId, null);
    assert.equal(state.overlay, null);
    assert.equal(state.settingsOpen, false);
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
    selectedChatIdForSettings: null,
    selectedWorldIdForEditing: null,
    composerMode: "text",
    inputDraft: "",
    settingsOpen: false,
    createGroupDraft: null,
    chatSettingsDraft: null,
    createWorldDraft: null,
    worldEditorDraft: null,
    contactDetailDraft: null,
    linkedAIDisconnectConfirmation: null,
    worldCreationTransition: null,
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

function linkedAIDisconnectPreviewSnapshot(): WorldScopedSnapshot {
  const worldId = toWorldId("reality");
  return {
    currentWorldId: worldId,
    globalAIModels: [
      { modelId: "ai:friend", displayName: "Friend" },
      { modelId: "ai:other", displayName: "Other" }
    ],
    globalAILinks: [
      { linkId: "link:ai:friend", modelId: "ai:friend", connectedAt: 1, status: "connected" },
      { linkId: "link:ai:other", modelId: "ai:other", connectedAt: 2, status: "connected" }
    ],
    worlds: new Map([
      [
        worldId,
        {
          world: {
            worldId,
            title: "Reality",
            type: "reality",
            lifecycle: "active",
            ownerActorId: "owner",
            assistantActorId: "assistant",
            worldView: {},
            settings: {}
          },
          contacts: [
            {
              worldId,
              contactId: "ai:friend",
              actorId: "ai:friend",
              baseModelId: "ai:friend",
              displayName: "Friend",
              kind: "assistant",
              outputMode: "Dialogue",
              persona: {}
            }
          ],
          chats: [
            {
              worldId,
              chatId: "chat:reality:ai:friend",
              title: "Friend",
              participantContactIds: ["ai:friend"],
              messages: []
            }
          ],
          groups: [],
          memory: {
            worldId,
            namespace: "world:reality",
            contactMemoryKeys: ["ai:friend"],
            chatMemoryKeys: ["chat:reality:ai:friend"]
          }
        }
      ]
    ])
  };
}
