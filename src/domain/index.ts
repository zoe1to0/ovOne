export type {
  GlobalAIModel,
  GlobalAILink,
  World,
  WorldChat,
  WorldContact,
  WorldMemoryScope,
  WorldScopedSnapshot,
  WorldScope
} from "./world-model.js";

export {
  resolveCurrentWorld,
  resolveWorldChats,
  resolveWorldContacts,
  resolveWorldScope
} from "./world-scope-resolver.js";
export type { ResolvableWorldSnapshot } from "./world-scope-resolver.js";
export {
  isBootstrapItemExecutable,
  isBootstrapItemFinal,
  markBootstrapItemStubGenerated,
  planWorldBootstrap
} from "./world-bootstrap-planner.js";
export type {
  BootstrapExecutionStatus,
  InitialGroupPlan,
  InitialPrivateMessagePlan,
  WorldBootstrapPlan,
  WorldBootstrapPlanInput,
  WorldBootstrapRoleMode
} from "./world-bootstrap-planner.js";
export {
  CHAT_SETTINGS_BACKGROUND_UPLOAD_UNAVAILABLE_MESSAGE,
  CHAT_SETTINGS_SAVE_SUCCESS_MESSAGE,
  CHAT_SETTINGS_SAVE_UNAVAILABLE_MESSAGE,
  canEditChatSettings,
  getChatSettingsWarnings,
  validateChatSettingsPatch
} from "./chat-settings-contract.js";
export type {
  ChatSettingsForbiddenField,
  ChatSettingsPatch,
  ChatSettingsPatchValidation,
  ChatSettingsValidationInput
} from "./chat-settings-contract.js";
export {
  GROUP_RULES_SAVE_SUCCESS_MESSAGE,
  canEditGroupRules,
  getGroupRulesWarnings,
  validateGroupRulesPatch
} from "./group-rules-contract.js";
export type {
  GroupRulesForbiddenField,
  GroupRulesPatch,
  GroupRulesPatchValidation,
  GroupRulesValidationInput
} from "./group-rules-contract.js";
export {
  CONTACT_DETAIL_DELETE_FRIEND_WARNING_MESSAGE,
  CONTACT_DETAIL_SAVE_SUCCESS_MESSAGE,
  canDeleteFriendInCurrentWorld,
  getDeleteFriendWarning,
  validateContactDetailPreferencePatch,
  validateDeleteFriendCommand
} from "./contact-detail-contract.js";
export type {
  ContactDetailAnswerMode,
  ContactDetailForbiddenField,
  ContactDetailPreferencePatch,
  ContactDetailPreferenceValidation,
  DeleteFriendCommand,
  DeleteFriendValidation
} from "./contact-detail-contract.js";
export {
  WORLD_EDITOR_EMPTY_WORLDVIEW_WARNING,
  WORLD_EDITOR_LARGE_WORLDVIEW_CHANGE_WARNING,
  WORLD_EDITOR_NAME_REQUIRED_MESSAGE,
  WORLD_EDITOR_REALITY_LOCKED_MESSAGE,
  WORLD_EDITOR_SAVE_SUCCESS_MESSAGE,
  WORLD_EDITOR_SAVE_UNAVAILABLE_MESSAGE,
  canEditWorld,
  getForbiddenWorldEditorPatchFields,
  getWorldEditorWarnings,
  validateWorldEditorPatch
} from "./world-editor-contract.js";
export type {
  WorldEditorForbiddenPatchField,
  WorldEditorPatch,
  WorldEditorPatchValidation
} from "./world-editor-contract.js";
export {
  WORLD_ROLE_EDITOR_REALITY_LOCKED_MESSAGE,
  canEditWorldRoles,
  getForbiddenWorldRoleEditorFields,
  getWorldRoleEditorWarnings,
  validateWorldRoleEditorPatch
} from "./world-role-editor-contract.js";
export type {
  MemberWorldRolePatch,
  UserWorldRolePatch,
  WorldRoleEditorEditabilityInput,
  WorldRoleEditorForbiddenField,
  WorldRoleEditorPatch,
  WorldRoleEditorValidation
} from "./world-role-editor-contract.js";
export {
  WORLD_MEMBER_ALREADY_EXISTS_MESSAGE,
  WORLD_MEMBER_REALITY_LOCKED_MESSAGE,
  WORLD_MEMBER_UNLINKED_AI_MESSAGE,
  canAddMemberToWorld,
  getForbiddenWorldMemberMutations,
  resolveAddMemberCandidates,
  validateWorldAddMemberCommand
} from "./world-member-contract.js";
export type {
  WorldAddMemberCandidate,
  WorldAddMemberCommand,
  WorldAddMemberValidation,
  WorldMemberAllowedFutureMutation,
  WorldMemberForbiddenMutation
} from "./world-member-contract.js";
export {
  WORLD_MEMBER_REMOVE_NOT_FOUND_MESSAGE,
  WORLD_MEMBER_REMOVE_REALITY_LOCKED_MESSAGE,
  WORLD_MEMBER_REMOVE_WARNING_MESSAGE,
  canRemoveMemberFromWorld,
  getForbiddenWorldMemberRemoveMutations,
  getRemoveMemberWarning,
  validateWorldRemoveMemberCommand
} from "./world-member-remove-contract.js";
export type {
  ValidateWorldRemoveMemberInput,
  WorldMemberRemoveAllowedFutureMutation,
  WorldMemberRemoveForbiddenMutation,
  WorldRemoveMemberCommand,
  WorldRemoveMemberValidation
} from "./world-member-remove-contract.js";
export {
  LINKED_AI_DISCONNECT_UNLINKED_MESSAGE,
  LINKED_AI_DISCONNECT_WARNING_MESSAGE,
  canDisconnectLinkedAI,
  getForbiddenLinkedAIDisconnectMutations,
  getLinkedAIDisconnectWarning,
  validateLinkedAIDisconnectCommand
} from "./linked-ai-disconnect-contract.js";
export type {
  LinkedAIDisconnectCommand,
  LinkedAIDisconnectForbiddenMutation,
  LinkedAIDisconnectValidation,
  ValidateLinkedAIDisconnectInput
} from "./linked-ai-disconnect-contract.js";
export {
  createLinkedAIDisconnectCleanupPlan,
  validateLinkedAIDisconnectCleanupPlan
} from "./linked-ai-disconnect-cleanup-plan.js";
export type {
  LinkedAIDisconnectCleanupPlan,
  LinkedAIDisconnectCleanupPlanStatus,
  LinkedAIDisconnectCleanupPlanValidation,
  LinkedAIDisconnectDeferredAction,
  LinkedAIDisconnectGroupMemberRemovalStatus,
  WorldCleanupPlanItem
} from "./linked-ai-disconnect-cleanup-plan.js";
export {
  LINKED_AI_DISCONNECT_GROUP_CLEANUP_UNSUPPORTED_WARNING,
  canExecuteLinkedAIDisconnect,
  createLinkedAIDisconnectExecutionPlan,
  getLinkedAIDisconnectAllowedFutureMutations,
  getLinkedAIDisconnectExecutionWarnings,
  getLinkedAIDisconnectForbiddenFutureMutations,
  validateLinkedAIDisconnectExecutionCommand,
  validateLinkedAIDisconnectExecutionPlan
} from "./linked-ai-disconnect-execution-contract.js";
export type {
  LinkedAIDisconnectAllowedFutureMutation,
  LinkedAIDisconnectExecutionCommand,
  LinkedAIDisconnectExecutionPlan,
  LinkedAIDisconnectExecutionStatus,
  LinkedAIDisconnectExecutionValidation,
  LinkedAIDisconnectForbiddenFutureMutation,
  LinkedAIDisconnectGlobalLinkAction,
  LinkedAIDisconnectProviderConnectionAction
} from "./linked-ai-disconnect-execution-contract.js";
export {
  LINKED_AI_DISCONNECT_GROUP_HISTORY_NOTE,
  LINKED_AI_DISCONNECT_GROUP_MEMBERSHIP_NOTE,
  LINKED_AI_DISCONNECT_SCOPE_NOTE,
  buildLinkedAIDisconnectPreview
} from "./linked-ai-disconnect-preview.js";
export type {
  LinkedAIDisconnectPreviewViewModel,
  LinkedAIDisconnectPreviewWorld
} from "./linked-ai-disconnect-preview.js";
export {
  LINKED_AI_DISCONNECT_CONFIRMATION_MISMATCH_MESSAGE,
  LINKED_AI_DISCONNECT_CONFIRMATION_REQUIRED_MESSAGE,
  LINKED_AI_DISCONNECT_DRY_RUN_CONFIRMED_MESSAGE,
  LINKED_AI_DISCONNECT_PREVIEW_REQUIRED_MESSAGE,
  guardLinkedAIDisconnectExecution
} from "./linked-ai-disconnect-guarded-executor.js";
export type {
  GuardedLinkedAIDisconnectConfirmationInput,
  GuardedLinkedAIDisconnectInput,
  GuardedLinkedAIDisconnectResult,
  GuardedLinkedAIDisconnectStatus
} from "./linked-ai-disconnect-guarded-executor.js";
export {
  createLinkedAIDisconnectRollbackPlan,
  createLinkedAIDisconnectSnapshot,
  getExplicitNonMutatedResources,
  validateLinkedAIDisconnectSnapshot
} from "./linked-ai-disconnect-execution-snapshot.js";
export type {
  LinkedAIDisconnectAffectedWorldSnapshot,
  LinkedAIDisconnectExecutionSnapshot,
  LinkedAIDisconnectExecutionSnapshotStatus,
  LinkedAIDisconnectExecutionSnapshotValidation,
  LinkedAIDisconnectExplicitNonMutatedResource,
  LinkedAIDisconnectGroupMembershipAction,
  LinkedAIDisconnectGroupMembershipSnapshot,
  LinkedAIDisconnectPreservationRule,
  LinkedAIDisconnectProviderConnectionSnapshotStatus,
  LinkedAIDisconnectRollbackPlan,
  LinkedAIDisconnectRollbackPlanStatus
} from "./linked-ai-disconnect-execution-snapshot.js";
export {
  createLinkedAIDisconnectPreflightPlan,
  validateLinkedAIDisconnectPreflightPlan
} from "./linked-ai-disconnect-preflight.js";
export type {
  LinkedAIDisconnectPreflightOperation,
  LinkedAIDisconnectPreflightOperationStatus,
  LinkedAIDisconnectPreflightOperationType,
  LinkedAIDisconnectPreflightPlan,
  LinkedAIDisconnectPreflightStatus,
  LinkedAIDisconnectPreflightValidation
} from "./linked-ai-disconnect-preflight.js";
export {
  simulateLinkedAIDisconnectExecution,
  validateAtomicExecutionResult
} from "./linked-ai-disconnect-atomic-executor.js";
export type {
  LinkedAIDisconnectAtomicExecutionMode,
  LinkedAIDisconnectAtomicExecutionResult,
  LinkedAIDisconnectAtomicExecutionStatus,
  LinkedAIDisconnectAtomicExecutionValidation,
  LinkedAIDisconnectAtomicRollbackStep,
  LinkedAIDisconnectAtomicSimulatedOperation
} from "./linked-ai-disconnect-atomic-executor.js";
