import type { PersistentProductRuntime, PersistenceStorage } from "../persistence/index.js";
import type { MinimalProductShellRuntime, MinimalProductShellView } from "../minimal-ui-shell/index.js";
import type { BetaTelemetry } from "../beta-telemetry/index.js";

export type OnboardingState = Readonly<{
  readonly firstRun: boolean;
  readonly sampleContactActorId: string;
  readonly sampleContactName: string;
}>;

export type OnboardedProductShellView = MinimalProductShellView & Readonly<{
  readonly onboarding: OnboardingState;
}>;

export type OnboardedProductShellRuntime = Omit<MinimalProductShellRuntime, "openScreen" | "switchWorld" | "createWorldFromDraft" | "saveWorldMetadata" | "saveWorldRoleMetadata" | "saveContactDetailPreferences" | "saveChatAppearanceSettings" | "saveGroupRules" | "addGroupMember" | "removeGroupMember" | "deleteFriend" | "sendMessage" | "view"> & Readonly<{
  readonly openScreen: MinimalProductShellRuntime["openScreen"];
  readonly switchWorld: MinimalProductShellRuntime["switchWorld"];
  readonly createWorldFromDraft: MinimalProductShellRuntime["createWorldFromDraft"];
  readonly saveWorldMetadata: MinimalProductShellRuntime["saveWorldMetadata"];
  readonly saveWorldRoleMetadata: MinimalProductShellRuntime["saveWorldRoleMetadata"];
  readonly saveContactDetailPreferences: MinimalProductShellRuntime["saveContactDetailPreferences"];
  readonly saveChatAppearanceSettings: MinimalProductShellRuntime["saveChatAppearanceSettings"];
  readonly saveGroupRules: MinimalProductShellRuntime["saveGroupRules"];
  readonly addGroupMember: MinimalProductShellRuntime["addGroupMember"];
  readonly removeGroupMember: MinimalProductShellRuntime["removeGroupMember"];
  readonly deleteFriend: MinimalProductShellRuntime["deleteFriend"];
  readonly addWorldMember: MinimalProductShellRuntime["addWorldMember"];
  readonly removeWorldMember: MinimalProductShellRuntime["removeWorldMember"];
  readonly sendMessage: MinimalProductShellRuntime["sendMessage"];
  readonly view: () => OnboardedProductShellView;
  readonly onboarding: () => OnboardingState;
  readonly telemetry: BetaTelemetry;
}>;

export type OnboardedProductRuntime = Omit<PersistentProductRuntime, "shell"> & Readonly<{
  readonly shell: OnboardedProductShellRuntime;
  readonly telemetry: BetaTelemetry;
}>;

export type OnboardingOptions = Readonly<{
  readonly storage?: PersistenceStorage;
  readonly telemetry?: BetaTelemetry;
}>;
