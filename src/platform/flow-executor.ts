import type { MinimalProductShellRuntime } from "../minimal-ui-shell/index.js";
import {
  CONTACT_DETAIL_SAVE_SUCCESS_MESSAGE,
  WORLD_EDITOR_SAVE_SUCCESS_MESSAGE,
  validateContactDetailPreferencePatch,
  validateWorldEditorPatch,
  validateWorldRoleEditorPatch
} from "../domain/index.js";
import { WORLD_MEMBER_ADD_SUCCESS_MESSAGE } from "../minimal-ui-shell/world-member-service.js";
import { privateChatIdForMember, WORLD_MEMBER_REMOVE_SUCCESS_MESSAGE } from "../minimal-ui-shell/world-member-remove-service.js";
import {
  contactDetailPreferencePatchFromDraft,
  createContactDetailContractInput,
  sanitizeCreateWorldDraft,
  validateCreateWorldDraft,
  validateCreateWorldDraftFields
} from "./behavior-registry.js";
import type { InteractionAction, SemanticMobileState } from "./behavior-registry.js";
import { createWorldCreationTransition } from "./world-creation-transition.js";

export type FlowExecutorContext = Readonly<{
  readonly shell: MinimalProductShellRuntime;
  readonly state: SemanticMobileState;
}>;

export type FlowExecutorResult = Readonly<{
  readonly shouldRender: boolean;
  readonly executedFlow?: "SEND_MESSAGE" | "SWITCH_WORLD" | "CREATE_WORLD" | "SAVE_WORLD_METADATA" | "SAVE_CONTACT_DETAIL_PREFERENCES" | "ADD_WORLD_MEMBER" | "REMOVE_WORLD_MEMBER";
}>;

export type FlowExecutor = Readonly<{
  readonly run: (action: InteractionAction, context: FlowExecutorContext) => FlowExecutorResult;
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

  return Object.freeze({ run });
}
