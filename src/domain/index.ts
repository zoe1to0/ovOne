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
