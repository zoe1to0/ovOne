import type {
  OutputMode,
  WorldChatMessage,
  WorldGroup,
  WorldId,
  WorldLifecycleState
} from "../world-domain/index.js";

export type GlobalAIModel = Readonly<{
  readonly modelId: string;
  readonly displayName: string;
  readonly provider?: string;
}>;

export type GlobalAILink = Readonly<{
  readonly linkId: string;
  readonly modelId: GlobalAIModel["modelId"];
  readonly connectedAt: number;
  readonly status: "connected" | "disconnected";
}>;

export type World = Readonly<{
  readonly worldId: WorldId;
  readonly title: string;
  readonly type: "reality" | "custom";
  readonly lifecycle: WorldLifecycleState;
  readonly ownerActorId: string;
  readonly assistantActorId: string;
  readonly worldView: Readonly<Record<string, unknown>>;
  readonly settings: Readonly<Record<string, unknown>>;
}>;

export type WorldContact = Readonly<{
  readonly worldId: WorldId;
  readonly contactId: string;
  readonly actorId: string;
  readonly baseModelId: GlobalAIModel["modelId"];
  readonly displayName: string;
  readonly kind: "assistant" | "human" | "system";
  readonly outputMode: OutputMode;
  readonly persona: Readonly<Record<string, unknown>>;
}>;

export type WorldChat = Readonly<{
  readonly worldId: WorldId;
  readonly chatId: string;
  readonly title: string;
  readonly participantContactIds: readonly string[];
  readonly messages: readonly WorldChatMessage[];
}>;

export type WorldMemoryScope = Readonly<{
  readonly worldId: WorldId;
  readonly namespace: string;
  readonly contactMemoryKeys: readonly string[];
  readonly chatMemoryKeys: readonly string[];
}>;

export type WorldScope = Readonly<{
  readonly world: World;
  readonly contacts: readonly WorldContact[];
  readonly chats: readonly WorldChat[];
  readonly groups: readonly WorldGroup[];
  readonly memory: WorldMemoryScope;
}>;

export type WorldScopedSnapshot = Readonly<{
  readonly currentWorldId: WorldId;
  readonly globalAIModels: readonly GlobalAIModel[];
  readonly globalAILinks: readonly GlobalAILink[];
  readonly worlds: ReadonlyMap<WorldId, WorldScope>;
}>;
