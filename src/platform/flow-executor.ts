import type { MinimalProductShellRuntime } from "../minimal-ui-shell/index.js";
import { sanitizeCreateWorldDraft, validateCreateWorldDraft, validateCreateWorldDraftFields } from "./behavior-registry.js";
import type { InteractionAction, SemanticMobileState } from "./behavior-registry.js";
import { createWorldCreationTransition } from "./world-creation-transition.js";

export type FlowExecutorContext = Readonly<{
  readonly shell: MinimalProductShellRuntime;
  readonly state: SemanticMobileState;
}>;

export type FlowExecutorResult = Readonly<{
  readonly shouldRender: boolean;
  readonly executedFlow?: "SEND_MESSAGE" | "SWITCH_WORLD" | "CREATE_WORLD";
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
