import {
  toChatEventId,
  toMessageId,
  transition
} from "../chat-kernel/index.js";
import type { ChatKernelEvent, ChatId } from "../chat-kernel/index.js";
import { App } from "../app/index.js";
import { queueForWorldState } from "../patch-queue/index.js";
import type { StatePatch } from "../patch-queue/index.js";
import { toWorldId } from "../world-domain/index.js";
import type { WorldId, WorldSnapshot, WorldState } from "../world-domain/index.js";
import type {
  RuntimeHarnessLog,
  RuntimeHarnessOptions,
  RuntimeHarnessResult,
  SimulatedRuntimeEvent
} from "./types.js";

const DEFAULT_EVENTS: readonly SimulatedRuntimeEvent[] = Object.freeze([
  { type: "create_world" },
  { type: "message", payload: "hello" },
  { type: "switch_world", payload: "reality" }
]);

export function runDefaultRuntimeHarness(options: RuntimeHarnessOptions = {}): RuntimeHarnessResult {
  return runEvents(DEFAULT_EVENTS, options);
}

export function runEvents(
  events: readonly SimulatedRuntimeEvent[],
  options: RuntimeHarnessOptions = {}
): RuntimeHarnessResult {
  const app = App.init();
  const logs: RuntimeHarnessLog[] = [];
  const shouldPrint = options.print ?? true;
  const logger = options.logger ?? console.log;
  let currentWorldId = app.defaultState.world.id;

  const emit = (entry: RuntimeHarnessLog): void => {
    logs.push(entry);
    if (shouldPrint) {
      logger(formatLog(entry));
    }
  };

  emit({
    kind: "snapshot",
    snapshot: app.worldDomain.generateSnapshot(currentWorldId)
  });

  events.forEach((event, index) => {
    emit({
      kind: "event",
      index,
      event,
      worldId: currentWorldId
    });

    if (event.type === "create_world") {
      currentWorldId = resolveWorldId(event.payload ?? "default", app.defaultState.world.id);
      emit({
        kind: "kernel",
        transition: "skipped",
        reason: "world creation is completed by App.init; harness selected the initialized world"
      });
      emit({
        kind: "patches",
        patches: []
      });
      emit({
        kind: "snapshot",
        snapshot: app.worldDomain.generateSnapshot(currentWorldId)
      });
      return;
    }

    if (event.type === "switch_world") {
      currentWorldId = resolveWorldId(event.payload, app.defaultState.world.id);
      app.worldDomain.getWorldState(currentWorldId);
      emit({
        kind: "kernel",
        transition: "skipped",
        reason: "world switching is harness routing, not a ChatKernel state transition"
      });
      emit({
        kind: "patches",
        patches: []
      });
      emit({
        kind: "snapshot",
        snapshot: app.worldDomain.generateSnapshot(currentWorldId)
      });
      return;
    }

    if (event.type === "world_patch") {
      const beforeState = app.worldDomain.getWorldState(currentWorldId);
      const beforePatchCount = queueForWorldState(beforeState).patches.length;
      emit({
        kind: "kernel",
        transition: "skipped",
        reason: "world_patch is applied by WorldDomain through PatchQueue"
      });

      if (event.payload.worldView) {
        app.worldDomain.applyStructuralPatch({
          type: "world.view.adjusted",
          worldId: currentWorldId,
          timestamp: eventTimestamp(index),
          patch: event.payload.worldView
        });
      }
      if (event.payload.settings) {
        app.worldDomain.applyStructuralPatch({
          type: "world.settings.adjusted",
          worldId: currentWorldId,
          timestamp: eventTimestamp(index) + 0.1,
          settings: event.payload.settings
        });
      }

      const afterState = app.worldDomain.getWorldState(currentWorldId);
      emit({
        kind: "patches",
        patches: queueForWorldState(afterState).patches.slice(beforePatchCount)
      });
      emit({
        kind: "snapshot",
        snapshot: app.worldDomain.generateSnapshot(currentWorldId)
      });
      return;
    }

    if (event.type === "contact_persona") {
      const beforeState = app.worldDomain.getWorldState(currentWorldId);
      const beforePatchCount = queueForWorldState(beforeState).patches.length;
      emit({
        kind: "kernel",
        transition: "skipped",
        reason: "contact_persona is applied by WorldDomain through PatchQueue"
      });

      app.worldDomain.applyPersonaOverlay({
        type: "contact.persona.overlayed",
        worldId: currentWorldId,
        actorId: event.payload.actorId,
        timestamp: eventTimestamp(index),
        overlay: {
          ...(event.payload.tone ? { tone: event.payload.tone } : {}),
          ...(event.payload.personality ? { personality: event.payload.personality } : {}),
          ...(event.payload.relationshipPerception
            ? { relationshipPerception: event.payload.relationshipPerception }
            : {})
        }
      });

      const afterState = app.worldDomain.getWorldState(currentWorldId);
      emit({
        kind: "patches",
        patches: queueForWorldState(afterState).patches.slice(beforePatchCount)
      });
      emit({
        kind: "snapshot",
        snapshot: app.worldDomain.generateSnapshot(currentWorldId)
      });
      return;
    }

    const beforeState = app.worldDomain.getWorldState(currentWorldId);
    const beforePatchCount = queueForWorldState(beforeState).patches.length;
    const kernelEvent = toKernelEvent(beforeState, event, index);
    emit({
      kind: "kernel",
      transition: "processed",
      event: kernelEvent
    });

    const nextState = transition(beforeState, kernelEvent);
    app.worldDomain.commitState(nextState);

    const afterState = app.worldDomain.getWorldState(currentWorldId);
    const patches = queueForWorldState(afterState).patches.slice(beforePatchCount);
    emit({
      kind: "patches",
      patches
    });
    emit({
      kind: "snapshot",
      snapshot: app.worldDomain.generateSnapshot(currentWorldId)
    });
  });

  return Object.freeze({
    logs: Object.freeze(logs),
    snapshot: app.worldDomain.generateSnapshot(currentWorldId)
  });
}

