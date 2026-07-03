import type { MinimalProductShellView } from "../minimal-ui-shell/index.js";
import {
  getWorldEditorWarnings,
  buildLinkedAIDisconnectPreview,
  guardLinkedAIDisconnectExecution,
  validateContactDetailPreferencePatch,
  validateDeleteFriendCommand,
  validateLinkedAIDisconnectCommand,
  validateWorldAddMemberCommand,
  validateWorldRemoveMemberCommand,
  validateWorldEditorPatch
} from "../domain/index.js";
import type { GlobalAILink, GlobalAIModel, GuardedLinkedAIDisconnectStatus, LinkedAIDisconnectPreviewViewModel, WorldContact as DomainWorldContact } from "../domain/index.js";
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
  | "CHAT_SETTINGS"
  | "CREATE_GROUP_DRAFT"
  | "CREATE_WORLD_DRAFT"
  | "CREATE_WORLD_DETAIL_EDIT"
  | "WORLD_EDITOR";
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
export type WorldEditorUserRoleDraft = Readonly<{
  readonly roleName: string;
  readonly personaNotes: string;
}>;
export type WorldEditorMemberRoleDraft = Readonly<{
  readonly worldContactId: string;
  readonly worldRoleName: string;
  readonly worldPersonaNotes: string;
}>;
export type WorldEditorDraft = Readonly<{
  readonly worldId: WorldId;
  readonly worldName: string;
  readonly worldviewText: string;
  readonly originalWorldviewText: string;
  readonly locked: boolean;
  readonly fieldErrors: Readonly<{
    readonly worldName: string | null;
  }>;
  readonly warnings: readonly string[];
  readonly noticeMessage: string | null;
  readonly userRole?: WorldEditorUserRoleDraft;
  readonly memberRoles?: readonly WorldEditorMemberRoleDraft[];
  readonly removeMemberConfirmation: Readonly<{
    readonly actorId: string;
    readonly displayName: string;
    readonly warning: string;
  }> | null;
}>;
export type ContactDetailDraft = Readonly<{
  readonly worldId: WorldId;
  readonly worldContactId: string;
  readonly remark: string;
  readonly perceivedPersonaNotes: string;
  readonly answerMode: "conversational" | "qa";
  readonly chatTone: string;
  readonly emojiPermission: boolean;
  readonly noticeMessage: string | null;
  readonly deleteFriendConfirmation: Readonly<{
    readonly worldContactId: string;
    readonly displayName: string;
    readonly warning: string;
  }> | null;
}>;
export type CreateGroupDraft = Readonly<{
  readonly groupName: string;
  readonly selectedWorldContactIds: readonly string[];
  readonly validationError: string | null;
  readonly fieldErrors: Readonly<{
    readonly selectedMembers: string | null;
  }>;
  readonly noticeMessage: string | null;
}>;
export type ChatSettingsDraft = Readonly<{
  readonly chatId: string;
  readonly backgroundImagePlaceholder: string;
  readonly backgroundColor: string;
  readonly myBubbleColor: string;
  readonly otherBubbleColor: string;
  readonly noticeMessage: string | null;
}>;
export type LinkedAIDisconnectConfirmation = Readonly<{
  readonly globalAILinkId: string;
  readonly displayName: string;
  readonly warning: string;
  readonly preview: LinkedAIDisconnectPreviewViewModel | null;
  readonly status: "preview" | GuardedLinkedAIDisconnectStatus;
  readonly noticeMessage: string | null;
  readonly errorMessage: string | null;
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
  | { readonly type: "OPEN_CHAT_SETTINGS" }
  | { readonly type: "UPDATE_CHAT_SETTINGS_DRAFT"; readonly field: "backgroundColor" | "myBubbleColor" | "otherBubbleColor"; readonly value: string }
  | { readonly type: "CANCEL_CHAT_SETTINGS" }
  | { readonly type: "SAVE_CHAT_SETTINGS" }
  | { readonly type: "OPEN_GROUP_ADD_MEMBER" }
  | { readonly type: "OPEN_GROUP_REMOVE_MEMBER" }
  | { readonly type: "OPEN_GROUP_RULES" }
  | { readonly type: "OPEN_GROUP_FILES" }
  | { readonly type: "UPLOAD_CHAT_BACKGROUND_IMAGE" }
  | { readonly type: "OPEN_ADD_MENU" }
  | { readonly type: "OPEN_CHAT_MENU" }
  | { readonly type: "OPEN_OVO_CONTROL" }
  | { readonly type: "OPEN_OVO_WORLD_MENU" }
  | { readonly type: "OPEN_WORLD_SWITCHER" }
  | { readonly type: "OPEN_WORLD_EDITOR_SELECTOR" }
  | { readonly type: "OPEN_WORLD_EDITOR"; readonly worldId: WorldId }
  | { readonly type: "UPDATE_WORLD_EDITOR_DRAFT"; readonly field: "worldName" | "worldviewText"; readonly value: string }
  | { readonly type: "UPDATE_WORLD_EDITOR_USER_ROLE_DRAFT"; readonly field: "roleName" | "personaNotes"; readonly value: string }
  | { readonly type: "UPDATE_WORLD_EDITOR_MEMBER_ROLE_DRAFT"; readonly worldContactId: string; readonly field: "worldRoleName" | "worldPersonaNotes"; readonly value: string }
  | { readonly type: "CANCEL_WORLD_EDITOR" }
  | { readonly type: "SAVE_WORLD_EDITOR" }
  | { readonly type: "ADD_WORLD_MEMBER"; readonly worldId: WorldId; readonly globalAILinkId: string }
  | { readonly type: "OPEN_REMOVE_WORLD_MEMBER_CONFIRMATION"; readonly worldId: WorldId; readonly actorId: string; readonly displayName: string }
  | { readonly type: "CANCEL_REMOVE_WORLD_MEMBER" }
  | { readonly type: "CONFIRM_REMOVE_WORLD_MEMBER"; readonly worldId: WorldId; readonly actorId: string }
  | { readonly type: "OPEN_EMOJI_PICKER" }
  | { readonly type: "OPEN_FILE_PICKER" }
  | { readonly type: "CLOSE_OVERLAY" }
  | { readonly type: "TOGGLE_COMPOSER_MODE"; readonly kind: ComposerKind }
  | { readonly type: "SET_COMPOSER_MODE"; readonly kind: ComposerKind; readonly mode: ComposerMode }
  | { readonly type: "TEXT_INPUT"; readonly text: string }
  | { readonly type: "SUBMIT_MESSAGE"; readonly text: string }
  | { readonly type: "OPEN_SETTINGS" }
  | { readonly type: "CLOSE_SETTINGS" }
  | { readonly type: "OPEN_LINKED_AI_DISCONNECT_CONFIRMATION"; readonly globalAILinkId: string; readonly displayName: string }
  | { readonly type: "CANCEL_LINKED_AI_DISCONNECT" }
  | { readonly type: "CONFIRM_LINKED_AI_DISCONNECT"; readonly globalAILinkId: string }
  | { readonly type: "OPEN_CONTACT"; readonly actorId: string }
  | { readonly type: "UPDATE_CONTACT_DETAIL_DRAFT"; readonly field: "remark" | "perceivedPersonaNotes" | "answerMode" | "chatTone" | "emojiPermission"; readonly value: string | boolean }
  | { readonly type: "SAVE_CONTACT_DETAIL_PREFERENCES" }
  | { readonly type: "OPEN_DELETE_FRIEND_CONFIRMATION"; readonly worldId: WorldId; readonly worldContactId: string; readonly displayName: string }
  | { readonly type: "CANCEL_DELETE_FRIEND" }
  | { readonly type: "CONFIRM_DELETE_FRIEND"; readonly worldId: WorldId; readonly worldContactId: string }
  | { readonly type: "CREATE_AI_FRIEND" }
  | { readonly type: "OPEN_CREATE_GROUP_DRAFT" }
  | { readonly type: "UPDATE_CREATE_GROUP_DRAFT"; readonly field: "groupName"; readonly value: string }
  | { readonly type: "TOGGLE_CREATE_GROUP_MEMBER"; readonly worldContactId: string }
  | { readonly type: "CONFIRM_CREATE_GROUP" }
  | { readonly type: "CANCEL_CREATE_GROUP" }
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
  | { readonly type: "COMPLETE_WORLD_CREATION_TRANSITION" }
  | { readonly type: "CHAT_OPEN_GROUP_MEMBERS" }
  | { readonly type: "CHAT_OPEN_SETTINGS" }
  | { readonly type: "CHAT_OPEN_BACKGROUND_SETTINGS" };

export type SemanticMobileState = {
  activeView: ViewState;
  currentWorldId: WorldId;
  activeChatId: string | null;
  overlay: MobileOverlay;
  selectedContactActorId: string | null;
  selectedChatIdForSettings: string | null;
  selectedWorldIdForEditing: WorldId | null;
  composerMode: ComposerMode;
  inputDraft: string;
  settingsOpen: boolean;
  createGroupDraft: CreateGroupDraft | null;
  chatSettingsDraft: ChatSettingsDraft | null;
  createWorldDraft: CreateWorldDraft | null;
  worldEditorDraft: WorldEditorDraft | null;
  contactDetailDraft: ContactDetailDraft | null;
  linkedAIDisconnectConfirmation: LinkedAIDisconnectConfirmation | null;
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
  | "OPEN_CHAT_SETTINGS"
  | "UPDATE_CHAT_SETTINGS_DRAFT"
  | "CANCEL_CHAT_SETTINGS"
  | "SAVE_CHAT_SETTINGS"
  | "OPEN_GROUP_ADD_MEMBER"
  | "OPEN_GROUP_REMOVE_MEMBER"
  | "OPEN_GROUP_RULES"
  | "OPEN_GROUP_FILES"
  | "UPLOAD_CHAT_BACKGROUND_IMAGE"
  | "OPEN_ADD_MENU"
  | "OPEN_CHAT_MENU"
  | "OPEN_OVO_CONTROL"
  | "OPEN_OVO_WORLD_MENU"
  | "OPEN_WORLD_SWITCHER"
  | "OPEN_WORLD_EDITOR_SELECTOR"
  | "OPEN_WORLD_EDITOR"
  | "UPDATE_WORLD_EDITOR_DRAFT"
  | "UPDATE_WORLD_EDITOR_USER_ROLE_DRAFT"
  | "UPDATE_WORLD_EDITOR_MEMBER_ROLE_DRAFT"
  | "CANCEL_WORLD_EDITOR"
  | "SAVE_WORLD_EDITOR"
  | "ADD_WORLD_MEMBER"
  | "OPEN_REMOVE_WORLD_MEMBER_CONFIRMATION"
  | "CANCEL_REMOVE_WORLD_MEMBER"
  | "CONFIRM_REMOVE_WORLD_MEMBER"
  | "OPEN_EMOJI_PICKER"
  | "OPEN_FILE_PICKER"
  | "CLOSE_OVERLAY"
  | "TOGGLE_COMPOSER_MODE"
  | "SET_COMPOSER_MODE"
  | "TEXT_INPUT"
  | "SUBMIT_MESSAGE"
  | "OPEN_SETTINGS"
  | "CLOSE_SETTINGS"
  | "OPEN_LINKED_AI_DISCONNECT_CONFIRMATION"
  | "CANCEL_LINKED_AI_DISCONNECT"
  | "CONFIRM_LINKED_AI_DISCONNECT"
  | "OPEN_CONTACT"
  | "UPDATE_CONTACT_DETAIL_DRAFT"
  | "SAVE_CONTACT_DETAIL_PREFERENCES"
  | "OPEN_DELETE_FRIEND_CONFIRMATION"
  | "CANCEL_DELETE_FRIEND"
  | "CONFIRM_DELETE_FRIEND"
  | "OPEN_CREATE_GROUP_DRAFT"
  | "UPDATE_CREATE_GROUP_DRAFT"
  | "TOGGLE_CREATE_GROUP_MEMBER"
  | "CONFIRM_CREATE_GROUP"
  | "CANCEL_CREATE_GROUP"
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
  | "COMPLETE_WORLD_CREATION_TRANSITION"
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

export const CREATE_GROUP_AI_REQUIRED_MESSAGE = "请选择至少一个 AI 成员";

export function validateCreateGroupDraft(draft: CreateGroupDraft): CreateGroupDraft {
  const selectedMembers = draft.selectedWorldContactIds.length > 0 ? null : CREATE_GROUP_AI_REQUIRED_MESSAGE;
  return Object.freeze({
    ...draft,
    validationError: selectedMembers,
    fieldErrors: Object.freeze({
      selectedMembers
    })
  });
}

function scaffoldNoticeForChatSettingsAction(action: "OPEN_GROUP_ADD_MEMBER" | "OPEN_GROUP_REMOVE_MEMBER" | "OPEN_GROUP_RULES" | "OPEN_GROUP_FILES"): string {
  switch (action) {
    case "OPEN_GROUP_ADD_MEMBER":
      return "添加群成员暂未开放";
    case "OPEN_GROUP_REMOVE_MEMBER":
      return "移除群成员暂未开放";
    case "OPEN_GROUP_RULES":
      return "群规则暂未开放";
    case "OPEN_GROUP_FILES":
      return "群文件暂未开放";
  }
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

function withWorldEditorWarnings(draft: WorldEditorDraft): WorldEditorDraft {
  return Object.freeze({
    ...draft,
    warnings: getWorldEditorWarnings({
      locked: draft.locked,
      originalWorldview: draft.originalWorldviewText,
      nextWorldview: draft.worldviewText
    })
  });
}

function validateWorldEditorDraftForSave(draft: WorldEditorDraft): WorldEditorDraft {
  const validation = validateWorldEditorPatch(
    {
      worldId: draft.worldId,
      name: draft.worldName,
      worldview: draft.worldviewText
    },
    { worldType: draft.locked ? "reality" : "custom" }
  );
  return withWorldEditorWarnings(Object.freeze({
    ...draft,
    fieldErrors: Object.freeze({
      worldName: validation.fieldErrors.name
    }),
    noticeMessage: null
  }));
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

  const createEmptyGroupDraft = (): CreateGroupDraft => Object.freeze({
    groupName: "",
    selectedWorldContactIds: Object.freeze([]),
    validationError: null,
    fieldErrors: Object.freeze({
      selectedMembers: null
    }),
    noticeMessage: null
  });

  const createEmptyChatSettingsDraft = (chatId: string): ChatSettingsDraft => Object.freeze({
    chatId,
    backgroundImagePlaceholder: "",
    backgroundColor: "#ffffff",
    myBubbleColor: "#dcecff",
    otherBubbleColor: "#f2f2f2",
    noticeMessage: null
  });

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
        state.selectedChatIdForSettings = null;
        state.selectedWorldIdForEditing = null;
        state.createGroupDraft = null;
        state.chatSettingsDraft = null;
        state.worldEditorDraft = null;
        state.contactDetailDraft = null;
        state.linkedAIDisconnectConfirmation = null;
        closeOverlay(state);
        state.settingsOpen = false;
        return RENDER;

      case "NAV_OPEN_CONTACTS":
        state.activeView = "CONTACTS";
        state.activeChatId = null;
        state.selectedContactActorId = null;
        state.selectedChatIdForSettings = null;
        state.selectedWorldIdForEditing = null;
        state.createGroupDraft = null;
        state.chatSettingsDraft = null;
        state.worldEditorDraft = null;
        state.contactDetailDraft = null;
        state.linkedAIDisconnectConfirmation = null;
        closeOverlay(state);
        state.settingsOpen = false;
        return RENDER;

      case "NAV_OPEN_ME":
        state.activeView = "ME";
        state.activeChatId = null;
        state.selectedContactActorId = null;
        state.selectedWorldIdForEditing = null;
        state.createGroupDraft = null;
        state.selectedChatIdForSettings = null;
        state.chatSettingsDraft = null;
        state.worldEditorDraft = null;
        state.contactDetailDraft = null;
        state.linkedAIDisconnectConfirmation = null;
        closeOverlay(state);
        state.settingsOpen = false;
        return RENDER;

      case "SWITCH_WORLD":
        state.currentWorldId = action.worldId;
        state.activeView = "CHAT_LIST";
        state.activeChatId = null;
        state.selectedContactActorId = null;
        state.selectedWorldIdForEditing = null;
        state.createGroupDraft = null;
        state.selectedChatIdForSettings = null;
        state.chatSettingsDraft = null;
        state.worldEditorDraft = null;
        state.contactDetailDraft = null;
        state.linkedAIDisconnectConfirmation = null;
        closeOverlay(state);
        state.settingsOpen = false;
        return RENDER;

      case "OPEN_CHAT":
        state.activeChatId = action.chatId;
        state.activeView = "CHAT_VIEW";
        state.composerMode = resolveDefaultComposerMode("normal");
        state.selectedWorldIdForEditing = null;
        state.createGroupDraft = null;
        state.worldEditorDraft = null;
        state.contactDetailDraft = null;
        state.linkedAIDisconnectConfirmation = null;
        closeOverlay(state);
        return RENDER;

      case "OPEN_OVO_CHAT":
        state.activeChatId = OVO_CHAT_ID;
        state.activeView = "CHAT_VIEW";
        state.selectedContactActorId = null;
        state.selectedWorldIdForEditing = null;
        state.createGroupDraft = null;
        state.worldEditorDraft = null;
        state.contactDetailDraft = null;
        state.linkedAIDisconnectConfirmation = null;
        state.composerMode = resolveDefaultComposerMode("ovo");
        closeOverlay(state);
        state.settingsOpen = false;
        return RENDER;

      case "NAV_BACK":
        if (state.activeView === "CONTACT_DETAIL") {
          state.activeView = "CONTACTS";
          state.selectedContactActorId = null;
          state.contactDetailDraft = null;
        } else if (state.activeView === "CHAT_SETTINGS") {
          state.activeView = "CHAT_VIEW";
          state.activeChatId = state.selectedChatIdForSettings;
          state.selectedChatIdForSettings = null;
          state.chatSettingsDraft = null;
        } else if (state.activeView === "CREATE_WORLD_DETAIL_EDIT") {
          state.activeView = "CREATE_WORLD_DRAFT";
        } else if (state.activeView === "CREATE_GROUP_DRAFT") {
          state.activeView = "CHAT_LIST";
          state.createGroupDraft = null;
        } else if (state.activeView === "CREATE_WORLD_DRAFT") {
          state.activeView = "CHAT_LIST";
        } else if (state.activeView === "WORLD_EDITOR") {
          state.activeView = "CHAT_LIST";
          state.selectedWorldIdForEditing = null;
          state.worldEditorDraft = null;
          state.contactDetailDraft = null;
          state.selectedChatIdForSettings = null;
          state.chatSettingsDraft = null;
        } else {
          state.activeView = "CHAT_LIST";
          state.activeChatId = null;
        }
        state.linkedAIDisconnectConfirmation = null;
        closeOverlay(state);
        return RENDER;

      case "OPEN_CHAT_SETTINGS": {
        const chatId = state.activeChatId ?? state.view.product.snapshot.chatState.activeChatId;
        if (!chatId || chatId === OVO_CHAT_ID) {
          return RENDER;
        }
        state.activeView = "CHAT_SETTINGS";
        state.activeChatId = chatId;
        state.selectedChatIdForSettings = chatId;
        state.chatSettingsDraft = createEmptyChatSettingsDraft(chatId);
        state.createGroupDraft = null;
        state.worldEditorDraft = null;
        state.contactDetailDraft = null;
        closeOverlay(state);
        state.settingsOpen = false;
        return RENDER;
      }

      case "UPDATE_CHAT_SETTINGS_DRAFT":
        if (!state.chatSettingsDraft) {
          return RENDER;
        }
        state.chatSettingsDraft = Object.freeze({
          ...state.chatSettingsDraft,
          [action.field]: action.value,
          noticeMessage: null
        });
        return RENDER;

      case "CANCEL_CHAT_SETTINGS":
        state.activeView = "CHAT_VIEW";
        state.activeChatId = state.selectedChatIdForSettings;
        state.selectedChatIdForSettings = null;
        state.chatSettingsDraft = null;
        closeOverlay(state);
        return RENDER;

      case "SAVE_CHAT_SETTINGS":
        if (state.chatSettingsDraft) {
          state.chatSettingsDraft = Object.freeze({
            ...state.chatSettingsDraft,
            noticeMessage: "保存暂未开放"
          });
        }
        closeOverlay(state);
        return RENDER;

      case "UPLOAD_CHAT_BACKGROUND_IMAGE":
        if (state.chatSettingsDraft) {
          state.chatSettingsDraft = Object.freeze({
            ...state.chatSettingsDraft,
            backgroundImagePlaceholder: "背景图片上传暂未开放",
            noticeMessage: "背景图片上传暂未开放"
          });
        }
        closeOverlay(state);
        return RENDER;

      case "OPEN_GROUP_ADD_MEMBER":
      case "OPEN_GROUP_REMOVE_MEMBER":
      case "OPEN_GROUP_RULES":
      case "OPEN_GROUP_FILES":
        if (state.chatSettingsDraft) {
          state.chatSettingsDraft = Object.freeze({
            ...state.chatSettingsDraft,
            noticeMessage: scaffoldNoticeForChatSettingsAction(action.type)
          });
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

      case "OPEN_WORLD_EDITOR": {
        const selectedWorld = state.view.availableWorlds.find((world) => world.worldId === action.worldId);
        const isCurrentWorld = action.worldId === state.view.product.snapshot.worldMeta.id;
        const isReality = selectedWorld?.type === "reality" || (isCurrentWorld && state.view.product.snapshot.worldMeta.type === "reality");
        const runtimeState = state.view.product.snapshot.runtimeState as {
          readonly metadata?: {
            readonly worldView?: Readonly<Record<string, unknown>>;
          };
        };
        const worldView = isCurrentWorld ? runtimeState.metadata?.worldView ?? {} : selectedWorld?.worldView ?? {};
        const worldviewText = worldEditorTextFromWorldView(worldView);
        state.activeView = "WORLD_EDITOR";
        state.activeChatId = null;
        state.selectedContactActorId = null;
        state.selectedChatIdForSettings = null;
        state.linkedAIDisconnectConfirmation = null;
        state.selectedWorldIdForEditing = action.worldId;
        state.worldEditorDraft = Object.freeze({
          worldId: action.worldId,
          worldName: selectedWorld?.title ?? (isCurrentWorld ? state.view.product.snapshot.worldMeta.title : "未命名世界"),
          worldviewText,
          originalWorldviewText: worldviewText,
          locked: isReality,
          fieldErrors: Object.freeze({
            worldName: null
          }),
          warnings: Object.freeze([]),
          noticeMessage: null,
          userRole: createWorldEditorUserRoleDraft(worldView),
          memberRoles: createWorldEditorMemberRoleDrafts(state, action.worldId, worldView),
          removeMemberConfirmation: null
        });
        closeOverlay(state);
        state.settingsOpen = false;
        return RENDER;
      }

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
        state.linkedAIDisconnectConfirmation = null;
        closeOverlay(state);
        return RENDER;

      case "CLOSE_SETTINGS":
        state.settingsOpen = false;
        state.linkedAIDisconnectConfirmation = null;
        closeOverlay(state);
        return RENDER;

      case "OPEN_LINKED_AI_DISCONNECT_CONFIRMATION": {
        const validation = validateLinkedAIDisconnectCommand(
          { globalAILinkId: action.globalAILinkId },
          createLinkedAIDisconnectContractInputFromState(state)
        );
        state.linkedAIDisconnectConfirmation = validation.valid
          ? Object.freeze({
              globalAILinkId: action.globalAILinkId,
              displayName: action.displayName,
              warning: validation.warning,
              preview: state.view.worldScopedSnapshot
                ? buildLinkedAIDisconnectPreview(
                    { globalAILinkId: action.globalAILinkId },
                    state.view.worldScopedSnapshot
                  )
                : null,
              status: "preview",
              noticeMessage: null,
              errorMessage: null
            })
          : null;
        state.settingsOpen = true;
        closeOverlay(state);
        return RENDER;
      }

      case "CANCEL_LINKED_AI_DISCONNECT":
        state.linkedAIDisconnectConfirmation = null;
        closeOverlay(state);
        return RENDER;

      case "CONFIRM_LINKED_AI_DISCONNECT": {
        const confirmation = state.linkedAIDisconnectConfirmation;
        if (!confirmation) {
          return RENDER;
        }
        const result = state.view.worldScopedSnapshot
          ? guardLinkedAIDisconnectExecution({
              command: { globalAILinkId: action.globalAILinkId },
              confirmation,
              snapshot: state.view.worldScopedSnapshot
            })
          : {
              status: "guard-failed" as const,
              error: "断开预览缺失，请重新打开预览",
              notice: null
            };
        state.linkedAIDisconnectConfirmation = Object.freeze({
          ...confirmation,
          status: result.status,
          noticeMessage: result.notice,
          errorMessage: result.error
        });
        closeOverlay(state);
        return RENDER;
      }

      case "OPEN_CONTACT":
        state.activeView = "CONTACT_DETAIL";
        state.selectedContactActorId = action.actorId;
        state.selectedWorldIdForEditing = null;
        state.worldEditorDraft = null;
        state.contactDetailDraft = createContactDetailDraft(state, action.actorId);
        state.linkedAIDisconnectConfirmation = null;
        closeOverlay(state);
        return RENDER;

      case "UPDATE_CONTACT_DETAIL_DRAFT":
        if (!state.contactDetailDraft) {
          return RENDER;
        }
        state.contactDetailDraft = Object.freeze({
          ...state.contactDetailDraft,
          [action.field]: action.value,
          noticeMessage: "偏好将在保存时更新",
          deleteFriendConfirmation: null
        });
        return RENDER;

      case "SAVE_CONTACT_DETAIL_PREFERENCES": {
        if (!state.contactDetailDraft) {
          return RENDER;
        }
        const validation = validateContactDetailPreferencePatch(
          contactDetailPreferencePatchFromDraft(state.contactDetailDraft),
          createContactDetailContractInput(state)
        );
        state.contactDetailDraft = Object.freeze({
          ...state.contactDetailDraft,
          noticeMessage: validation.valid ? "偏好保存暂未开放" : validation.error,
          deleteFriendConfirmation: null
        });
        return RENDER;
      }

      case "OPEN_DELETE_FRIEND_CONFIRMATION": {
        const validation = validateDeleteFriendCommand(
          { worldId: action.worldId, worldContactId: action.worldContactId },
          createContactDetailContractInput(state)
        );
        if (state.contactDetailDraft) {
          state.contactDetailDraft = Object.freeze({
            ...state.contactDetailDraft,
            noticeMessage: validation.error,
            deleteFriendConfirmation: validation.valid
              ? Object.freeze({
                  worldContactId: action.worldContactId,
                  displayName: action.displayName,
                  warning: validation.warning
                })
              : null
          });
        }
        return RENDER;
      }

      case "CANCEL_DELETE_FRIEND":
        if (state.contactDetailDraft) {
          state.contactDetailDraft = Object.freeze({
            ...state.contactDetailDraft,
            noticeMessage: null,
            deleteFriendConfirmation: null
          });
        }
        return RENDER;

      case "CONFIRM_DELETE_FRIEND": {
        const validation = validateDeleteFriendCommand(
          { worldId: action.worldId, worldContactId: action.worldContactId },
          createContactDetailContractInput(state)
        );
        if (state.contactDetailDraft) {
          state.contactDetailDraft = Object.freeze({
            ...state.contactDetailDraft,
            noticeMessage: validation.valid ? "删除好友暂未开放" : validation.error,
            deleteFriendConfirmation: validation.valid ? state.contactDetailDraft.deleteFriendConfirmation : null
          });
        }
        return RENDER;
      }

      case "UPDATE_WORLD_EDITOR_DRAFT":
        if (!state.worldEditorDraft || state.worldEditorDraft.locked) {
          return RENDER;
        }
        state.worldEditorDraft = withWorldEditorWarnings(Object.freeze({
          ...state.worldEditorDraft,
          [action.field]: action.value,
          fieldErrors: Object.freeze({
            ...state.worldEditorDraft.fieldErrors,
            worldName: action.field === "worldName" && action.value.trim() ? null : state.worldEditorDraft.fieldErrors.worldName
          }),
          noticeMessage: null
        }));
        return RENDER;

      case "UPDATE_WORLD_EDITOR_USER_ROLE_DRAFT":
        if (!state.worldEditorDraft || state.worldEditorDraft.locked) {
          return RENDER;
        }
        state.worldEditorDraft = Object.freeze({
          ...state.worldEditorDraft,
          userRole: Object.freeze({
            ...(state.worldEditorDraft.userRole ?? createWorldEditorUserRoleDraft({})),
            [action.field]: action.value
          }),
          noticeMessage: "角色设定将在保存时更新"
        });
        return RENDER;

      case "UPDATE_WORLD_EDITOR_MEMBER_ROLE_DRAFT":
        if (!state.worldEditorDraft || state.worldEditorDraft.locked) {
          return RENDER;
        }
        state.worldEditorDraft = Object.freeze({
          ...state.worldEditorDraft,
          memberRoles: updateWorldEditorMemberRoleDraft(
            state.worldEditorDraft.memberRoles ?? createWorldEditorMemberRoleDrafts(state, state.worldEditorDraft.worldId, {}),
            action.worldContactId,
            action.field,
            action.value
          ),
          noticeMessage: "角色设定将在保存时更新"
        });
        return RENDER;

      case "SAVE_WORLD_EDITOR":
        if (state.worldEditorDraft) {
          state.worldEditorDraft = validateWorldEditorDraftForSave(state.worldEditorDraft);
        }
        return RENDER;

      case "ADD_WORLD_MEMBER": {
        const validation = validateWorldAddMemberCommand(
          { worldId: action.worldId, globalAILinkId: action.globalAILinkId },
          createWorldMemberContractInputFromState(state, action.worldId)
        );
        if (state.worldEditorDraft) {
          state.worldEditorDraft = Object.freeze({
            ...state.worldEditorDraft,
            noticeMessage: validation.error,
            removeMemberConfirmation: null
          });
        }
        return RENDER;
      }

      case "OPEN_REMOVE_WORLD_MEMBER_CONFIRMATION": {
        const validation = validateWorldRemoveMemberCommand(
          { worldId: action.worldId, actorId: action.actorId },
          createWorldMemberRemoveContractInputFromState(state, action.worldId)
        );
        if (state.worldEditorDraft) {
          state.worldEditorDraft = Object.freeze({
            ...state.worldEditorDraft,
            noticeMessage: validation.error,
            removeMemberConfirmation: validation.valid
              ? Object.freeze({
                  actorId: action.actorId,
                  displayName: action.displayName,
                  warning: validation.warning
                })
              : null
          });
        }
        return RENDER;
      }

      case "CANCEL_REMOVE_WORLD_MEMBER":
        if (state.worldEditorDraft) {
          state.worldEditorDraft = Object.freeze({
            ...state.worldEditorDraft,
            noticeMessage: null,
            removeMemberConfirmation: null
          });
        }
        return RENDER;

      case "CONFIRM_REMOVE_WORLD_MEMBER": {
        const validation = validateWorldRemoveMemberCommand(
          { worldId: action.worldId, actorId: action.actorId },
          createWorldMemberRemoveContractInputFromState(state, action.worldId)
        );
        if (state.worldEditorDraft) {
          state.worldEditorDraft = Object.freeze({
            ...state.worldEditorDraft,
            noticeMessage: validation.error ?? "删除暂未开放",
            removeMemberConfirmation: validation.valid ? state.worldEditorDraft.removeMemberConfirmation : null
          });
        }
        return RENDER;
      }

      case "CANCEL_WORLD_EDITOR":
        state.activeView = "CHAT_LIST";
        state.selectedWorldIdForEditing = null;
        state.worldEditorDraft = null;
        state.contactDetailDraft = null;
        state.activeChatId = null;
        state.selectedContactActorId = null;
        closeOverlay(state);
        state.settingsOpen = false;
        return RENDER;

      case "OPEN_CREATE_GROUP_DRAFT":
        state.createGroupDraft = createEmptyGroupDraft();
        state.activeView = "CREATE_GROUP_DRAFT";
        state.activeChatId = null;
        state.selectedContactActorId = null;
        state.selectedChatIdForSettings = null;
        state.selectedWorldIdForEditing = null;
        state.createWorldDraft = null;
        state.chatSettingsDraft = null;
        state.worldEditorDraft = null;
        state.contactDetailDraft = null;
        closeOverlay(state);
        state.settingsOpen = false;
        return RENDER;

      case "UPDATE_CREATE_GROUP_DRAFT":
        state.createGroupDraft = Object.freeze({
          ...(state.createGroupDraft ?? createEmptyGroupDraft()),
          groupName: action.value,
          noticeMessage: null
        });
        return RENDER;

      case "TOGGLE_CREATE_GROUP_MEMBER": {
        const draft = state.createGroupDraft ?? createEmptyGroupDraft();
        const selectedWorldContactIds = draft.selectedWorldContactIds.includes(action.worldContactId)
          ? draft.selectedWorldContactIds.filter((id) => id !== action.worldContactId)
          : [...draft.selectedWorldContactIds, action.worldContactId];
        state.createGroupDraft = Object.freeze({
          ...draft,
          selectedWorldContactIds: Object.freeze(selectedWorldContactIds),
          validationError: selectedWorldContactIds.length > 0 ? null : draft.validationError,
          fieldErrors: Object.freeze({
            selectedMembers: selectedWorldContactIds.length > 0 ? null : draft.fieldErrors.selectedMembers
          }),
          noticeMessage: null
        });
        return RENDER;
      }

      case "CONFIRM_CREATE_GROUP":
        state.createGroupDraft = validateCreateGroupDraft(state.createGroupDraft ?? createEmptyGroupDraft());
        return RENDER;

      case "CANCEL_CREATE_GROUP":
        state.createGroupDraft = null;
        state.activeView = "CHAT_LIST";
        state.activeChatId = null;
        state.selectedContactActorId = null;
        state.selectedChatIdForSettings = null;
        state.selectedWorldIdForEditing = null;
        state.chatSettingsDraft = null;
        state.worldEditorDraft = null;
        state.contactDetailDraft = null;
        closeOverlay(state);
        state.settingsOpen = false;
        return RENDER;

      case "OPEN_CREATE_WORLD_DRAFT":
        state.createGroupDraft = null;
        state.createWorldDraft = createEmptyWorldDraft();
        state.activeView = "CREATE_WORLD_DRAFT";
        state.activeChatId = null;
        state.selectedContactActorId = null;
        state.selectedChatIdForSettings = null;
        state.selectedWorldIdForEditing = null;
        state.chatSettingsDraft = null;
        state.worldEditorDraft = null;
        state.contactDetailDraft = null;
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
        state.selectedWorldIdForEditing = null;
        state.worldEditorDraft = null;
        state.contactDetailDraft = null;
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
        state.createGroupDraft = null;
        state.activeView = "CHAT_LIST";
        state.activeChatId = null;
        state.selectedContactActorId = null;
        state.selectedWorldIdForEditing = null;
        state.worldEditorDraft = null;
        state.contactDetailDraft = null;
        closeOverlay(state);
        state.settingsOpen = false;
        return RENDER;

      case "COMPLETE_WORLD_CREATION_TRANSITION":
        state.worldCreationTransition = null;
        state.activeView = "CHAT_LIST";
        state.activeChatId = null;
        state.selectedContactActorId = null;
        state.selectedWorldIdForEditing = null;
        state.worldEditorDraft = null;
        state.contactDetailDraft = null;
        closeOverlay(state);
        state.settingsOpen = false;
        return RENDER;

      case "CREATE_AI_FRIEND":
      case "CHAT_OPEN_GROUP_MEMBERS":
      case "CHAT_OPEN_SETTINGS":
      case "CHAT_OPEN_BACKGROUND_SETTINGS":
        return disabled(state, action.type);
    }
  };

  return Object.freeze({
    execute,
    resolveView,
    currentOverlay: (state) => state.overlay
  });
}

function worldEditorTextFromWorldView(worldView: Readonly<Record<string, unknown>>): string {
  return typeof worldView.text === "string" ? worldView.text : JSON.stringify(worldView);
}

function createWorldEditorUserRoleDraft(worldView: Readonly<Record<string, unknown>>): WorldEditorUserRoleDraft {
  const userRoleMetadata = worldView.worldEditorUserRole;
  if (userRoleMetadata && typeof userRoleMetadata === "object" && !Array.isArray(userRoleMetadata)) {
    return Object.freeze({
      roleName: stringRecordValue(userRoleMetadata, "roleName"),
      personaNotes: stringRecordValue(userRoleMetadata, "personaNotes")
    });
  }
  const roleDraft = worldEditorRoleMetadata(worldView);
  const userRole = roleDraft.userRole;
  return Object.freeze({
    roleName: stringRecordValue(userRole, "roleName"),
    personaNotes: stringRecordValue(userRole, "personaNotes")
  });
}

function createWorldEditorMemberRoleDrafts(
  state: SemanticMobileState,
  worldId: WorldId,
  worldView: Readonly<Record<string, unknown>>
): readonly WorldEditorMemberRoleDraft[] {
  const selectedWorld = state.view.availableWorlds.find((world) => world.worldId === worldId);
  const existingRoles = new Map(
    (selectedWorld?.memberRoles ?? worldEditorRoleMetadata(worldView).memberRoles).map((role) => [role.worldContactId, role])
  );
  return Object.freeze((selectedWorld?.memberActorIds ?? []).map((actorId) => {
    const existing = existingRoles.get(actorId);
    return Object.freeze({
      worldContactId: actorId,
      worldRoleName: existing?.worldRoleName ?? "",
      worldPersonaNotes: existing?.worldPersonaNotes ?? ""
    });
  }));
}

function updateWorldEditorMemberRoleDraft(
  memberRoles: readonly WorldEditorMemberRoleDraft[],
  worldContactId: string,
  field: "worldRoleName" | "worldPersonaNotes",
  value: string
): readonly WorldEditorMemberRoleDraft[] {
  return Object.freeze(memberRoles.map((role) =>
    role.worldContactId === worldContactId
      ? Object.freeze({ ...role, [field]: value })
      : role
  ));
}

function worldEditorRoleMetadata(worldView: Readonly<Record<string, unknown>>): Readonly<{
  readonly userRole: Readonly<Record<string, unknown>>;
  readonly memberRoles: readonly WorldEditorMemberRoleDraft[];
}> {
  const candidate = worldView.worldEditorRoleDraft;
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return Object.freeze({
      userRole: Object.freeze({}),
      memberRoles: Object.freeze([])
    });
  }
  const record = candidate as Readonly<Record<string, unknown>>;
  const memberRoles = Array.isArray(record.memberRoles)
    ? record.memberRoles.flatMap((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          return [];
        }
        const role = item as Readonly<Record<string, unknown>>;
        const worldContactId = stringRecordValue(role, "worldContactId");
        return worldContactId
          ? [Object.freeze({
              worldContactId,
              worldRoleName: stringRecordValue(role, "worldRoleName"),
              worldPersonaNotes: stringRecordValue(role, "worldPersonaNotes")
            })]
          : [];
      })
    : [];
  return Object.freeze({
    userRole: record.userRole && typeof record.userRole === "object" && !Array.isArray(record.userRole)
      ? record.userRole as Readonly<Record<string, unknown>>
      : Object.freeze({}),
    memberRoles: Object.freeze(memberRoles)
  });
}

