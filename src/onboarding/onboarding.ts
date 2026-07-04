import type { AppRuntime } from "../app/index.js";
import {
  toChatEventId,
  toMessageId,
  transition
} from "../chat-kernel/index.js";
import type { ChatId, MessageId } from "../chat-kernel/index.js";
import { createBetaTelemetry } from "../beta-telemetry/index.js";
import type { BetaTelemetry } from "../beta-telemetry/index.js";
import { createPersistentProductRuntime } from "../persistence/index.js";
import type { PersistentProductRuntime } from "../persistence/index.js";
import type { WorldPersistence } from "../persistence/index.js";
import type {
  OnboardedProductRuntime,
  OnboardedProductShellRuntime,
  OnboardedProductShellView,
  OnboardingOptions,
  OnboardingState
} from "./types.js";

const FRIEND_ACTOR_ID = "default-ai-friend";
const FRIEND_NAME = "Default AI Friend";
const FRIEND_GREETING = "I am here with you. Send a message whenever you are ready.";
const FRIEND_REPLY = "I hear you. Tell me a little more.";

export const OnboardingFlow = Object.freeze({
  createOnboardedProductRuntime
});

export function createOnboardedProductRuntime(
  options: OnboardingOptions = {}
): OnboardedProductRuntime {
  const firstRun = (options.storage?.listWorldIds().length ?? 0) === 0;
  const telemetry = options.telemetry ?? createBetaTelemetry();
  const runtime = createPersistentProductRuntime(options);

  prepareAlphaRuntime(runtime, firstRun);
  recordSnapshotRecovery(runtime, telemetry);

  return Object.freeze({
    ...runtime,
    telemetry,
    shell: createOnboardedShell(runtime, firstRun, telemetry)
  });
}

function createOnboardedShell(
  runtime: PersistentProductRuntime,
  firstRun: boolean,
  telemetry: BetaTelemetry
): OnboardedProductShellRuntime {
  const shell = runtime.shell;
  let onboarding = onboardingState(firstRun);

  const decorate = (): OnboardedProductShellView => {
    try {
      return Object.freeze({
        ...shell.view(),
        onboarding
      });
    } catch {
      telemetry.record("error.fallback-triggered", { source: "view" });
      prepareAlphaRuntime(runtime, false);
      return Object.freeze({
        ...shell.openScreen("chat"),
        onboarding
      });
    }
  };

  return Object.freeze({
    openScreen: (screen) => {
      try {
        return shell.openScreen(screen);
      } catch {
        telemetry.record("error.invalid-event", { source: "openScreen", screen });
        return decorate();
      }
    },
    switchWorld: (worldId) => {
      try {
        const view = shell.switchWorld(worldId);
        telemetry.record("chat.switched", { worldId });
        return view;
      } catch {
        telemetry.record("error.invalid-event", { source: "switchWorld", worldId });
        return decorate();
      }
    },
    createWorldFromDraft: (draft) => {
      try {
        return shell.createWorldFromDraft(draft);
      } catch {
        telemetry.record("error.invalid-event", { source: "createWorldFromDraft" });
        return decorate();
      }
    },
    saveWorldMetadata: (patch) => {
      try {
        return shell.saveWorldMetadata(patch);
      } catch {
        telemetry.record("error.invalid-event", { source: "saveWorldMetadata", worldId: patch.worldId });
        return decorate();
      }
    },
    saveWorldRoleMetadata: (patch) => {
      try {
        return shell.saveWorldRoleMetadata(patch);
      } catch {
        telemetry.record("error.invalid-event", { source: "saveWorldRoleMetadata", worldId: patch.worldId });
        return decorate();
      }
    },
    saveContactDetailPreferences: (patch) => {
      try {
        return shell.saveContactDetailPreferences(patch);
      } catch {
        telemetry.record("error.invalid-event", { source: "saveContactDetailPreferences", worldId: patch.worldId });
        return decorate();
      }
    },
    saveChatAppearanceSettings: (patch) => {
      try {
        return shell.saveChatAppearanceSettings(patch);
      } catch {
        telemetry.record("error.invalid-event", { source: "saveChatAppearanceSettings", worldId: patch.worldId });
        return decorate();
      }
    },
    saveGroupRules: (patch) => {
      try {
        return shell.saveGroupRules(patch);
      } catch {
        telemetry.record("error.invalid-event", { source: "saveGroupRules", worldId: patch.worldId });
        return decorate();
      }
    },
    addGroupMember: (command) => {
      try {
        return shell.addGroupMember(command);
      } catch {
        telemetry.record("error.invalid-event", { source: "addGroupMember", worldId: command.worldId });
        return decorate();
      }
    },
    removeGroupMember: (command) => {
      try {
        return shell.removeGroupMember(command);
      } catch {
        telemetry.record("error.invalid-event", { source: "removeGroupMember", worldId: command.worldId });
        return decorate();
      }
    },
    deleteFriend: (command) => {
      try {
        return shell.deleteFriend(command);
      } catch {
        telemetry.record("error.invalid-event", { source: "deleteFriend", worldId: command.worldId });
        return decorate();
      }
    },
    addWorldMember: (command) => {
      try {
        return shell.addWorldMember(command);
      } catch {
        telemetry.record("error.invalid-event", { source: "addWorldMember", worldId: command.worldId });
        return decorate();
      }
    },
    removeWorldMember: (command) => {
      try {
        return shell.removeWorldMember(command);
      } catch {
        telemetry.record("error.invalid-event", { source: "removeWorldMember", worldId: command.worldId });
        return decorate();
      }
    },
    createGroupChat: (input) => {
      try {
        return shell.createGroupChat(input);
      } catch {
        telemetry.record("error.invalid-event", { source: "createGroupChat" });
        return decorate();
      }
    },
    sendMessage: (text) => {
      const trimmed = text.trim();
      if (!trimmed) {
        return decorate();
      }
      try {
        shell.sendMessage(trimmed);
        telemetry.record("message.sent", { length: trimmed.length });
        if (ensureAssistantReply(runtime.app, shell.view().activeWorldId)) {
          telemetry.record("message.ai-replied");
        }
        onboarding = onboardingState(false);
        return shell.view();
      } catch {
        telemetry.record("error.invalid-event", { source: "sendMessage" });
        telemetry.record("error.fallback-triggered", { source: "sendMessage" });
        prepareAlphaRuntime(runtime, false);
        onboarding = onboardingState(false);
        return decorate();
      }
    },
    snapshot: shell.snapshot,
    view: decorate,
    onboarding: () => onboarding,
    telemetry
  });
}

