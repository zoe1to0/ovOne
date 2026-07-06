import type { MinimalProductShellRuntime } from "../minimal-ui-shell/index.js";
import {
  CHAT_SETTINGS_SAVE_SUCCESS_MESSAGE,
  CONTACT_DETAIL_SAVE_SUCCESS_MESSAGE,
  GROUP_FILES_FILE_NAME_REQUIRED_MESSAGE,
  GROUP_FILES_METADATA_ADD_SUCCESS_MESSAGE,
  GROUP_RULES_SAVE_SUCCESS_MESSAGE,
  validateDeleteFriendCommand,
  validateChatSettingsPatch,
  validateGroupAddMemberCommand,
  validateGroupFileUploadCommand,
  validateGroupRemoveMemberCommand,
  validateGroupRulesPatch,
  WORLD_EDITOR_SAVE_SUCCESS_MESSAGE,
  validateContactDetailPreferencePatch,
  validateWorldEditorPatch,
  validateWorldRoleEditorPatch
} from "../domain/index.js";
import { WORLD_MEMBER_ADD_SUCCESS_MESSAGE } from "../minimal-ui-shell/world-member-service.js";
import { GROUP_MEMBER_ADD_SUCCESS_MESSAGE, GROUP_MEMBER_REMOVE_SUCCESS_MESSAGE } from "../minimal-ui-shell/group-member-service.js";
import { privateChatIdForFriend } from "../minimal-ui-shell/contact-detail-delete-service.js";
import { privateChatIdForMember, WORLD_MEMBER_REMOVE_SUCCESS_MESSAGE } from "../minimal-ui-shell/world-member-remove-service.js";
import {
  contactDetailPreferencePatchFromDraft,
  chatSettingsPatchFromDraft,
  createChatSettingsContractInput,
  createGroupMemberManagementInput,
  createGroupFilesContractInput,
  createGroupRulesContractInput,
  createContactDetailContractInput,
  groupFileUploadCommandFromDraft,
  groupRulesPatchFromDraft,
  sanitizeCreateWorldDraft,
  validateCreateWorldDraft,
  validateCreateWorldDraftFields
} from "./behavior-registry.js";
import type { InteractionAction, SemanticMobileState } from "./behavior-registry.js";
import { validateCreateGroupDraft } from "./behavior-registry.js";
import { createWorldCreationTransition } from "./world-creation-transition.js";

export type FlowExecutorContext = Readonly<{
  readonly shell: MinimalProductShellRuntime;
  readonly state: SemanticMobileState;
}>;

export type FlowExecutorResult = Readonly<{
  readonly shouldRender: boolean;
  readonly executedFlow?: "SEND_MESSAGE" | "SWITCH_WORLD" | "CREATE_WORLD" | "CREATE_GROUP" | "SAVE_WORLD_METADATA" | "SAVE_CONTACT_DETAIL_PREFERENCES" | "SAVE_CHAT_SETTINGS" | "SAVE_GROUP_RULES" | "SAVE_GROUP_FILE_METADATA" | "ADD_GROUP_MEMBER" | "REMOVE_GROUP_MEMBER" | "DELETE_FRIEND" | "ADD_WORLD_MEMBER" | "REMOVE_WORLD_MEMBER";
}>;

export type FlowExecutor = Readonly<{
  readonly run: (action: InteractionAction, context: FlowExecutorContext) => FlowExecutorResult;
  readonly runAsync: (action: InteractionAction, context: FlowExecutorContext) => Promise<FlowExecutorResult>;
}>;

const NO_FLOW: FlowExecutorResult = Object.freeze({ shouldRender: false });

