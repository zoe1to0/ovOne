import type { MinimalProductShellView } from "../minimal-ui-shell/index.js";
import type { WorldId } from "../world-domain/index.js";
import { isComposerModeAllowed, resolveDefaultComposerMode, toggleComposerMode } from "./composer-mode.js";
import type { ComposerKind, ComposerMode } from "./composer-mode.js";

export type MobileMvpTab = "chats" | "contacts" | "me";
export type ViewState =
  | "CHAT_LIST"
  | "CHAT_VIEW"
  | "CONTACTS"
  | "CONTACT_DETAIL"
  | "ME"
  | "CREATE_WORLD_DRAFT"
  | "CREATE_WORLD_DETAIL_EDIT";
export type MobileOverlay =
  | "add-menu"
  | "chat-menu"
  | "ovo-control"
  | "ovo-world-menu"
  | "world-switcher"
  | "world-editor-selector"
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
export type CreateWorldDetailRoleMode = "random-role" | "fixed-role" | "empty-role";
export type FixedRoleDraft = Readonly<{
  readonly actorId: string;
  readonly roleName: string;
  readonly notes: string;
}>;
export type RandomRoleSlotDraft = Readonly<{
  readonly id: string;
  readonly roleName: string;
  readonly personaNotes: string;
}>;
export type CreateWorldDraft = {
  worldName: string;
  worldviewSourceType: CreateWorldViewSourceType;
  worldviewText: string;
  selectedAIModelIds: readonly string[];
  nextMode: CreateWorldNextMode | null;
  detailRoleMode: CreateWorldDetailRoleMode;
  randomRoleSlots: readonly RandomRoleSlotDraft[];
  selectedUserRoleSlotId: string | null;
  fixedRoles: readonly FixedRoleDraft[];
  validationError: string | null;
  fieldErrors: Readonly<{
    readonly worldName: string | null;
    readonly selectedAI: string | null;
  }>;
  noticeMessage: string | null;
};
export type WorldCreationTransition = Readonly<{
  readonly worldId: WorldId;
  readonly worldName: string;
  readonly phase: "loading" | "welcome" | "done";
  readonly loadingText: string;
  readonly welcomeText: string;
}>;
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
  | { readonly type: "OPEN_CREATE_WORLD_DETAIL_EDIT" }
  | { readonly type: "UPDATE_CREATE_WORLD_DRAFT"; readonly field: "worldName" | "worldviewText"; readonly value: string }
  | { readonly type: "UPDATE_CREATE_WORLD_DETAIL"; readonly field: "worldName" | "worldviewText"; readonly value: string }
  | { readonly type: "UPDATE_CREATE_WORLD_RANDOM_ROLE_SLOT"; readonly slotId: string; readonly field: "roleName" | "personaNotes"; readonly value: string }
  | { readonly type: "TOGGLE_RANDOM_ROLE_USER_SLOT"; readonly slotId: string }
  | { readonly type: "UPDATE_CREATE_WORLD_FIXED_ROLE"; readonly actorId: string; readonly field: "roleName" | "notes"; readonly value: string }
  | { readonly type: "SELECT_WORLDVIEW_SOURCE"; readonly sourceType: CreateWorldViewSourceType }
  | { readonly type: "TOGGLE_CREATE_WORLD_AI"; readonly aiModelId: string }
  | { readonly type: "SELECT_CREATE_WORLD_NEXT_MODE"; readonly nextMode: CreateWorldNextMode }
  | { readonly type: "SELECT_DETAIL_ROLE_MODE"; readonly roleMode: CreateWorldDetailRoleMode }
  | { readonly type: "CONFIRM_CREATE_WORLD_DRAFT" }
  | { readonly type: "CONFIRM_CREATE_WORLD_DETAIL" }
  | { readonly type: "CANCEL_CREATE_WORLD_DRAFT" }
  | { readonly type: "CANCEL_CREATE_WORLD_DETAIL" }
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
  worldCreationTransition: WorldCreationTransition | null;
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
  | "OPEN_CREATE_WORLD_DETAIL_EDIT"
  | "UPDATE_CREATE_WORLD_DRAFT"
  | "UPDATE_CREATE_WORLD_DETAIL"
  | "UPDATE_CREATE_WORLD_RANDOM_ROLE_SLOT"
  | "TOGGLE_RANDOM_ROLE_USER_SLOT"
  | "UPDATE_CREATE_WORLD_FIXED_ROLE"
  | "SELECT_WORLDVIEW_SOURCE"
  | "TOGGLE_CREATE_WORLD_AI"
  | "SELECT_CREATE_WORLD_NEXT_MODE"
  | "SELECT_DETAIL_ROLE_MODE"
  | "CONFIRM_CREATE_WORLD_DRAFT"
  | "CONFIRM_CREATE_WORLD_DETAIL"
  | "CANCEL_CREATE_WORLD_DRAFT"
  | "CANCEL_CREATE_WORLD_DETAIL"