function stringRecordValue(record: unknown, key: string): string {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return "";
  }
  const value = (record as Readonly<Record<string, unknown>>)[key];
  return typeof value === "string" ? value : "";
}

function createContactDetailDraft(state: SemanticMobileState, worldContactId: string): ContactDetailDraft {
  return Object.freeze({
    worldId: state.currentWorldId,
    worldContactId,
    remark: "",
    perceivedPersonaNotes: defaultPerceivedPersonaNotes(state, worldContactId),
    answerMode: "conversational",
    chatTone: "",
    emojiPermission: true,
    noticeMessage: null,
    deleteFriendConfirmation: null
  });
}

function defaultPerceivedPersonaNotes(state: SemanticMobileState, worldContactId: string): string {
  const contact = state.view.product.snapshot.contacts.find((item) => item.actorId === worldContactId);
  if (state.view.product.snapshot.worldMeta.type === "reality") {
    return "";
  }
  const roleNote = [contact?.worldRoleName, contact?.worldPersonaNotes].filter(Boolean).join(" / ");
  return roleNote || "";
}

export function contactDetailPreferencePatchFromDraft(draft: ContactDetailDraft) {
  return {
    worldId: draft.worldId,
    worldContactId: draft.worldContactId,
    remark: draft.remark,
    perceivedPersonaNotes: draft.perceivedPersonaNotes,
    answerMode: draft.answerMode,
    chatTone: draft.chatTone,
    emojiPermission: draft.emojiPermission
  };
}