function resolveWorldId(value: WorldId | "default" | "reality", defaultWorldId: WorldId): WorldId {
  if (value === "default") {
    return defaultWorldId;
  }
  if (value === "reality") {
    return toWorldId("reality");
  }
  return value;
}

function toKernelEvent(
  state: WorldState,
  event: Extract<SimulatedRuntimeEvent, { readonly type: "message" }>,
  index: number
): ChatKernelEvent {
  const chatId = state.chat.activeChatId;
  if (!chatId) {
    throw new Error(`RuntimeHarness: world "${state.world.id}" does not have an active chat.`);
  }

  const timestamp = 1000 + index;
  return Object.freeze({
    id: toChatEventId(`event:harness:${index}`),
    type: "message.submitted",
    worldId: state.world.id,
    timestamp,
    payload: Object.freeze({
      chatId: chatId as ChatId,
      messageId: toMessageId(`message:harness:${index}`),
      authorActorId: state.world.ownerActorId,
      text: event.payload,
      createdAt: timestamp
    })
  });
}

function eventTimestamp(index: number): number {
  return 1000 + index;
}

function formatLog(entry: RuntimeHarnessLog): string {
  switch (entry.kind) {
    case "event":
      return [
        `\n[event ${entry.index}] ${entry.event.type}`,
        `world=${entry.worldId}`,
        `payload=${JSON.stringify("payload" in entry.event ? entry.event.payload ?? null : null)}`
      ].join("\n");

    case "kernel":
      return entry.transition === "processed"
        ? `[kernel] processed ${entry.event?.type ?? "unknown"}`
        : `[kernel] skipped: ${entry.reason ?? "no transition"}`;

    case "patches":
      return [
        `[patchqueue] ${entry.patches.length} new patch(es)`,
        JSON.stringify(entry.patches.map(toConsolePatch), null, 2)
      ].join("\n");

    case "snapshot":
      return [
        "[snapshot]",
        JSON.stringify(toConsoleSnapshot(entry.snapshot), null, 2)
      ].join("\n");
  }
}

function toConsolePatch(patch: StatePatch): Readonly<Record<string, unknown>> {
  return {
    source: patch.source,
    priority: patch.priority,
    timestamp: patch.timestamp,
    targetField: patch.targetField,
    operation: patch.operation,
    value: toPlainValue(patch.value)
  };
}

function toConsoleSnapshot(snapshot: WorldSnapshot): Readonly<Record<string, unknown>> {
  return {
    worldMeta: snapshot.worldMeta,
    contacts: snapshot.contacts,
    groups: snapshot.groups,
    chatState: {
      activeChatId: snapshot.chatState.activeChatId,
      chats: [...snapshot.chatState.chats.values()]
    },
    memorySummary: snapshot.memorySummary,
    runtimeState: snapshot.runtimeState
  };
}

function toPlainValue(value: unknown): unknown {
  if (value instanceof Map) {
    return [...value.entries()];
  }
  if (Array.isArray(value)) {
    return value.map(toPlainValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, toPlainValue(nested)])
    );
  }
  return value;
}
