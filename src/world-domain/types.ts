declare const identityBrand: unique symbol;
declare const worldBrand: unique symbol;

export type WorldId = string & { readonly [worldBrand]: "WorldId" };
export type ActorKind = "human" | "assistant" | "system";
export type OutputMode = "QA" | "Dialogue";
export type WorldLifecycleState = "active" | "paused" | "archived" | "restored";

export type Identity = Readonly<{
  readonly [identityBrand]: "Identity";
  readonly worldId: WorldId;
  readonly actorId: string;
  readonly displayName: string;
  readonly kind: ActorKind;
  readonly outputMode: OutputMode;
}>;

export type ActorDefinition = Readonly<{
  readonly actorId: string;
  readonly displayName: string;
  readonly kind: ActorKind;
}>;

export type RealityDefinition = Readonly<{
  readonly ownerActorId: string;
  readonly assistantActorId: string;
}>;

export type CustomWorldDefinition = Readonly<{
  readonly title: string;
  readonly ownerActorId: string;
  readonly assistantActorId: string;
  readonly actors: readonly ActorDefinition[];
}>;

export type WorldDefinition = Readonly<{
  readonly id: WorldId;
  readonly title: string;
  readonly type: "reality" | "custom";
  readonly ownerActorId: string;
  readonly assistantActorId: string;
  readonly actors: ReadonlyMap<string, ActorDefinition>;
  readonly groups: readonly WorldGroup[];
  readonly worldView: Readonly<Record<string, unknown>>;
  readonly settings: Readonly<Record<string, unknown>>;
  readonly personaOverlays: ReadonlyMap<string, PersonaOverlay>;
}>;

export type MemoryScope = Readonly<{
  readonly worldId: WorldId;
  readonly namespace: string;
}>;

export type WorldIdentity = Readonly<{
  readonly id: WorldId;
  readonly title: string;
  readonly type: "reality" | "custom";
  readonly ownerActorId: string;
  readonly assistantActorId: string;
  readonly lifecycle: WorldLifecycleState;
}>;

export type WorldContact = Identity & Readonly<{
  readonly worldRoleName?: string;
  readonly worldPersonaNotes?: string;
  readonly remark?: string;
  readonly perceivedPersonaNotes?: string;
  readonly answerMode?: "conversational" | "qa";
  readonly chatTone?: string;
  readonly emojiPermission?: boolean;
}>;

export type WorldGroup = Readonly<{
  readonly id: string;
  readonly title: string;
  readonly actorIds: readonly string[];
}>;

export type WorldChatMessage = Readonly<{
  readonly id: string;
  readonly authorActorId: string;
  readonly text: string;
  readonly createdAt: number;
}>;

export type ChatAppearanceSettings = Readonly<{
  readonly backgroundImageRef: string;
  readonly backgroundColor: string;
  readonly myBubbleColor: string;
  readonly otherBubbleColor: string;
}>;

export type GroupRulesSettings = Readonly<{
  readonly rulesText: string;
}>;

export type GroupFileRecord = Readonly<{
  readonly worldId: WorldId;
  readonly groupChatId: string;
  readonly fileName: string;
  readonly fileType: string;
  readonly fileSize: number;
  readonly fileRef: string;
  readonly uploadedAt: number;
  readonly uploadedBy: "user";
}>;

export type WorldChatSession = Readonly<{
  readonly id: string;
  readonly worldId: WorldId;
  readonly title: string;
  readonly messages: readonly WorldChatMessage[];
  readonly appearance?: ChatAppearanceSettings;
  readonly groupRules?: GroupRulesSettings;
  readonly groupFiles?: readonly GroupFileRecord[];
}>;

export type WorldChatState = Readonly<{
  readonly activeChatId: string | null;
  readonly chats: ReadonlyMap<string, WorldChatSession>;
}>;

export interface WorldState {
  readonly world: WorldIdentity;
  readonly contacts: readonly WorldContact[];
  readonly groups: readonly WorldGroup[];
  readonly memoryScope: MemoryScope;
  readonly metadata: WorldMetadata;
  readonly chat: WorldChatState;
}

export type WorldSnapshot = Readonly<{
  readonly worldMeta: WorldIdentity;
  readonly contacts: readonly WorldContact[];
  readonly groups: readonly WorldGroup[];
  readonly chatState: WorldChatState;
  readonly memorySummary: MemorySummary;
  readonly runtimeState: RuntimeState;
}>;

export type MemorySummary = Readonly<{
  readonly scope: MemoryScope;
  readonly namespace: string;
}>;

export type RuntimeState = Readonly<{
  readonly metadata: WorldMetadata;
  readonly activeChatId: string | null;
}>;

export type WorldMetadata = Readonly<{
  readonly title: string;
  readonly type: "reality" | "custom";
  readonly worldView: Readonly<Record<string, unknown>>;
  readonly settings: Readonly<Record<string, unknown>>;
  readonly personaOverlays: Readonly<Record<string, PersonaOverlay>>;
}>;

export type PersonaOverlay = Readonly<{
  readonly personality?: Readonly<Record<string, unknown>>;
  readonly tone?: Readonly<Record<string, unknown>>;
  readonly relationshipPerception?: Readonly<Record<string, unknown>>;
}>;

export type StructuralPatchEvent =
  | Readonly<{
      readonly type: "world.view.adjusted";
      readonly worldId: WorldId;
      readonly timestamp?: number;
      readonly patch: Readonly<Record<string, unknown>>;
    }>
  | Readonly<{
      readonly type: "ai.contact.added";
      readonly worldId: WorldId;
      readonly timestamp?: number;
      readonly contact: ActorDefinition;
    }>
  | Readonly<{
      readonly type: "relationship.graph.modified";
      readonly worldId: WorldId;
      readonly timestamp?: number;
      readonly groups: readonly WorldGroup[];
    }>
  | Readonly<{
      readonly type: "world.settings.adjusted";
      readonly worldId: WorldId;
      readonly timestamp?: number;
      readonly settings: Readonly<Record<string, unknown>>;
    }>;

export type PersonaOverlayEvent = Readonly<{
  readonly type: "contact.persona.overlayed";
  readonly worldId: WorldId;
  readonly actorId: string;
  readonly timestamp?: number;
  readonly overlay: PersonaOverlay;
}>;