export function createContactDetailContractInput(state: SemanticMobileState) {
  return {
    worldId: state.currentWorldId,
    contactActorIds: state.view.product.snapshot.contacts
      .filter((contact) => contact.kind === "assistant" && contact.actorId !== state.view.product.snapshot.worldMeta.assistantActorId)
      .map((contact) => contact.actorId)
  };
}

function createLinkedAIDisconnectContractInputFromState(state: SemanticMobileState) {
  return {
    globalAILinks: (state.view.linkedAIModels ?? []).map((model) => ({
      linkId: model.globalAILinkId,
      status: "connected" as const
    }))
  };
}

function createWorldMemberContractInputFromState(state: SemanticMobileState, worldId: WorldId) {
  const selectedWorld = state.view.availableWorlds.find((world) => world.worldId === worldId);
  const linkedModels = state.view.linkedAIModels ?? [];
  return {
    world: {
      type: selectedWorld?.type === "custom" ? "custom" as const : "reality" as const
    },
    contacts: (selectedWorld?.memberActorIds ?? []).map((actorId) => ({ baseModelId: actorId })) as readonly Pick<DomainWorldContact, "baseModelId">[],
    globalAIModels: linkedModels.map((model) => ({
      modelId: model.globalAIModelId,
      displayName: model.displayName
    })) as readonly GlobalAIModel[],
    globalAILinks: linkedModels.map((model, index) => ({
      linkId: model.globalAILinkId,
      modelId: model.globalAIModelId,
      connectedAt: index + 1,
      status: "connected" as const
    })) as readonly GlobalAILink[]
  };
}

