import type { AppRuntime } from "../app/index.js";
import { toChatId } from "../chat-kernel/index.js";
import { createPatchQueue } from "../patch-queue/index.js";
import type { WorldChatSession, WorldId, WorldState } from "../world-domain/index.js";

export const CREATE_GROUP_SUCCESS_MESSAGE = "已创建群聊";
export const CREATE_GROUP_MEMBER_REQUIRED_MESSAGE = "请选择至少一个 AI 成员";

export type CreateGroupChatInput = Readonly<{
  readonly app: AppRuntime;
  readonly worldId: WorldId;
  readonly groupName: string;
  readonly selectedWorldContactIds: readonly string[];
}>;

export function createGroupChat(input: CreateGroupChatInput): WorldState {
  const state = input.app.worldDomain.getWorldState(input.worldId);
  const selectedMembers = [...new Set(input.selectedWorldContactIds)];
  if (selectedMembers.length === 0) {
    throw new Error(CREATE_GROUP_MEMBER_REQUIRED_MESSAGE);
  }
  const candidates = new Set(
    state.contacts
      .filter((contact) => contact.kind === "assistant" && contact.actorId !== state.world.assistantActorId)
      .map((contact) => contact.actorId)
  );
  for (const memberId of selectedMembers) {
    if (!candidates.has(memberId)) {
      throw new Error(`CreateGroupService: contact "${memberId}" is not available in world "${input.worldId}".`);
    }
  }

  const groupTitle = input.groupName.trim() || "群聊";
  const groupId = nextGroupChatId(state);
  const nextChats = new Map(state.chat.chats);
  nextChats.set(groupId, {
    id: toChatId(groupId),
    worldId: input.worldId,
    title: groupTitle,
    messages: []
  });

  const nextState = createWorldStateFromSnapshot({
    ...state,
    groups: [
      ...state.groups,
      {
        id: groupId,
        title: groupTitle,
        actorIds: selectedMembers
      }
    ],
    chat: {
      activeChatId: groupId,
      chats: nextChats
    },
    metadata: {
      ...state.metadata,
      settings: {
        ...state.metadata.settings,
        groupMemoryScopes: {
          ...groupMemoryScopesFromSettings(state.metadata.settings),
          [groupId]: {
            worldId: input.worldId,
            groupId,
            namespace: `world:${input.worldId}:group:${groupId}`,
            status: "placeholder"
          }
        }
      }
    }
  });
  input.app.worldDomain.commitState(nextState);
  return input.app.worldDomain.getWorldState(input.worldId);
}

function nextGroupChatId(state: WorldState): string {
  let index = state.groups.length + 1;
  let candidate = `group:${state.world.id}:${index}`;
  while (state.chat.chats.has(candidate) || state.groups.some((group) => group.id === candidate)) {
    index += 1;
    candidate = `group:${state.world.id}:${index}`;
  }
  return candidate;
}

function groupMemoryScopesFromSettings(settings: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  const value = settings.groupMemoryScopes;
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : {};
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
          ...(chat.groupRules ? { groupRules: { ...chat.groupRules } } : {}),
          ...(chat.groupFiles ? { groupFiles: chat.groupFiles.map((file) => ({ ...file })) } : {})
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