>;

export type BehaviorRegistry = Readonly<{
  readonly execute: (action: InteractionAction, state: SemanticMobileState) => BehaviorRegistryResult;
  readonly resolveView: (activeView: string) => ViewRouteResolution;
  readonly currentOverlay: (state: SemanticMobileState) => MobileOverlay;
}>;

const RENDER: BehaviorRegistryResult = Object.freeze({ shouldRender: true });
const SKIP_RENDER: BehaviorRegistryResult = Object.freeze({ shouldRender: false });
export const CREATE_WORLD_NAME_REQUIRED_MESSAGE = "请输入世界名称";
export const CREATE_WORLD_AI_REQUIRED_MESSAGE = "请选择至少一个 AI 朋友";
export const CREATE_WORLD_IMPORT_UNAVAILABLE_MESSAGE = "文档导入暂未开放";

export function sanitizeCreateWorldDraft(draft: CreateWorldDraft): CreateWorldDraft {
  const randomRoleSlots = syncRandomRoleSlotsForDraft(draft);
  return Object.freeze({
    ...draft,
    randomRoleSlots,
    selectedUserRoleSlotId: syncSelectedUserRoleSlotIdForSlots(draft.selectedUserRoleSlotId, randomRoleSlots),
    fixedRoles: syncFixedRolesForDraft(draft)
  });
}

export function validateCreateWorldDraft(draft: CreateWorldDraft): string | null {
  const fieldErrors = validateCreateWorldDraftFields(draft);
  return fieldErrors.worldName ?? fieldErrors.selectedAI;
}

export function validateCreateWorldDraftFields(draft: CreateWorldDraft): CreateWorldDraft["fieldErrors"] {
  return Object.freeze({
    worldName: draft.worldName.trim() ? null : CREATE_WORLD_NAME_REQUIRED_MESSAGE,
    selectedAI: draft.selectedAIModelIds.length > 0 ? null : CREATE_WORLD_AI_REQUIRED_MESSAGE
  });
}

function createEmptyRandomRoleSlot(index: number): RandomRoleSlotDraft {
  return Object.freeze({
    id: `role-slot:${index + 1}`,
    roleName: "",
    personaNotes: ""
  });
}

function syncRandomRoleSlotsForDraft(draft: CreateWorldDraft): readonly RandomRoleSlotDraft[] {
  const slotCount = 1 + draft.selectedAIModelIds.length;
  return Object.freeze(Array.from({ length: slotCount }, (_, index) => draft.randomRoleSlots[index] ?? createEmptyRandomRoleSlot(index)));
}

function syncSelectedUserRoleSlotIdForSlots(
  selectedUserRoleSlotId: string | null,
  randomRoleSlots: readonly RandomRoleSlotDraft[]
): string | null {
  return randomRoleSlots.some((slot) => slot.id === selectedUserRoleSlotId) ? selectedUserRoleSlotId : null;
}

