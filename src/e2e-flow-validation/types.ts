export type EndToEndLayer = "UI" | "Kernel" | "World" | "Snapshot";

export type EndToEndFlowName =
  | "WorldCreationChatSnapshotFlow"
  | "WorldSwitchingConsistencyFlow"
  | "ContactModeBehaviorFlow"
  | "InputPanelKernelSnapshotFlow";

export type EndToEndFailure = Readonly<{
  readonly flow: EndToEndFlowName;
  readonly layer: EndToEndLayer;
  readonly firstDivergenceEvent: string;
  readonly diffTrace: string;
  readonly expected?: string;
  readonly actual?: string;
}>;

export type EndToEndFlowResult = Readonly<{
  readonly flow: EndToEndFlowName;
  readonly passed: boolean;
  readonly failures: readonly EndToEndFailure[];
}>;

export type EndToEndFlowValidationReport = Readonly<{
  readonly passed: boolean;
  readonly results: readonly EndToEndFlowResult[];
}>;

export type EndToEndFlowValidationOptions = Readonly<{
  readonly print?: boolean;
  readonly logger?: (line: string) => void;
}>;
