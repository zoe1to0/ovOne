import type { WorldChatSession, WorldContact, WorldId, WorldState } from "../world-domain/index.js";

export const AI_SCOPED_WORLD_MEMORY_SETTINGS_KEY = "aiScopedWorldMemoryItems";
export const AI_SCOPED_WORLD_MEMORY_MAX_PROMPT_ITEMS = 10;
export const AI_SCOPED_WORLD_MEMORY_MAX_PROMPT_CONTENT_LENGTH = 240;

export type AIScopedWorldMemorySourceType = "private_chat" | "group_chat";
export type AIScopedWorldMemoryStatus = "active" | "deleted" | "inactive";

export type AIScopedWorldMemoryItem = Readonly<{
  readonly id: string;
  readonly worldId: WorldId;
  readonly ownerWorldContactId: string;
  readonly sourceType: AIScopedWorldMemorySourceType;
  readonly sourceChatId: string;
  readonly sourceGroupId?: string;
  readonly sourceMessageId: string;
  readonly content: string;
  readonly createdAt: number;
  readonly createdBy: "user";
  readonly status: AIScopedWorldMemoryStatus;
}>;

export type AIScopedWorldMemoryCaptureInput = Readonly<{
  readonly state: WorldState;
  readonly chatId: string;
  readonly sourceMessageId: string;
  readonly text: string;
  readonly createdAt: number;
}>;

export function parseExplicitMemoryCommand(text: string): string | null {
  const trimmed = text.trim();
  const prefixes = ["记住：", "记住:", "remember:"];
  for (const prefix of prefixes) {
    if (trimmed.toLowerCase().startsWith(prefix.toLowerCase())) {
      const content = trimmed.slice(prefix.length).trim();
      return content.length > 0 ? content : null;
    }
  }
  return null;
}

export function createAIScopedWorldMemoryItems(input: AIScopedWorldMemoryCaptureInput): readonly AIScopedWorldMemoryItem[] {
  const content = parseExplicitMemoryCommand(input.text);
  if (!content) {
    return Object.freeze([]);
  }

  const group = input.state.groups.find((candidate) => candidate.id === input.chatId) ?? null;
  const owners = group
    ? group.actorIds.flatMap((actorId) => {
        const contact = input.state.contacts.find((candidate) => candidate.actorId === actorId) ?? null;
        return isMemoryOwningAIContact(input.state, contact) ? [contact] : [];
      })
    : [resolvePrivateMemoryOwner(input.state, input.chatId)].filter((contact): contact is WorldContact => Boolean(contact));

  return Object.freeze(owners.map((owner) => Object.freeze({
    id: `memory:${input.state.world.id}:${owner.actorId}:${input.sourceMessageId}`,
    worldId: input.state.world.id,
    ownerWorldContactId: owner.actorId,
    sourceType: group ? "group_chat" : "private_chat",
    sourceChatId: input.chatId,
    ...(group ? { sourceGroupId: group.id } : {}),
    sourceMessageId: input.sourceMessageId,
    content,
    createdAt: input.createdAt,
    createdBy: "user" as const,
    status: "active" as const
  })));
}

export function readAIScopedWorldMemoryItems(settings: Readonly<Record<string, unknown>>): readonly AIScopedWorldMemoryItem[] {
  const value = settings[AI_SCOPED_WORLD_MEMORY_SETTINGS_KEY];
  if (!Array.isArray(value)) {
    return Object.freeze([]);
  }
  return Object.freeze(value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return [];
    }
    const record = item as Readonly<Record<string, unknown>>;
    if (
      typeof record.id !== "string" ||
      typeof record.worldId !== "string" ||
      typeof record.ownerWorldContactId !== "string" ||
      (record.sourceType !== "private_chat" && record.sourceType !== "group_chat") ||
      typeof record.sourceChatId !== "string" ||
      typeof record.sourceMessageId !== "string" ||
      typeof record.content !== "string" ||
      typeof record.createdAt !== "number" ||
      record.createdBy !== "user" ||
      (record.status !== "active" && record.status !== "deleted" && record.status !== "inactive")
    ) {
      return [];
    }
    return [Object.freeze({
      id: record.id,
      worldId: record.worldId as WorldId,
      ownerWorldContactId: record.ownerWorldContactId,
      sourceType: record.sourceType,
      sourceChatId: record.sourceChatId,
      ...(typeof record.sourceGroupId === "string" ? { sourceGroupId: record.sourceGroupId } : {}),
      sourceMessageId: record.sourceMessageId,
      content: record.content,
      createdAt: record.createdAt,
      createdBy: "user" as const,
      status: record.status
    }) satisfies AIScopedWorldMemoryItem];
  }));
}

export function appendAIScopedWorldMemoryItems(
  settings: Readonly<Record<string, unknown>>,
  items: readonly AIScopedWorldMemoryItem[]
): Readonly<Record<string, unknown>> {
  if (items.length === 0) {
    return settings;
  }
  return Object.freeze({
    ...settings,
    [AI_SCOPED_WORLD_MEMORY_SETTINGS_KEY]: Object.freeze([
      ...readAIScopedWorldMemoryItems(settings),
      ...items
    ])
  });
}

export function resolveAIScopedWorldMemoriesForResponder(
  state: WorldState,
  responder: WorldContact
): readonly AIScopedWorldMemoryItem[] {
  return Object.freeze(readAIScopedWorldMemoryItems(state.metadata.settings)
    .filter((item) =>
      item.status === "active" &&
      item.worldId === state.world.id &&
      item.ownerWorldContactId === responder.actorId
    )
    .sort((left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id))
    .slice(-AI_SCOPED_WORLD_MEMORY_MAX_PROMPT_ITEMS));
}

export function formatAIScopedWorldMemoryPromptSection(items: readonly AIScopedWorldMemoryItem[]): string | null {
  const activeItems = items.filter((item) => item.status === "active").slice(-AI_SCOPED_WORLD_MEMORY_MAX_PROMPT_ITEMS);
  if (activeItems.length === 0) {
    return null;
  }
  return [
    "Your memory in this world:",
    ...activeItems.map((item) => `- ${trimMemoryContent(item.content)}`)
  ].join("\n");
}

function resolvePrivateMemoryOwner(state: WorldState, chatId: string): WorldContact | null {
  return state.contacts.find((contact) =>
    isMemoryOwningAIContact(state, contact) &&
    chatId.endsWith(`:${contact.actorId}`)
  ) ?? null;
}

function isMemoryOwningAIContact(state: WorldState, contact: WorldContact | null): contact is WorldContact {
  return Boolean(contact && contact.kind === "assistant" && contact.actorId !== state.world.assistantActorId);
}

function trimMemoryContent(content: string): string {
  const compact = content.replace(/\s+/g, " ").trim();
  return compact.length <= AI_SCOPED_WORLD_MEMORY_MAX_PROMPT_CONTENT_LENGTH
    ? compact
    : `${compact.slice(0, AI_SCOPED_WORLD_MEMORY_MAX_PROMPT_CONTENT_LENGTH - 1).trimEnd()}…`;
}
