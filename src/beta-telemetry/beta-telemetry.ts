import type {
  BetaTelemetry,
  BetaTelemetryEvent,
  BetaTelemetryEventType,
  BetaTelemetryOptions,
  BetaTelemetrySummary
} from "./types.js";

export const BetaTelemetryLayer = Object.freeze({
  create: createBetaTelemetry
});

export function createBetaTelemetry(options: BetaTelemetryOptions = Object.freeze({})): BetaTelemetry {
  const now = options.now ?? Date.now;
  const sessionStartedAt = now();
  const events: BetaTelemetryEvent[] = [];
  let firstMessageAt: number | null = null;
  let firstSuccessfulInteractionAt: number | null = null;
  let worldSwitchCount = 0;
  let userMessageCount = 0;
  let aiMessageCount = 0;
  let dropOffPoint: BetaTelemetryEventType | null = null;

  const record = (
    type: BetaTelemetryEventType,
    detail?: Readonly<Record<string, unknown>>
  ): BetaTelemetryEvent => {
    const timestamp = now();
    const event = Object.freeze({
      type,
      timestamp,
      ...(detail === undefined ? {} : { detail: Object.freeze({ ...detail }) })
    }) as BetaTelemetryEvent;

    events.push(event);
    dropOffPoint = type;

    if (type === "message.sent") {
      userMessageCount += 1;
      if (firstMessageAt === null) {
        firstMessageAt = timestamp;
        events.push(Object.freeze({
          type: "message.first",
          timestamp,
          ...(detail === undefined ? {} : { detail: Object.freeze({ ...detail }) })
        }) as BetaTelemetryEvent);
      }
    }

    if (type === "message.ai-replied") {
      aiMessageCount += 1;
      if (firstSuccessfulInteractionAt === null) {
        firstSuccessfulInteractionAt = timestamp;
        events.push(Object.freeze({
          type: "interaction.first-success",
          timestamp,
          ...(detail === undefined ? {} : { detail: Object.freeze({ ...detail }) })
        }) as BetaTelemetryEvent);
      }
    }

    if (type === "chat.switched") {
      worldSwitchCount += 1;
    }

    return event;
  };

  record("session.started");

  return Object.freeze({
    record,
    summary: () => summarize(
      now(),
      sessionStartedAt,
      firstMessageAt,
      firstSuccessfulInteractionAt,
      worldSwitchCount,
      userMessageCount,
      aiMessageCount,
      dropOffPoint,
      events
    ),
    events: () => Object.freeze([...events])
  });
}

function summarize(
  currentTime: number,
  sessionStartedAt: number,
  firstMessageAt: number | null,
  firstSuccessfulInteractionAt: number | null,
  worldSwitchCount: number,
  userMessageCount: number,
  aiMessageCount: number,
  dropOffPoint: BetaTelemetryEventType | null,
  events: readonly BetaTelemetryEvent[]
): BetaTelemetrySummary {
  return Object.freeze({
    sessionStartedAt,
    sessionLengthMs: Math.max(0, currentTime - sessionStartedAt),
    firstMessageAt,
    firstSuccessfulInteractionAt,
    worldSwitchCount,
    userMessageCount,
    aiMessageCount,
    aiInteractionDepth: userMessageCount + aiMessageCount,
    aiEngagementRate: userMessageCount === 0 ? 0 : aiMessageCount / userMessageCount,
    dropOffPoint,
    errors: Object.freeze(events.filter((event) => event.type.startsWith("error."))),
    events: Object.freeze([...events])
  });
}
