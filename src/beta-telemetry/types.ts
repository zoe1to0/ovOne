export type BetaTelemetryEventType =
  | "session.started"
  | "message.first"
  | "message.sent"
  | "message.ai-replied"
  | "chat.switched"
  | "interaction.first-success"
  | "error.invalid-event"
  | "error.fallback-triggered"
  | "error.snapshot-recovered"
  | "error.ui-fallback-activated";

export type BetaTelemetryEvent = Readonly<{
  readonly type: BetaTelemetryEventType;
  readonly timestamp: number;
  readonly detail?: Readonly<Record<string, unknown>>;
}>;

export type BetaTelemetrySummary = Readonly<{
  readonly sessionStartedAt: number;
  readonly sessionLengthMs: number;
  readonly firstMessageAt: number | null;
  readonly firstSuccessfulInteractionAt: number | null;
  readonly worldSwitchCount: number;
  readonly userMessageCount: number;
  readonly aiMessageCount: number;
  readonly aiInteractionDepth: number;
  readonly aiEngagementRate: number;
  readonly dropOffPoint: BetaTelemetryEventType | null;
  readonly errors: readonly BetaTelemetryEvent[];
  readonly events: readonly BetaTelemetryEvent[];
}>;

export type BetaTelemetry = Readonly<{
  readonly record: (type: BetaTelemetryEventType, detail?: Readonly<Record<string, unknown>>) => BetaTelemetryEvent;
  readonly summary: () => BetaTelemetrySummary;
  readonly events: () => readonly BetaTelemetryEvent[];
}>;

export type BetaTelemetryOptions = Readonly<{
  readonly now?: () => number;
}>;
