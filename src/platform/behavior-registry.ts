import type { MinimalProductShellView } from "../minimal-ui-shell/index.js";
import type { WorldId } from "../world-domain/index.js";
import { isComposerModeAllowed, resolveDefaultComposerMode, toggleComposerMode } from "./composer-mode.js";
import type { ComposerKind, ComposerMode } from "./composer-mode.js";

export type MobileMvpTab = "chats" | "contacts" | "me";
export type ViewState = "CHAT_LIST" | "CHAT_VIEW" | "CONTACTS" | "CONTACT_DETAIL" | "ME";
export type MobileOverlay =
  | "add-menu"
  | "chat-menu"
  | "ovo-control"
  | "ovo-world-menu"
  | "world-switcher"
  | "world-editor-selector"
  | "create-world-draft"
  | "emoji-picker"
  | "file-picker"
  | null;
export const OVO_CHAT_ID = "ovo";
export type CreateWorldViewSourceType =
  | "text"
  | "worldview-document"
  | "project-document"
  | "blank"
  | "official";
export type CreateWorldNextMode = "random-role" | "detailed-edit";
export type CreateWorldDraft = {
  worldName: string;
  worldviewSourceType: CreateWorldViewSourceType;
  worldviewText: string;
  selectedAIModelIds: readonly string[];
  nextMode: CreateWorldNextMode | null;
};
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
  | { readonly type: "OPEN_OVO_CHAT" }
  | { readonly type: "NAV_BACK" }
  | { readonly type: "OPEN_ADD_MENU" }
  | { readonly type: "OPEN_CHAT_MENU" }
  | { readonly type: "OPEN_OVO_CONTROL" }
  | { readonly type: "OPEN_OVO_WORLD_MENU" }
  | { readonly type: "OPEN_WORLD_SWITCHER" }
  | { readonly type: "OPEN_WORLD_EDITOR_SELECTOR" }
  | { readonly type: "OPEN_WORLD_EDITOR"; readonly worldId: WorldId }
  | { readonly type: "OPEN_EMOJI_PICKER" }
  | { readonly type: "OPEN_FILE_PICKER" }
  | { readonly type: "CLOSE_OVERLAY" }
  | { readonly type: "TOGGLE_COMPOSER_MODE"; readonly kind: ComposerKind }
  | { readonly type: "SET_COMPOSER_MODE"; readonly kind: ComposerKind; readonly mode: ComposerMode }
  | { readonly type: "TEXT_INPUT"; readonly text: string }
  | { readonly type: "SUBMIT_MESSAGE"; readonly text: string }
  | { readonly type: "OPEN_SETTINGS" }
  | { readonly type: "CLOSE_SETTINGS" }
  | { readonly type: "OPEN_CONTACT"; readonly actorId: string }
  | { readonly type: "CREATE_AI_FRIEND" }
  | { readonly type: "CREATE_GROUP" }
  | { readonly type: "OPEN_CREATE_WORLD_DRAFT" }
  | { readonly type: "UPDATE_CREATE_WORLD_DRAFT"; readonly field: "worldName" | "worldviewText"; readonly value: string }
  | { readonly type: "SELECT_WORLDVIEW_SOURCE"; readonly sourceType: CreateWorldViewSourceType }
  | { readonly type: "TOGGLE_CREATE_WORLD_AI"; readonly aiModelId: string }
  | { readonly type: "SELECT_CREATE_WORLD_NEXT_MODE"; readonly nextMode: CreateWorldNextMode }
  | { readonly type: "CONFIRM_CREATE_WORLD_DRAFT" }
  | { readonly type: "CANCEL_CREATE_WORLD_DRAFT" }
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
  composerMode: ComposerMode;
  inputDraft: string;
  settingsOpen: boolean;
  createWorldDraft: CreateWorldDraft | null;
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
  | "OPEN_OVO_CHAT"
  | "NAV_BACK"
  | "OPEN_ADD_MENU"
  | "OPEN_CHAT_MENU"
  | "OPEN_OVO_CONTROL"
  | "OPEN_OVO_WORLD_MENU"
  | "OPEN_WORLD_SWITCHER"
  | "OPEN_WORLD_EDITOR_SELECTOR"
  | "OPEN_EMOJI_PICKER"
  | "OPEN_FILE_PICKER"
  | "CLOSE_OVERLAY"
  | "TOGGLE_COMPOSER_MODE"
  | "SET_COMPOSER_MODE"
  | "TEXT_INPUT"
  | "SUBMIT_MESSAGE"
  | "OPEN_SETTINGS"
  | "CLOSE_SETTINGS"
  | "OPEN_CONTACT"
  | "OPEN_CREATE_WORLD_DRAFT"
  | "UPDATE_CREATE_WORLD_DRAFT"
  | "SELECT_WORLDVIEW_SOURCE"
  | "TOGGLE_CREATE_WORLD_AI"
  | "SELECT_CREATE_WORLD_NEXT_MODE"
  | "CONFIRM_CREATE_WORLD_DRAFT"
  | "CANCEL_CREATE_WORLD_DRAFT"
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

  const createEmptyWorldDraft = (): CreateWorldDraft => ({
    worldName: "",
    worldviewSourceType: "text",
    worldviewText: "",
    selectedAIModelIds: [],
    nextMode: null
  });

  const ensureCreateWorldDraft = (state: SemanticMobileState): CreateWorldDraft => {
    state.createWorldDraft ??= createEmptyWorldDraft();
    return state.createWorldDraft;
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
        state.composerMode = resolveDefaultComposerMode("normal");
        closeOverlay(state);
        return RENDER;

      case "OPEN_OVO_CHAT":
        state.activeChatId = OVO_CHAT_ID;
        state.activeView = "CHAT_VIEW";
        state.selectedContactActorId = null;
        state.composerMode = resolveDefaultComposerMode("ovo");
        closeOverlay(state);
        state.settingsOpen = false;
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
        openOverlay(state, "ovo-world-menu");
        return RENDER;

      case "OPEN_OVO_WORLD_MENU":
        openOverlay(state, "ovo-world-menu");
        return RENDER;

      case "OPEN_WORLD_SWITCHER":
        openOverlay(state, "world-switcher");
        return RENDER;

      case "OPEN_WORLD_EDITOR_SELECTOR":
        openOverlay(state, "world-editor-selector");
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

      case "TOGGLE_COMPOSER_MODE":
        state.composerMode = toggleComposerMode(action.kind, state.composerMode);
        return RENDER;

      case "SET_COMPOSER_MODE":
        state.composerMode = isComposerModeAllowed(action.kind, action.mode)
          ? action.mode
          : state.composerMode;
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

      case "OPEN_CREATE_WORLD_DRAFT":
        state.createWorldDraft = createEmptyWorldDraft();
        openOverlay(state, "create-world-draft");
        return RENDER;

      case "UPDATE_CREATE_WORLD_DRAFT": {
        const draft = ensureCreateWorldDraft(state);
        state.createWorldDraft = Object.freeze({
          ...draft,
          [action.field]: action.value
        });
        return RENDER;
      }

      case "SELECT_WORLDVIEW_SOURCE": {
        const draft = ensureCreateWorldDraft(state);
        state.createWorldDraft = Object.freeze({
          ...draft,
          worldviewSourceType: action.sourceType
        });
        return RENDER;
      }

      case "TOGGLE_CREATE_WORLD_AI": {
        const draft = ensureCreateWorldDraft(state);
        const selected = draft.selectedAIModelIds.includes(action.aiModelId)
          ? draft.selectedAIModelIds.filter((id) => id !== action.aiModelId)
          : [...draft.selectedAIModelIds, action.aiModelId];
        state.createWorldDraft = Object.freeze({
          ...draft,
          selectedAIModelIds: selected
        });
        return RENDER;
      }

      case "SELECT_CREATE_WORLD_NEXT_MODE": {
        const draft = ensureCreateWorldDraft(state);
        state.createWorldDraft = Object.freeze({
          ...draft,
          nextMode: action.nextMode
        });
        return RENDER;
      }

      case "CONFIRM_CREATE_WORLD_DRAFT":
        state.createWorldDraft = state.createWorldDraft
          ? Object.freeze({ ...state.createWorldDraft })
          : null;
        return RENDER;

      case "CANCEL_CREATE_WORLD_DRAFT":
        state.createWorldDraft = null;
        closeOverlay(state);
        return RENDER;

      case "CREATE_AI_FRIEND":
      case "CREATE_GROUP":
      case "OPEN_WORLD_EDITOR":
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
