import type { AppRuntime } from "../app/index.js";
import { createPatchQueue } from "../patch-queue/index.js";
import { validateDeleteFriendCommand } from "../domain/index.js";
import type { DeleteFriendCommand } from "../domain/index.js";
import type { WorldChatSession, WorldState } from "../world-domain/index.js";

export const CONTACT_DETAIL_DELETE_FRIEND_SUCCESS_MESSAGE = "\u5df2\u5220\u9664";

export type DeleteFriendInput = Readonly<{
  readonly app: AppRuntime;
  readonly command: DeleteFriendCommand;
}>;

export function deleteFriendInCurrentWorld(input: DeleteFriendInput): WorldState {
  const state = input.app.worldDomain.getWorldState(input.command.worldId);
  const validation = validateDeleteFriendCommand(input.command, {
    worldId: state.world.id,
    contactActorIds: state.contacts
      .filter((contact) => contact.kind === "assistant" && contact.actorId !== state.world.assistantActorId)
      .map((contact) => contact.actorId)
  });
  if (!validation.valid || !validation.command) {
    throw new Error(validation.error ?? "ContactDetailDeleteService: invalid delete friend command.");
  }

  const privateChatId = privateChatIdForFriend(input.command);
  const nextChats = new Map(state.chat.chats);
  nextChats.delete(privateChatId);

  const nextState = createWorldStateFromSnapshot({
    ...state,
    contacts: state.contacts.filter((contact) => contact.actorId !== validation.command!.worldContactId),
    chat: {
      activeChatId: state.chat.activeChatId === privateChatId ? null : state.chat.activeChatId,
      chats: nextChats
    },
    metadata: {
      ...state.metadata,
      settings: preserveGlobalAILinkIfReality(
        removeFriendMemoryScope(state.metadata.settings, validation.command.worldContactId),
        state,
        validation.command.worldContactId
      )
    }
  });
  input.app.worldDomain.commitState(nextState);
  return input.app.worldDomain.getWorldState(input.command.worldId);
}

function preserveGlobalAILinkIfReality(
  settings: Readonly<Record<string, unknown>>,
  state: WorldState,
  actorId: string
): Readonly<Record<string, unknown>> {
  if (state.world.type !== "reality") {
    return settings;
  }
  const contact = state.contacts.find((candidate) => candidate.actorId === actorId);
  if (!contact) {
    return settings;
  }
  const current = settings.globalAILinks;
  const links = current && typeof current === "object" && !Array.isArray(current)
    ? current as Readonly<Record<string, unknown>>
    : {};
  return {
    ...settings,
    globalAILinks: {
      ...links,
      [actorId]: {
        globalAILinkId: `link:${actorId}`,
        globalAIModelId: actorId,
        actorId,
        displayName: contact.displayName,
        status: "connected"
      }
    }
  };
}

export function privateChatIdForFriend(command: DeleteFriendCommand): string {
  return `chat:${command.worldId}:${command.worldContactId}`;
}

function removeFriendMemoryScope(
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
