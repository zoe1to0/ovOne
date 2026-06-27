import type { MinimalProductShellView } from "../minimal-ui-shell/index.js";
import type { WorldId } from "../world-domain/index.js";

export type MobileMvpTab = "chats" | "contacts" | "me";
export type ViewState = "CHAT_LIST" | "CHAT_VIEW" | "CONTACTS" | "CONTACT_DETAIL" | "ME";
export type MobileOverlay = "add-menu" | "chat-menu" | "ovo-control" | "emoji-picker" | "file-picker" | null;
export type ViewRouteResolution = Readonly<{
  readonly route: ViewState;
  readonly fallbackApplied: boolean;
  readonly issue?: string;
}>;

export type InteractionAction =
  | { readonly type: "NAV_OPEN_CHAT_LIST" }
  | { readonly type: "NAV_OPEN_CONTACTS" }
  | { readonly type: "NAV_OPEN_ME" }
  | { readonly type: "SWITCH_WORLD"; readonly worldId: WorldId }
  | { readonly type: "OPEN_CHAT"; readonly chatId: string }
  | { readonly type: "NAV_BACK" }
  | { readonly type: "OPEN_ADD_MENU" }
  | { readonly type: "OPEN_CHAT_MENU" }
  | { readonly type: "OPEN_OVO_CONTROL" }
  | { readonly type: "OPEN_EMOJI_PICKER" }
  | { readonly type: "OPEN_FILE_PICKER" }
  | { readonly type: "CLOSE_OVERLAY" }
  | { readonly type: "TEXT_INPUT"; readonly text: string }
  | { readonly type: "SUBMIT_MESSAGE"; readonly text: string }
  | { readonly type: "OPEN_SETTINGS" }
  | { readonly type: "CLOSE_SETTINGS" }
  | { readonly type: "OPEN_CONTACT"; readonly actorId: string }
  | { readonly type: "CREATE_AI_FRIEND" }
  | { readonly type: "CREATE_GROUP" }
  | { readonly type: "CREATE_WORLD" }
  | { readonly type: "CHAT_OPEN_GROUP_MEMBERS" }
  | { readonly type: "CHAT_OPEN_SETTINGS" }
  | { readonly type: "CHAT_OPEN_BACKGROUND_SETTINGS" }
  | { readonly type: "SETTINGS_DISCONNECT_AI" };

export type SemanticMobileState = {
  activeView: ViewState;
  currentWorldId: WorldId;
  activeChatId: string | null;
  overlay: MobileOverlay;
  selectedContactActorId: string | null;
  inputDraft: string;
  settingsOpen: boolean;
  splashVisible: boolean;
  view: MinimalProductShellView;
};

export type BehaviorRegistryResult = Readonly<{
  readonly shouldRender: boolean;
  readonly disabledAction?: DisabledInteractionAction;
}>;

type DisabledInteractionAction = Exclude<
  InteractionAction["type"],
  | "NAV_OPEN_CHAT_LIST"
  | "NAV_OPEN_CONTACTS"
  | "NAV_OPEN_ME"
  | "SWITCH_WORLD"
  | "OPEN_CHAT"
  | "NAV_BACK"
  | "OPEN_ADD_MENU"
  | "OPEN_CHAT_MENU"
  | "OPEN_OVO_CONTROL"
  | "OPEN_EMOJI_PICKER"
  | "OPEN_FILE_PICKER"
  | "CLOSE_OVERLAY"
  | "TEXT_INPUT"
  | "SUBMIT_MESSAGE"
  | "OPEN_SETTINGS"
  | "CLOSE_SETTINGS"
  | "OPEN_CONTACT"
>;

export type BehaviorRegistry = Readonly<{
  readonly execute: (action: InteractionAction, state: SemanticMobileState) => BehaviorRegistryResult;
  readonly resolveView: (activeView: string) => ViewRouteResolution;
  readonly currentOverlay: (state: SemanticMobileState) => MobileOverlay;
}>;

const RENDER: BehaviorRegistryResult = Object.freeze({ shouldRender: true });
const SKIP_RENDER: BehaviorRegistryResult = Object.freeze({ shouldRender: false });

