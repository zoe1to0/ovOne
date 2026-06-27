import type { MinimalProductShellRuntime } from "../minimal-ui-shell/index.js";
import type { InteractionAction, SemanticMobileState } from "./behavior-registry.js";

export type FlowExecutorContext = Readonly<{
  readonly shell: MinimalProductShellRuntime;
  readonly state: SemanticMobileState;
}>;

export type FlowExecutorResult = Readonly<{
  readonly shouldRender: boolean;
  readonly executedFlow?: "SEND_MESSAGE" | "SWITCH_WORLD";
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
