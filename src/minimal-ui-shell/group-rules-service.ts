import type { AppRuntime } from "../app/index.js";
import { createPatchQueue } from "../patch-queue/index.js";
import { validateGroupRulesPatch } from "../domain/index.js";
import type { GroupRulesPatch } from "../domain/index.js";
import type { GroupRulesSettings, WorldChatSession, WorldState } from "../world-domain/index.js";

export type SaveGroupRulesInput = Readonly<{
  readonly app: AppRuntime;
  readonly patch: GroupRulesPatch;
}>;

export function saveGroupRules(input: SaveGroupRulesInput): WorldState {
  const state = input.app.worldDomain.getWorldState(input.patch.worldId);
  const validation = validateGroupRulesPatch(input.patch, {
    worldId: state.world.id,
    chatIds: [...state.chat.chats.keys()],
    groupChatIds: state.groups.map((group) => group.id)
  });
  if (!validation.valid || !validation.patch) {
    throw new Error(`GroupRulesService: invalid group rules patch for chat "${input.patch.groupChatId}".`);
  }

  const chat = state.chat.chats.get(validation.patch.groupChatId);
  if (!chat) {
    throw new Error(`GroupRulesService: unknown chat "${validation.patch.groupChatId}".`);
  }

  const nextChats = new Map<string, WorldChatSession>(state.chat.chats);
  nextChats.set(chat.id, {
    ...chat,
    groupRules: groupRulesFromPatch(validation.patch)
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

function groupRulesFromPatch(patch: GroupRulesPatch): GroupRulesSettings {
  return Object.freeze({
    rulesText: patch.rulesText
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
        [...state.chat.chats.entries()].map(([chatId, chat]) => [chatId, {
          ...chat,
          messages: chat.messages.map((message) => ({ ...message })),
          ...(chat.appearance ? { appearance: { ...chat.appearance } } : {}),
          ...(chat.groupRules ? { groupRules: { ...chat.groupRules } } : {})
        }])
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