function syncFixedRolesForDraft(draft: CreateWorldDraft): readonly FixedRoleDraft[] {
  const actorIds = ["user", ...draft.selectedAIModelIds];
  const existing = new Map(draft.fixedRoles.map((role) => [role.actorId, role]));
  return Object.freeze(actorIds.map((actorId) => existing.get(actorId) ?? Object.freeze({
    actorId,
    roleName: "",
    notes: ""
  })));
}

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
    nextMode: null,
    detailRoleMode: "random-role",
    randomRoleSlots: [createEmptyRandomRoleSlot(0)],
    selectedUserRoleSlotId: null,
    fixedRoles: [],
    validationError: null,
    fieldErrors: Object.freeze({
      worldName: null,
      selectedAI: null
    }),
    noticeMessage: null
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
        } else if (state.activeView === "CREATE_WORLD_DETAIL_EDIT") {
          state.activeView = "CREATE_WORLD_DRAFT";
        } else if (state.activeView === "CREATE_WORLD_DRAFT") {
          state.activeView = "CHAT_LIST";
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
        state.activeView = "CREATE_WORLD_DRAFT";
        state.activeChatId = null;
        state.selectedContactActorId = null;
        closeOverlay(state);
        state.settingsOpen = false;
        return RENDER;

      case "OPEN_CREATE_WORLD_DETAIL_EDIT": {
        const draft = ensureCreateWorldDraft(state);
        state.createWorldDraft = Object.freeze({
          ...draft,
          nextMode: "detailed-edit",
          validationError: null,
          noticeMessage: null,
          randomRoleSlots: syncRandomRoleSlotsForDraft(draft),
          selectedUserRoleSlotId: syncSelectedUserRoleSlotIdForSlots(draft.selectedUserRoleSlotId, syncRandomRoleSlotsForDraft(draft)),
          fixedRoles: syncFixedRolesForDraft(draft)
        });
        state.activeView = "CREATE_WORLD_DETAIL_EDIT";
        state.activeChatId = null;
        state.selectedContactActorId = null;
        closeOverlay(state);
        state.settingsOpen = false;
        return RENDER;
      }

      case "UPDATE_CREATE_WORLD_DRAFT": {
        const draft = ensureCreateWorldDraft(state);
        state.createWorldDraft = Object.freeze({
          ...draft,
          [action.field]: action.value,
          fieldErrors: Object.freeze({
            ...draft.fieldErrors,
            worldName: action.field === "worldName" && action.value.trim() ? null : draft.fieldErrors.worldName
          }),
          validationError: action.field === "worldName" && action.value.trim() ? null : draft.validationError
        });
        return RENDER;
      }

      case "UPDATE_CREATE_WORLD_DETAIL": {
        const draft = ensureCreateWorldDraft(state);
        state.createWorldDraft = Object.freeze({
          ...draft,
          [action.field]: action.value,
          fieldErrors: Object.freeze({
            ...draft.fieldErrors,
            worldName: action.field === "worldName" && action.value.trim() ? null : draft.fieldErrors.worldName
          }),
          validationError: action.field === "worldName" && action.value.trim() ? null : draft.validationError
        });
        return RENDER;
      }

      case "UPDATE_CREATE_WORLD_RANDOM_ROLE_SLOT": {
        const draft = ensureCreateWorldDraft(state);
        const syncedSlots = syncRandomRoleSlotsForDraft(draft);
        const randomRoleSlots = syncedSlots.map((slot) =>
          slot.id === action.slotId
            ? Object.freeze({ ...slot, [action.field]: action.value })
            : slot
        );
        state.createWorldDraft = Object.freeze({
          ...draft,
          randomRoleSlots,
          selectedUserRoleSlotId: syncSelectedUserRoleSlotIdForSlots(draft.selectedUserRoleSlotId, randomRoleSlots)
        });
        return RENDER;
      }

      case "TOGGLE_RANDOM_ROLE_USER_SLOT": {
        const draft = ensureCreateWorldDraft(state);
        const randomRoleSlots = syncRandomRoleSlotsForDraft(draft);
        const slotExists = randomRoleSlots.some((slot) => slot.id === action.slotId);
        state.createWorldDraft = Object.freeze({
          ...draft,
          randomRoleSlots,
          selectedUserRoleSlotId: !slotExists || draft.selectedUserRoleSlotId === action.slotId ? null : action.slotId
        });
        return RENDER;
      }

      case "UPDATE_CREATE_WORLD_FIXED_ROLE": {
        const draft = ensureCreateWorldDraft(state);
        const fixedRoles = syncFixedRolesForDraft(draft).map((role) =>
          role.actorId === action.actorId
            ? Object.freeze({ ...role, [action.field]: action.value })
            : role
        );
        state.createWorldDraft = Object.freeze({
          ...draft,
          fixedRoles
        });
        return RENDER;
      }

      case "SELECT_WORLDVIEW_SOURCE": {
        const draft = ensureCreateWorldDraft(state);
        if (action.sourceType === "worldview-document" || action.sourceType === "project-document") {
          state.createWorldDraft = Object.freeze({
            ...draft,
            noticeMessage: CREATE_WORLD_IMPORT_UNAVAILABLE_MESSAGE
          });
          return RENDER;
        }
        state.createWorldDraft = Object.freeze({
          ...draft,
          worldviewSourceType: action.sourceType,
          noticeMessage: null
        });
        return RENDER;
      }

      case "TOGGLE_CREATE_WORLD_AI": {
        const draft = ensureCreateWorldDraft(state);
        const selected = draft.selectedAIModelIds.includes(action.aiModelId)
          ? draft.selectedAIModelIds.filter((id) => id !== action.aiModelId)
          : [...draft.selectedAIModelIds, action.aiModelId];
        const nextDraft = Object.freeze({
          ...draft,
          selectedAIModelIds: selected
        });
        const randomRoleSlots = syncRandomRoleSlotsForDraft(nextDraft);
        state.createWorldDraft = Object.freeze({
          ...nextDraft,
          randomRoleSlots,
          selectedUserRoleSlotId: syncSelectedUserRoleSlotIdForSlots(nextDraft.selectedUserRoleSlotId, randomRoleSlots),
          fieldErrors: Object.freeze({
            ...nextDraft.fieldErrors,
            selectedAI: selected.length > 0 ? null : nextDraft.fieldErrors.selectedAI
          }),
          validationError: selected.length > 0 ? null : nextDraft.validationError
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

      case "SELECT_DETAIL_ROLE_MODE": {
        const draft = ensureCreateWorldDraft(state);
        state.createWorldDraft = Object.freeze({
          ...draft,
          detailRoleMode: action.roleMode,
          nextMode: "detailed-edit",
          randomRoleSlots: syncRandomRoleSlotsForDraft(draft),
          selectedUserRoleSlotId: syncSelectedUserRoleSlotIdForSlots(draft.selectedUserRoleSlotId, syncRandomRoleSlotsForDraft(draft)),
          fixedRoles: syncFixedRolesForDraft(draft)
        });
        return RENDER;
      }

      case "CONFIRM_CREATE_WORLD_DRAFT":
      case "CONFIRM_CREATE_WORLD_DETAIL": {
        const draft = state.createWorldDraft;
        if (!draft) {
          state.createWorldDraft = null;
          return RENDER;
        }
        const sanitized = sanitizeCreateWorldDraft(draft);
        const fieldErrors = validateCreateWorldDraftFields(sanitized);
        const validationError = fieldErrors.worldName ?? fieldErrors.selectedAI;
        state.createWorldDraft = Object.freeze({
          ...sanitized,
          fieldErrors,
          validationError
        });
        return RENDER;
      }

      case "CANCEL_CREATE_WORLD_DRAFT":
      case "CANCEL_CREATE_WORLD_DETAIL":
        state.createWorldDraft = null;
        state.activeView = "CHAT_LIST";
        state.activeChatId = null;
        state.selectedContactActorId = null;
        closeOverlay(state);
        state.settingsOpen = false;
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
    activeView === "ME" ||
    activeView === "CREATE_WORLD_DRAFT" ||
    activeView === "CREATE_WORLD_DETAIL_EDIT"
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
  if (activeView === "CREATE_WORLD_DRAFT" || activeView === "CREATE_WORLD_DETAIL_EDIT") {
    return "chats";
  }
  return "chats";
}
