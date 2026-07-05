import type { AppRuntime } from "../app/index.js";
import { createPatchQueue } from "../patch-queue/index.js";
import { validateChatSettingsPatch } from "../domain/index.js";
import type { ChatSettingsPatch } from "../domain/index.js";
import type { ChatAppearanceSettings, WorldChatSession, WorldState } from "../world-domain/index.js";

export type SaveChatAppearanceSettingsInput = Readonly<{
  readonly app: AppRuntime;
  readonly patch: ChatSettingsPatch;
}>;

export function saveChatAppearanceSettings(input: SaveChatAppearanceSettingsInput): WorldState {
  const state = input.app.worldDomain.getWorldState(input.patch.worldId);
  const validation = validateChatSettingsPatch(input.patch, {
    worldId: state.world.id,
    chatIds: [...state.chat.chats.keys()]
  });
  if (!validation.valid || !validation.patch) {
    throw new Error(`ChatSettingsService: invalid appearance patch for chat "${input.patch.chatId}".`);
  }

  const chat = state.chat.chats.get(validation.patch.chatId);
  if (!chat) {
    throw new Error(`ChatSettingsService: unknown chat "${validation.patch.chatId}".`);
  }

  const nextChats = new Map<string, WorldChatSession>(state.chat.chats);
  nextChats.set(chat.id, {
    ...chat,
    appearance: appearanceFromPatch(validation.patch)
  });

  input.app.worldDomain.commitState(createWorldStateFromSnapshot({
    ...state,
    chat: {
      ...state.chat,
      chats: nextChats
    }
  }));
  return input.app.worldDomain.getWorldState(input.patch.worldId);
}

function appearanceFromPatch(patch: ChatSettingsPatch): ChatAppearanceSettings {
  return Object.freeze({
    backgroundImageRef: patch.backgroundImageRef,
    backgroundColor: patch.backgroundColor,
    myBubbleColor: patch.myBubbleColor,
    otherBubbleColor: patch.otherBubbleColor
  });
}

function createWorldStateFromSnapshot(state: WorldState): WorldState {
  const rawState = {
    ...state,
    contacts: state.contacts.map((contact) => ({ ...contact })),
    groups: state.groups.map((group) => ({
      ...group,
      actorIds: [...group.actorIds]
    })),
    metadata: {
      title: state.metadata.title,
      type: state.metadata.type,
      worldView: { ...state.metadata.worldView },
      settings: { ...state.metadata.settings },
      personaOverlays: { ...state.metadata.personaOverlays }
    },
    chat: {
      activeChatId: state.chat.activeChatId,
      chats: new Map<string, WorldChatSession>(
        [...state.chat.chats.entries()].map(([chatId, chat]) => [
          chatId,
          {
            ...chat,
            messages: chat.messages.map((message) => ({ ...message })),
            ...(chat.appearance ? { appearance: { ...chat.appearance } } : {}),
            ...(chat.groupRules ? { groupRules: { ...chat.groupRules } } : {}),
            ...(chat.groupFiles ? { groupFiles: chat.groupFiles.map((file) => ({ ...file })) } : {})
          }
        ])
      )
    }
  } satisfies WorldState;

  const queue = createPatchQueue();
  queue.enqueue({
    source: "creation",
    targetField: "world",
    operation: "initialize",
    value: rawState
  });
  return queue.reduce();
}