export function createBehaviorRegistry(): BehaviorRegistry {
  const closeOverlay = (state: SemanticMobileState): void => {
    state.overlay = null;
  };

  const openOverlay = (state: SemanticMobileState, overlay: Exclude<MobileOverlay, null>): void => {
    state.overlay = overlay;
  };

  const disabled = (
    state: SemanticMobileState,
    action: DisabledInteractionAction
  ): BehaviorRegistryResult => {
    closeOverlay(state);
    return Object.freeze({ shouldRender: true, disabledAction: action });
  };

  const execute = (action: InteractionAction, state: SemanticMobileState): BehaviorRegistryResult => {
    switch (action.type) {
      case "TEXT_INPUT":
        state.inputDraft = action.text;
        return SKIP_RENDER;

      case "NAV_OPEN_CHAT_LIST":
        state.activeView = "CHAT_LIST";
        state.activeChatId = null;
        state.selectedContactActorId = null;
        closeOverlay(state);
        state.settingsOpen = false;
        return RENDER;

      case "NAV_OPEN_CONTACTS":
        state.activeView = "CONTACTS";
        state.activeChatId = null;
        state.selectedContactActorId = null;
        closeOverlay(state);
        state.settingsOpen = false;
        return RENDER;

      case "NAV_OPEN_ME":
        state.activeView = "ME";
        state.activeChatId = null;
        state.selectedContactActorId = null;
        closeOverlay(state);
        state.settingsOpen = false;
        return RENDER;

      case "SWITCH_WORLD":
        state.currentWorldId = action.worldId;
        state.activeView = "CHAT_LIST";
        state.activeChatId = null;
        state.selectedContactActorId = null;
        closeOverlay(state);
        state.settingsOpen = false;
        return RENDER;

      case "OPEN_CHAT":
        state.activeChatId = action.chatId;
        state.activeView = "CHAT_VIEW";
        closeOverlay(state);
        return RENDER;

      case "NAV_BACK":
        if (state.activeView === "CONTACT_DETAIL") {
          state.activeView = "CONTACTS";
          state.selectedContactActorId = null;
        } else {
          state.activeView = "CHAT_LIST";
          state.activeChatId = null;
        }
        closeOverlay(state);
        return RENDER;

      case "OPEN_OVO_CONTROL":
        state.activeView = "CHAT_LIST";
        state.activeChatId = null;
        openOverlay(state, "ovo-control");
        return RENDER;

      case "OPEN_ADD_MENU":
        openOverlay(state, "add-menu");
        return RENDER;

      case "OPEN_CHAT_MENU":
        openOverlay(state, "chat-menu");
        return RENDER;

      case "OPEN_EMOJI_PICKER":
        openOverlay(state, "emoji-picker");
        return RENDER;

      case "OPEN_FILE_PICKER":
        openOverlay(state, "file-picker");
        return RENDER;

      case "CLOSE_OVERLAY":
        closeOverlay(state);
        return RENDER;

      case "SUBMIT_MESSAGE": {
        const text = action.text.trim();
        if (!text) {
          return SKIP_RENDER;
        }
        state.inputDraft = "";
        closeOverlay(state);
        return RENDER;
      }

      case "OPEN_SETTINGS":
        state.settingsOpen = true;
        closeOverlay(state);
        return RENDER;

      case "CLOSE_SETTINGS":
        state.settingsOpen = false;
        closeOverlay(state);
        return RENDER;

      case "OPEN_CONTACT":
        state.activeView = "CONTACT_DETAIL";
        state.selectedContactActorId = action.actorId;
        closeOverlay(state);
        return RENDER;

      case "CREATE_AI_FRIEND":
      case "CREATE_GROUP":
      case "CREATE_WORLD":
      case "CHAT_OPEN_GROUP_MEMBERS":
      case "CHAT_OPEN_SETTINGS":
      case "CHAT_OPEN_BACKGROUND_SETTINGS":
      case "SETTINGS_DISCONNECT_AI":
        return disabled(state, action.type);
    }
  };

  return Object.freeze({
    execute,
    resolveView,
    currentOverlay: (state) => state.overlay
  });
}

export function resolveView(activeView: string): ViewRouteResolution {
  if (
    activeView === "CHAT_LIST" ||
    activeView === "CHAT_VIEW" ||
    activeView === "CONTACTS" ||
    activeView === "CONTACT_DETAIL" ||
    activeView === "ME"
  ) {
    return Object.freeze({
      route: activeView,
      fallbackApplied: false
    });
  }
  return Object.freeze({
    route: "CHAT_LIST",
    fallbackApplied: true,
    issue: `Unknown activeView '${activeView}' resolved to CHAT_LIST.`
  });
}

export function tabForView(activeView: ViewState): MobileMvpTab {
  if (activeView === "CONTACTS" || activeView === "CONTACT_DETAIL") {
    return "contacts";
  }
  if (activeView === "ME") {
    return "me";
  }
  return "chats";
}
