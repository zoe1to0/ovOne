import type { AppRuntime } from "../app/index.js";
import { createPatchQueue } from "../patch-queue/index.js";
import { validateWorldRemoveMemberCommand } from "../domain/index.js";
import type { WorldRemoveMemberCommand } from "../domain/index.js";
import type { WorldChatSession, WorldState } from "../world-domain/index.js";

export const WORLD_MEMBER_REMOVE_SUCCESS_MESSAGE = "已删除";

export type RemoveWorldMemberInput = Readonly<{
  readonly app: AppRuntime;
  readonly command: WorldRemoveMemberCommand;
}>;

export function removeWorldMember(input: RemoveWorldMemberInput): WorldState {
  const state = input.app.worldDomain.getWorldState(input.command.worldId);
  const validation = validateWorldRemoveMemberCommand(input.command, {
    world: {
      type: state.world.type
    },
    contacts: state.contacts.map((contact) => ({
      actorId: contact.actorId,
      kind: contact.kind
    }))
  });
  if (!validation.valid || !validation.command) {
    throw new Error(validation.error ?? "WorldMemberRemoveService: invalid remove-member command.");
  }

  const privateChatId = privateChatIdForMember(input.command);
  const nextChats = new Map(state.chat.chats);
  nextChats.delete(privateChatId);

  const nextState = createWorldStateFromSnapshot({
    ...state,
    contacts: state.contacts.filter((contact) => contact.actorId !== input.command.actorId),
    chat: {
      activeChatId: state.chat.activeChatId === privateChatId ? null : state.chat.activeChatId,
      chats: nextChats
    },
    metadata: {
      ...state.metadata,
      settings: removeMemberMemoryScope(state.metadata.settings, input.command.actorId)
    }
  });
  input.app.worldDomain.commitState(nextState);
  return input.app.worldDomain.getWorldState(input.command.worldId);
}

export function privateChatIdForMember(command: WorldRemoveMemberCommand): string {
  return `chat:${command.worldId}:${command.actorId}`;
}

function removeMemberMemoryScope(
  settings: Readonly<Record<string, unknown>>,
  actorId: string
): Readonly<Record<string, unknown>> {
  const scopes = settings.memberMemoryScopes;
  if (!scopes || typeof scopes !== "object" || Array.isArray(scopes)) {
    return settings;
  }
  const nextScopes = { ...(scopes as Readonly<Record<string, unknown>>) };
  delete nextScopes[actorId];
  return {
    ...settings,
    memberMemoryScopes: nextScopes
  };
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
          messages: chat.messages.map((message) => ({ ...message }))
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