function createWorldMemberRemoveContractInputFromState(state: SemanticMobileState, worldId: WorldId) {
  const selectedWorld = state.view.availableWorlds.find((world) => world.worldId === worldId);
  const memberActorIds = selectedWorld?.memberActorIds ?? [];
  return {
    world: {
      type: selectedWorld?.type === "custom" ? "custom" as const : "reality" as const
    },
    contacts: memberActorIds.map((actorId) => ({
      actorId,
      kind: "assistant" as const
    }))
  };
}

export function resolveView(activeView: string): ViewRouteResolution {
  if (
    activeView === "CHAT_LIST" ||
    activeView === "CHAT_VIEW" ||
    activeView === "CONTACTS" ||
    activeView === "CONTACT_DETAIL" ||
    activeView === "ME" ||
    activeView === "CHAT_SETTINGS" ||
    activeView === "CREATE_GROUP_DRAFT" ||
    activeView === "CREATE_WORLD_DRAFT" ||
    activeView === "CREATE_WORLD_DETAIL_EDIT" ||
    activeView === "WORLD_EDITOR"
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
  if (
    activeView === "CREATE_GROUP_DRAFT" ||
    activeView === "CHAT_SETTINGS" ||
    activeView === "CREATE_WORLD_DRAFT" ||
    activeView === "CREATE_WORLD_DETAIL_EDIT" ||
    activeView === "WORLD_EDITOR"
  ) {
    return "chats";
  }
  return "chats";
}