export function createFlowExecutor(): FlowExecutor {
  const run = (action: InteractionAction, context: FlowExecutorContext): FlowExecutorResult => {
    if (action.type !== "SUBMIT_MESSAGE") {
      if (action.type === "SWITCH_WORLD") {
        context.state.view = context.shell.switchWorld(action.worldId);
        context.state.currentWorldId = context.state.view.product.snapshot.worldMeta.id;
        return Object.freeze({ shouldRender: true, executedFlow: "SWITCH_WORLD" });
      }
      if (action.type === "CONFIRM_CREATE_WORLD_DRAFT" || action.type === "CONFIRM_CREATE_WORLD_DETAIL") {
        const draft = context.state.createWorldDraft;
        if (!draft) {
          return NO_FLOW;
        }
        const sanitized = sanitizeCreateWorldDraft(draft);
        const fieldErrors = validateCreateWorldDraftFields(sanitized);
        const validationError = validateCreateWorldDraft(sanitized);
        context.state.createWorldDraft = Object.freeze({
          ...sanitized,
          fieldErrors,
          validationError
        });
        if (validationError) {
          return NO_FLOW;
        }
        if (action.type === "CONFIRM_CREATE_WORLD_DRAFT" && draft.nextMode !== "random-role") {
          return NO_FLOW;
        }
        if (
          action.type === "CONFIRM_CREATE_WORLD_DETAIL" &&
          (draft.nextMode !== "detailed-edit" || !draft.detailRoleMode)
        ) {
          return NO_FLOW;
        }
        const { validationError: _validationError, ...draftForCreate } = sanitized;
        context.state.view = context.shell.createWorldFromDraft(draftForCreate);
        context.state.currentWorldId = context.state.view.product.snapshot.worldMeta.id;
        context.state.activeView = "CHAT_LIST";
        context.state.activeChatId = null;
        context.state.selectedContactActorId = null;
        context.state.overlay = null;
        context.state.settingsOpen = false;
        context.state.worldCreationTransition = createWorldCreationTransition({
          worldId: context.state.currentWorldId,
          draft: sanitized
        });
        context.state.createWorldDraft = null;
        return Object.freeze({ shouldRender: true, executedFlow: "CREATE_WORLD" });
      }
      if (action.type === "CONFIRM_CREATE_GROUP") {
        const draft = context.state.createGroupDraft;
        if (!draft) {
          return NO_FLOW;
        }
        const validated = validateCreateGroupDraft(draft);
        context.state.createGroupDraft = validated;
        if (validated.validationError) {
          return NO_FLOW;
        }
        context.state.view = context.shell.createGroupChat({
          groupName: validated.groupName.trim() || "群聊",
          selectedWorldContactIds: validated.selectedWorldContactIds
        });
        context.state.currentWorldId = context.state.view.product.snapshot.worldMeta.id;
        context.state.activeView = "CHAT_VIEW";
        context.state.activeChatId = context.state.view.product.snapshot.chatState.activeChatId;
        context.state.selectedContactActorId = null;
        context.state.overlay = null;
        context.state.settingsOpen = false;
        context.state.createGroupDraft = null;
        return Object.freeze({ shouldRender: true, executedFlow: "CREATE_GROUP" });
      }
      if (action.type === "SAVE_WORLD_EDITOR") {
        const draft = context.state.worldEditorDraft;
        if (!draft || draft.locked) {
          return NO_FLOW;
        }
        const validation = validateWorldEditorPatch(
          {
            worldId: draft.worldId,
            name: draft.worldName,
            worldview: draft.worldviewText
          },
          { worldType: "custom" }
        );
        context.state.worldEditorDraft = Object.freeze({
          ...draft,
          fieldErrors: Object.freeze({
            worldName: validation.fieldErrors.name
          }),
          noticeMessage: null
        });
        if (!validation.valid || !validation.patch) {
          return NO_FLOW;
        }
        context.state.view = context.shell.saveWorldMetadata(validation.patch);
        const rolePatch = {
          worldId: draft.worldId,
          userRole: {
            roleName: draft.userRole?.roleName ?? "",
            personaNotes: draft.userRole?.personaNotes ?? ""
          },
          memberRoles: draft.memberRoles ?? []
        };
        const roleValidation = validateWorldRoleEditorPatch(rolePatch, { worldType: "custom" });
        if (roleValidation.valid && roleValidation.patch) {
          context.state.view = context.shell.saveWorldRoleMetadata(roleValidation.patch);
        }
        context.state.currentWorldId = context.state.view.product.snapshot.worldMeta.id;
        context.state.activeView = "WORLD_EDITOR";
        context.state.activeChatId = null;
        context.state.selectedContactActorId = null;
        context.state.overlay = null;
        context.state.settingsOpen = false;
        context.state.selectedWorldIdForEditing = validation.patch.worldId;
        context.state.worldEditorDraft = Object.freeze({
          ...draft,
          worldName: validation.patch.name,
          worldviewText: validation.patch.worldview,
          originalWorldviewText: validation.patch.worldview,
          fieldErrors: Object.freeze({
            worldName: null
          }),
          warnings: Object.freeze([]),
          noticeMessage: WORLD_EDITOR_SAVE_SUCCESS_MESSAGE
        });
        return Object.freeze({ shouldRender: true, executedFlow: "SAVE_WORLD_METADATA" });
      }
      if (action.type === "SAVE_CONTACT_DETAIL_PREFERENCES") {
        const draft = context.state.contactDetailDraft;
        if (!draft) {
          return NO_FLOW;
        }
        const validation = validateContactDetailPreferencePatch(
          contactDetailPreferencePatchFromDraft(draft),
          createContactDetailContractInput(context.state)
        );
        if (!validation.valid || !validation.patch) {
          return NO_FLOW;
        }
        context.state.view = context.shell.saveContactDetailPreferences(validation.patch);
        context.state.currentWorldId = context.state.view.product.snapshot.worldMeta.id;
        context.state.activeView = "CONTACT_DETAIL";
        context.state.activeChatId = null;
        context.state.selectedContactActorId = validation.patch.worldContactId;
        context.state.overlay = null;
        context.state.settingsOpen = false;
        context.state.contactDetailDraft = Object.freeze({
          ...draft,
          noticeMessage: CONTACT_DETAIL_SAVE_SUCCESS_MESSAGE,
          deleteFriendConfirmation: null
        });
        return Object.freeze({ shouldRender: true, executedFlow: "SAVE_CONTACT_DETAIL_PREFERENCES" });
      }
      if (action.type === "SAVE_CHAT_SETTINGS") {
        const draft = context.state.chatSettingsDraft;
        if (!draft) {
          return NO_FLOW;
        }
        const validation = validateChatSettingsPatch(
          chatSettingsPatchFromDraft(draft, context.state.currentWorldId),
          createChatSettingsContractInput(context.state)
        );
        if (!validation.valid || !validation.patch) {
          context.state.chatSettingsDraft = Object.freeze({
            ...draft,
            noticeMessage: validation.error ?? "ChatSettings: invalid appearance patch."
          });
          return Object.freeze({ shouldRender: true });
        }
        context.state.view = context.shell.saveChatAppearanceSettings(validation.patch);
        context.state.currentWorldId = context.state.view.product.snapshot.worldMeta.id;
        context.state.activeView = "CHAT_SETTINGS";
        context.state.activeChatId = validation.patch.chatId;
        context.state.selectedChatIdForSettings = validation.patch.chatId;
        context.state.overlay = null;
        context.state.settingsOpen = false;
        context.state.chatSettingsDraft = Object.freeze({
          ...draft,
          noticeMessage: CHAT_SETTINGS_SAVE_SUCCESS_MESSAGE
        });
        return Object.freeze({ shouldRender: true, executedFlow: "SAVE_CHAT_SETTINGS" });
      }
      if (action.type === "SAVE_GROUP_RULES") {
        const draft = context.state.chatSettingsDraft;
        if (!draft) {
          return NO_FLOW;
        }
        const validation = validateGroupRulesPatch(
          groupRulesPatchFromDraft(draft, context.state.currentWorldId),
          createGroupRulesContractInput(context.state)
        );
        if (!validation.valid || !validation.patch) {
          context.state.chatSettingsDraft = Object.freeze({
            ...draft,
            noticeMessage: validation.error ?? "GroupRules: invalid group rules patch."
          });
          return Object.freeze({ shouldRender: true });
        }
        context.state.view = context.shell.saveGroupRules(validation.patch);
        context.state.currentWorldId = context.state.view.product.snapshot.worldMeta.id;
        context.state.activeView = "CHAT_SETTINGS";
        context.state.activeChatId = validation.patch.groupChatId;
        context.state.selectedChatIdForSettings = validation.patch.groupChatId;
        context.state.overlay = null;
        context.state.settingsOpen = false;
        context.state.chatSettingsDraft = Object.freeze({
          ...draft,
          noticeMessage: GROUP_RULES_SAVE_SUCCESS_MESSAGE
        });
        return Object.freeze({ shouldRender: true, executedFlow: "SAVE_GROUP_RULES" });
      }
      if (action.type === "CONFIRM_GROUP_FILE_METADATA") {
        const draft = context.state.chatSettingsDraft;
        if (!draft) {
          return NO_FLOW;
        }
        const validation = validateGroupFileUploadCommand(
          groupFileUploadCommandFromDraft(draft, context.state.currentWorldId),
          createGroupFilesContractInput(context.state)
        );
        if (!validation.valid || !validation.command) {
          context.state.chatSettingsDraft = Object.freeze({
            ...draft,
            noticeMessage: validation.error ?? GROUP_FILES_FILE_NAME_REQUIRED_MESSAGE
          });
          return Object.freeze({ shouldRender: true });
        }
        context.state.view = context.shell.saveGroupFileMetadata(validation.command);
        context.state.currentWorldId = context.state.view.product.snapshot.worldMeta.id;
        context.state.activeView = "CHAT_SETTINGS";
        context.state.activeChatId = validation.command.groupChatId;
        context.state.selectedChatIdForSettings = validation.command.groupChatId;
        context.state.overlay = null;
        context.state.settingsOpen = false;
        context.state.chatSettingsDraft = Object.freeze({
          ...draft,
          groupFileName: "",
          groupFileType: "",
          groupFileSize: "",
          noticeMessage: GROUP_FILES_METADATA_ADD_SUCCESS_MESSAGE
        });
        return Object.freeze({ shouldRender: true, executedFlow: "SAVE_GROUP_FILE_METADATA" });
      }
      if (action.type === "CONFIRM_GROUP_ADD_MEMBER") {
        const draft = context.state.chatSettingsDraft;
        if (!draft) {
          return NO_FLOW;
        }
        const validation = validateGroupAddMemberCommand(
          {
            worldId: context.state.currentWorldId,
            groupChatId: draft.chatId,
            worldContactId: action.worldContactId
          },
          createGroupMemberManagementInput(context.state)
        );
        if (!validation.valid || !validation.command) {
          context.state.chatSettingsDraft = Object.freeze({
            ...draft,
            noticeMessage: validation.error ?? "GroupMemberManagement: invalid add member command."
          });
          return Object.freeze({ shouldRender: true });
        }
        try {
          context.state.view = context.shell.addGroupMember(validation.command);
        } catch (error) {
          context.state.chatSettingsDraft = Object.freeze({
            ...draft,
            noticeMessage: error instanceof Error ? error.message : "添加失败"
          });
          return Object.freeze({ shouldRender: true });
        }
        context.state.currentWorldId = context.state.view.product.snapshot.worldMeta.id;
        context.state.activeView = "CHAT_SETTINGS";
        context.state.activeChatId = validation.command.groupChatId;
        context.state.selectedChatIdForSettings = validation.command.groupChatId;
        context.state.overlay = null;
        context.state.settingsOpen = false;
        context.state.chatSettingsDraft = Object.freeze({
          ...draft,
          noticeMessage: GROUP_MEMBER_ADD_SUCCESS_MESSAGE,
          groupMemberRemoveConfirmation: null
        });
        return Object.freeze({ shouldRender: true, executedFlow: "ADD_GROUP_MEMBER" });
      }
      if (action.type === "CONFIRM_GROUP_REMOVE_MEMBER") {
        const draft = context.state.chatSettingsDraft;
        const confirmation = draft?.groupMemberRemoveConfirmation ?? null;
        if (!draft || confirmation?.worldContactId !== action.worldContactId) {
          return NO_FLOW;
        }
        const validation = validateGroupRemoveMemberCommand(
          {
            worldId: context.state.currentWorldId,
            groupChatId: draft.chatId,
            worldContactId: action.worldContactId
          },
          createGroupMemberManagementInput(context.state)
        );
        if (!validation.valid || !validation.command) {
          context.state.chatSettingsDraft = Object.freeze({
            ...draft,
            noticeMessage: validation.error ?? "GroupMemberManagement: invalid remove member command.",
            groupMemberRemoveConfirmation: null
          });
          return Object.freeze({ shouldRender: true });
        }
        try {
          context.state.view = context.shell.removeGroupMember(validation.command);
        } catch (error) {
          context.state.chatSettingsDraft = Object.freeze({
            ...draft,
            noticeMessage: error instanceof Error ? error.message : "移除失败"
          });
          return Object.freeze({ shouldRender: true });
        }
        context.state.currentWorldId = context.state.view.product.snapshot.worldMeta.id;
        context.state.activeView = "CHAT_SETTINGS";
        context.state.activeChatId = validation.command.groupChatId;
        context.state.selectedChatIdForSettings = validation.command.groupChatId;
        context.state.overlay = null;
        context.state.settingsOpen = false;
        context.state.chatSettingsDraft = Object.freeze({
          ...draft,
          noticeMessage: GROUP_MEMBER_REMOVE_SUCCESS_MESSAGE,
          groupMemberRemoveConfirmation: null
        });
        return Object.freeze({ shouldRender: true, executedFlow: "REMOVE_GROUP_MEMBER" });
      }
      if (action.type === "CONFIRM_DELETE_FRIEND") {
        const draft = context.state.contactDetailDraft;
        const confirmation = draft?.deleteFriendConfirmation ?? null;
        if (!draft || confirmation?.worldContactId !== action.worldContactId || draft.worldId !== action.worldId) {
          return NO_FLOW;
        }
        const validation = validateDeleteFriendCommand(
          { worldId: action.worldId, worldContactId: action.worldContactId },
          createContactDetailContractInput(context.state)
        );
        if (!validation.valid || !validation.command) {
          return NO_FLOW;
        }
        const deletedChatId = privateChatIdForFriend(validation.command);
        context.state.view = context.shell.deleteFriend(validation.command);
        context.state.currentWorldId = context.state.view.product.snapshot.worldMeta.id;
        context.state.activeView = "CONTACTS";
        context.state.activeChatId = null;
        context.state.selectedContactActorId = null;
        context.state.overlay = null;
        context.state.settingsOpen = false;
        context.state.contactDetailDraft = null;
        context.state.worldEditorDraft = null;
        context.state.selectedWorldIdForEditing = null;
        return Object.freeze({
          shouldRender: true,
          executedFlow: "DELETE_FRIEND"
        });
      }
      if (action.type === "ADD_WORLD_MEMBER") {
        const draft = context.state.worldEditorDraft;
        if (!draft || draft.worldId !== action.worldId || draft.locked) {
          return NO_FLOW;
        }
        try {
          context.state.view = context.shell.addWorldMember({
            worldId: action.worldId,
            globalAILinkId: action.globalAILinkId
          });
        } catch (error) {
          context.state.worldEditorDraft = Object.freeze({
            ...draft,
            noticeMessage: error instanceof Error ? error.message : "添加失败"
          });
          return Object.freeze({ shouldRender: true });
        }
        context.state.currentWorldId = context.state.view.product.snapshot.worldMeta.id;
        context.state.activeView = "WORLD_EDITOR";
        context.state.activeChatId = null;
        context.state.selectedContactActorId = null;
        context.state.overlay = null;
        context.state.settingsOpen = false;
        context.state.selectedWorldIdForEditing = action.worldId;
        context.state.worldEditorDraft = Object.freeze({
          ...draft,
          noticeMessage: WORLD_MEMBER_ADD_SUCCESS_MESSAGE
        });
        return Object.freeze({ shouldRender: true, executedFlow: "ADD_WORLD_MEMBER" });
      }
      if (action.type === "CONFIRM_REMOVE_WORLD_MEMBER") {
        const draft = context.state.worldEditorDraft;
        const confirmation = draft?.removeMemberConfirmation ?? null;
        if (!draft || draft.worldId !== action.worldId || draft.locked || confirmation?.actorId !== action.actorId) {
          return NO_FLOW;
        }
        const deletedChatId = privateChatIdForMember({ worldId: action.worldId, actorId: action.actorId });
        try {
          context.state.view = context.shell.removeWorldMember({
            worldId: action.worldId,
            actorId: action.actorId
          });
        } catch (error) {
          context.state.worldEditorDraft = Object.freeze({
            ...draft,
            noticeMessage: error instanceof Error ? error.message : "删除失败"
          });
          return Object.freeze({ shouldRender: true });
        }
        context.state.currentWorldId = context.state.view.product.snapshot.worldMeta.id;
        context.state.selectedWorldIdForEditing = action.worldId;
        context.state.selectedContactActorId = null;
        context.state.overlay = null;
        context.state.settingsOpen = false;
        if (context.state.currentWorldId === action.worldId && context.state.activeChatId === deletedChatId) {
          context.state.activeView = "CHAT_LIST";
          context.state.activeChatId = null;
        } else {
          context.state.activeView = "WORLD_EDITOR";
          context.state.activeChatId = context.state.activeChatId === deletedChatId ? null : context.state.activeChatId;
        }
        context.state.worldEditorDraft = Object.freeze({
          ...draft,
          noticeMessage: WORLD_MEMBER_REMOVE_SUCCESS_MESSAGE,
          removeMemberConfirmation: null
        });
        return Object.freeze({ shouldRender: true, executedFlow: "REMOVE_WORLD_MEMBER" });
      }
      return NO_FLOW;
    }

    const text = action.text.trim();
    if (!text) {
      return NO_FLOW;
    }

    context.state.view = context.shell.sendMessage(text);
    context.state.currentWorldId = context.state.view.product.snapshot.worldMeta.id;
    context.state.activeChatId = context.state.view.product.snapshot.chatState.activeChatId;
    context.state.activeView = "CHAT_VIEW";
    return Object.freeze({ shouldRender: true, executedFlow: "SEND_MESSAGE" });
  };

  const runAsync = async (action: InteractionAction, context: FlowExecutorContext): Promise<FlowExecutorResult> => {
    if (action.type !== "SUBMIT_MESSAGE") {
      return run(action, context);
    }
    const text = action.text.trim();
    if (!text) {
      return NO_FLOW;
    }
    context.state.view = await context.shell.sendMessageWithAI(text);
    context.state.currentWorldId = context.state.view.product.snapshot.worldMeta.id;
    context.state.activeChatId = context.state.view.product.snapshot.chatState.activeChatId;
    context.state.activeView = "CHAT_VIEW";
    return Object.freeze({ shouldRender: true, executedFlow: "SEND_MESSAGE" });
  };

  return Object.freeze({ run, runAsync });
}