function recordSnapshotRecovery(runtime: PersistentProductRuntime, telemetry: BetaTelemetry): void {
  for (const notification of runtime.persistence.notifications()) {
    telemetry.record("error.snapshot-recovered", {
      type: notification.type,
      worldId: notification.worldId
    });
  }
}

function prepareAlphaRuntime(runtime: PersistentProductRuntime, firstRun: boolean): void {
  const initialView = runtime.shell.openScreen("chat");
  const app = runtime.app;
  const persistence = runtime.persistence;

  for (const world of initialView.availableWorlds) {
    ensureFriendContact(app, world.worldId);
    ensureActiveChatReady(app, world.worldId);
  }

  if (firstRun) {
    ensureFriendGreeting(app, initialView.activeWorldId);
  }

  persistence.saveWorlds(initialView.availableWorlds.map((world) => world.worldId));
}

function ensureFriendContact(app: AppRuntime, worldId: OnboardedProductShellView["activeWorldId"]): void {
  const state = app.worldDomain.getWorldState(worldId);
  if (state.contacts.some((contact) => contact.actorId === FRIEND_ACTOR_ID)) {
    return;
  }

  app.worldDomain.applyStructuralPatch({
    type: "ai.contact.added",
    worldId,
    timestamp: 6000,
    contact: {
      actorId: FRIEND_ACTOR_ID,
      displayName: FRIEND_NAME,
      kind: "assistant"
    }
  });
}

function ensureFriendGreeting(app: AppRuntime, worldId: OnboardedProductShellView["activeWorldId"]): void {
  ensureActiveChatReady(app, worldId);
  const state = app.worldDomain.getWorldState(worldId);
  const chatId = state.chat.activeChatId;
  if (!chatId) {
    throw new Error("OnboardingFlow: active chat is required for first-run greeting.");
  }

  const chat = state.chat.chats.get(chatId);
  if (chat?.messages.some((message) => message.id === "message:onboarding:friend:greeting")) {
    return;
  }

  const nextState = transition(state, {
    id: toChatEventId("event:onboarding:friend:greeting"),
    type: "message.submitted",
    worldId,
    timestamp: 6001,
    payload: {
      chatId: chatId as ChatId,
      messageId: toMessageId("message:onboarding:friend:greeting") as MessageId,
      authorActorId: FRIEND_ACTOR_ID,
      text: FRIEND_GREETING,
      createdAt: 6001
    }
  });
  app.worldDomain.commitState(nextState);
}

function ensureAssistantReply(app: AppRuntime, worldId: OnboardedProductShellView["activeWorldId"]): boolean {
  ensureFriendContact(app, worldId);
  ensureActiveChatReady(app, worldId);

  const state = app.worldDomain.getWorldState(worldId);
  const chatId = state.chat.activeChatId;
  if (!chatId) {
    return false;
  }

  const chat = state.chat.chats.get(chatId);
  const lastMessage = chat?.messages.at(-1);
  if (!lastMessage || lastMessage.authorActorId === FRIEND_ACTOR_ID) {
    return false;
  }

  const nextIndex = chat?.messages.length ?? 0;
  const timestamp = Math.max(7000 + nextIndex, lastMessage.createdAt + 1);
  const nextState = transition(state, {
    id: toChatEventId(`event:alpha:friend:reply:${worldId}:${nextIndex}`),
    type: "message.submitted",
    worldId,
    timestamp,
    payload: {
      chatId: chatId as ChatId,
      messageId: toMessageId(`message:alpha:friend:reply:${worldId}:${nextIndex}`) as MessageId,
      authorActorId: FRIEND_ACTOR_ID,
      text: FRIEND_REPLY,
      createdAt: timestamp
    }
  });
  app.worldDomain.commitState(nextState);
  return true;
}

function ensureActiveChatReady(app: AppRuntime, worldId: OnboardedProductShellView["activeWorldId"]): void {
  const state = app.worldDomain.getWorldState(worldId);
  if (state.chat.activeChatId) {
    return;
  }

  const chatId = `chat:${worldId}`;
  const nextState = transition(state, {
    id: toChatEventId(`event:alpha:chat-ready:${worldId}`),
    type: "chat.started",
    worldId,
    timestamp: 5000,
    payload: {
      chatId: chatId as ChatId,
      title: FRIEND_NAME
    }
  });
  app.worldDomain.commitState(nextState);
}

function onboardingState(firstRun: boolean): OnboardingState {
  return Object.freeze({
    firstRun,
    sampleContactActorId: FRIEND_ACTOR_ID,
    sampleContactName: FRIEND_NAME
  });
}
