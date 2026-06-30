import type { ChatId } from "../chat-kernel/index.js";
import type { ContactDetailPreferencePatch, DeleteFriendCommand, WorldAddMemberCommand, WorldEditorPatch, WorldRemoveMemberCommand, WorldRoleEditorPatch } from "../domain/index.js";
import type { WorldId, WorldSnapshot } from "../world-domain/index.js";

export type MinimalProductScreen = "reality" | "worlds" | "chat" | "world";

export type WorldListView = Readonly<{
  readonly activeWorld: Readonly<{
    readonly worldId: WorldId;
    readonly title: string;
    readonly type: string;
    readonly lifecycle: string;
    readonly memoryNamespace: string;
  }>;
}>;

export type ChatView = Readonly<{
  readonly chatId: ChatId | null;
  readonly title: string;
  readonly messages: readonly Readonly<{
    readonly messageId: string;
    readonly authorName: string;
    readonly text: string;
    readonly outputMode: "QA" | "Dialogue";
    readonly presentation: MessagePresentationView;
    readonly createdAt: number;
  }>[];
}>;

export type MessagePresentationView = Readonly<{
  readonly mode: "QA" | "Dialogue";
  readonly segments: readonly Readonly<{
    readonly text: string;
    readonly pauseAfterMs: number;
  }>[];
  readonly rhythm: "single-block" | "conversational";
}>;

export type WorldView = Readonly<{
  readonly worldMeta: WorldSnapshot["worldMeta"];
  readonly contacts: WorldSnapshot["contacts"];
  readonly groups: WorldSnapshot["groups"];
  readonly memorySummary: WorldSnapshot["memorySummary"];
  readonly runtimeState: WorldSnapshot["runtimeState"];
}>;

export type InputPanelView = Readonly<{
  readonly targetWorldId: WorldId;
  readonly targetChatId: ChatId | null;
  readonly ownerActorId: string;
  readonly placeholder: string;
  readonly canSubmit: boolean;
}>;

export type AiPresenceState = "ACTIVE" | "IDLE" | "REACTIVE";

export type ExperienceLayerView = Readonly<{
  readonly worldEntrance: Readonly<{
    readonly state: "entering" | "settled";
    readonly visible: boolean;
    readonly text: string;
  }>;
  readonly contextualPresence: Readonly<{
    readonly situation: string;
    readonly narrativeState: string;
  }>;
  readonly firstInteractionHint: Readonly<{
    readonly kind: "unread-message" | "ai-prompt" | "world-status-event";
    readonly text: string;
  }>;
  readonly aiPresence: Readonly<{
    readonly state: AiPresenceState;
    readonly text: string;
  }>;
}>;

export type MinimalProductView = Readonly<{
  readonly snapshot: WorldSnapshot;
  readonly worldList: WorldListView;
  readonly chat: ChatView;
  readonly world: WorldView;
  readonly inputPanel: InputPanelView;
  readonly experience: ExperienceLayerView;
}>;

export type MinimalProductShellView = Readonly<{
  readonly screen: MinimalProductScreen;
  readonly activeWorldId: WorldId;
  readonly availableWorlds: readonly Readonly<{
    readonly worldId: WorldId;
    readonly title: string;
    readonly type: string;
    readonly worldView?: Readonly<Record<string, unknown>>;
    readonly memberActorIds?: readonly string[];
    readonly memberRoles?: readonly Readonly<{
      readonly worldContactId: string;
      readonly worldRoleName: string;
      readonly worldPersonaNotes: string;
    }>[];
  }>[];
  readonly linkedAIModels?: readonly Readonly<{
    readonly globalAILinkId: string;
    readonly globalAIModelId: string;
    readonly actorId: string;
    readonly displayName: string;
  }>[];
  readonly product: MinimalProductView;
}>;

export type CreateWorldDraftInput = Readonly<{
  readonly worldName: string;
  readonly worldviewSourceType: string;
  readonly worldviewText: string;
  readonly selectedAIModelIds: readonly string[];
  readonly nextMode: "random-role" | "detailed-edit" | null;
  readonly detailRoleMode?: "random-role" | "fixed-role" | "empty-role";
  readonly randomRoleSlots?: readonly Readonly<{
    readonly id: string;
    readonly roleName: string;
    readonly personaNotes: string;
  }>[];
  readonly selectedUserRoleSlotId?: string | null;
  readonly fixedRoles?: readonly Readonly<{
    readonly actorId: string;
    readonly roleName: string;
    readonly notes: string;
  }>[];
}>;

export type MinimalProductShellRuntime = Readonly<{
  readonly openScreen: (screen: MinimalProductScreen) => MinimalProductShellView;
  readonly switchWorld: (worldId: WorldId) => MinimalProductShellView;
  readonly createWorldFromDraft: (draft: CreateWorldDraftInput) => MinimalProductShellView;
  readonly saveWorldMetadata: (patch: WorldEditorPatch) => MinimalProductShellView;
  readonly saveWorldRoleMetadata: (patch: WorldRoleEditorPatch) => MinimalProductShellView;
  readonly saveContactDetailPreferences: (patch: ContactDetailPreferencePatch) => MinimalProductShellView;
  readonly deleteFriend: (command: DeleteFriendCommand) => MinimalProductShellView;
  readonly addWorldMember: (command: WorldAddMemberCommand) => MinimalProductShellView;
  readonly removeWorldMember: (command: WorldRemoveMemberCommand) => MinimalProductShellView;
  readonly sendMessage: (text: string) => MinimalProductShellView;
  readonly snapshot: () => WorldSnapshot;
  readonly view: () => MinimalProductShellView;
}>;
