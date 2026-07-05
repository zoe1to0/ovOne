import type { AppRuntime } from "../app/index.js";
import { validateGroupAddMemberCommand, validateGroupRemoveMemberCommand } from "../domain/index.js";
import type { GroupAddMemberCommand, GroupRemoveMemberCommand } from "../domain/index.js";
import { createPatchQueue } from "../patch-queue/index.js";
import type { WorldChatSession, WorldState } from "../world-domain/index.js";

export const GROUP_MEMBER_ADD_SUCCESS_MESSAGE = "已添加";
export const GROUP_MEMBER_REMOVE_SUCCESS_MESSAGE = "已移除";

export type AddGroupMemberInput = Readonly<{
  readonly app: AppRuntime;
  readonly command: GroupAddMemberCommand;
}>;

export type RemoveGroupMemberInput = Readonly<{
  readonly app: AppRuntime;
  readonly command: GroupRemoveMemberCommand;
}>;

export function addGroupMember(input: AddGroupMemberInput): WorldState {
  const state = input.app.worldDomain.getWorldState(input.command.worldId);
  const validation = validateGroupAddMemberCommand(input.command, {
    worldId: state.world.id,
    assistantActorId: state.world.assistantActorId,
    contacts: state.contacts,
    groups: state.groups
  });
  if (!validation.valid || !validation.command) {
    throw new Error(`GroupMemberService: invalid add member command for group "${input.command.groupChatId}".`);
  }

  const nextGroups = state.groups.map((group) => group.id === validation.command?.groupChatId
    ? {
        ...group,
        actorIds: [...group.actorIds, validation.command.worldContactId]
      }
    : group);

  const nextState = createWorldStateFromSnapshot({
    ...state,
    groups: nextGroups
  });
  input.app.worldDomain.commitState(nextState);
  return input.app.worldDomain.getWorldState(input.command.worldId);
}

export function removeGroupMember(input: RemoveGroupMemberInput): WorldState {
  const state = input.app.worldDomain.getWorldState(input.command.worldId);
  const validation = validateGroupRemoveMemberCommand(input.command, {
    worldId: state.world.id,
    assistantActorId: state.world.assistantActorId,
    contacts: state.contacts,
    groups: state.groups
  });
  if (!validation.valid || !validation.command) {
    throw new Error(`GroupMemberService: invalid remove member command for group "${input.command.groupChatId}".`);
  }
  const command = validation.command;

  const nextGroups = state.groups.map((group) => group.id === command.groupChatId
    ? {
        ...group,
        actorIds: group.actorIds.filter((actorId) => actorId !== command.worldContactId)
      }
    : group);

  const nextState = createWorldStateFromSnapshot({
    ...state,
    groups: nextGroups
  });
  input.app.worldDomain.commitState(nextState);
  return input.app.worldDomain.getWorldState(input.command.worldId);
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
