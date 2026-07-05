import type { AppRuntime } from "../app/index.js";
import { createPatchQueue } from "../patch-queue/index.js";
import { validateGroupFileUploadCommand } from "../domain/index.js";
import type { GroupFileRecord, GroupFileUploadCommand } from "../domain/index.js";
import type { WorldChatSession, WorldState } from "../world-domain/index.js";

export type SaveGroupFileMetadataInput = Readonly<{
  readonly app: AppRuntime;
  readonly command: GroupFileUploadCommand;
}>;

export function saveGroupFileMetadata(input: SaveGroupFileMetadataInput): WorldState {
  const state = input.app.worldDomain.getWorldState(input.command.worldId);
  const validation = validateGroupFileUploadCommand(input.command, {
    worldId: state.world.id,
    chatIds: [...state.chat.chats.keys()],
    groupChatIds: state.groups.map((group) => group.id)
  });
  if (!validation.valid || !validation.command) {
    throw new Error(`GroupFilesService: invalid file metadata command for chat "${input.command.groupChatId}".`);
  }

  const chat = state.chat.chats.get(validation.command.groupChatId);
  if (!chat) {
    throw new Error(`GroupFilesService: unknown chat "${validation.command.groupChatId}".`);
  }

  const nextChats = new Map<string, WorldChatSession>(state.chat.chats);
  const record = groupFileRecordFromCommand(validation.command, chat.groupFiles?.length ?? 0);
  nextChats.set(chat.id, {
    ...chat,
    groupFiles: Object.freeze([...(chat.groupFiles ?? []), record])
  });

  input.app.worldDomain.commitState(createWorldStateFromSnapshot({
    ...state,
    chat: {
      ...state.chat,
      chats: nextChats
    }
  }));
  return input.app.worldDomain.getWorldState(input.command.worldId);
}

function groupFileRecordFromCommand(command: GroupFileUploadCommand, index: number): GroupFileRecord {
  return Object.freeze({
    worldId: command.worldId,
    groupChatId: command.groupChatId,
    fileName: command.fileName.trim(),
    fileType: command.fileType ?? "",
    fileSize: command.fileSize ?? 0,
    fileRef: command.fileRef ?? `group-file:${command.worldId}:${command.groupChatId}:${index + 1}`,
    uploadedAt: command.uploadedAt ?? 5000 + index,
    uploadedBy: "user"
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
