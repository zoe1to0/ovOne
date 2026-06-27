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
