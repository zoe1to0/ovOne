import type { WorldContact, WorldGroup, WorldId } from "../world-domain/index.js";

export const GROUP_MEMBER_REMOVE_LAST_AI_MESSAGE = "移除后将解散该群";
export const GROUP_MEMBER_REMOVE_WARNING_MESSAGE = "移除后，该 AI 只会离开此群，群聊与历史消息仍会保留。";
export const GROUP_MEMBER_ADD_UNAVAILABLE_MESSAGE = "添加群成员暂未开放";
export const GROUP_MEMBER_REMOVE_UNAVAILABLE_MESSAGE = "移除群成员暂未开放";

export type GroupAddMemberCommand = Readonly<{
  readonly worldId: WorldId;
  readonly groupChatId: string;
  readonly worldContactId: string;
}>;

export type GroupRemoveMemberCommand = Readonly<{
  readonly worldId: WorldId;
  readonly groupChatId: string;
  readonly worldContactId: string;
}>;

export type GroupMemberManagementForbiddenMutation =
  | "WorldContactDeletion"
  | "PrivateWorldChatDeletion"
  | "WorldMemoryScopeDeletion"
  | "GroupChatDeletion"
  | "GroupMessageHistoryDeletion"
  | "GroupRulesMutation"
  | "GroupFilesMutation"
  | "OtherGroups"
  | "OtherWorlds"
  | "GlobalAIModel"
  | "GlobalAILink"
  | "ProviderConnection"
  | "UnknownField";

export type GroupMemberCandidate = Readonly<{
  readonly worldId: WorldId;
  readonly worldContactId: string;
  readonly displayName: string;
}>;

export type GroupMemberManagementInput = Readonly<{
  readonly worldId: WorldId;
  readonly contacts: readonly WorldContact[];
  readonly groups: readonly WorldGroup[];
}>;

export type GroupMemberCommandValidation<TCommand> = Readonly<{
  readonly valid: boolean;
  readonly command: TCommand | null;
  readonly error: string | null;
  readonly forbiddenMutations: readonly GroupMemberManagementForbiddenMutation[];
}>;

const ROOT_ALLOWED_KEYS = new Set(["worldId", "groupChatId", "worldContactId"]);

const FORBIDDEN_KEY_MAP: Readonly<Record<string, GroupMemberManagementForbiddenMutation>> = Object.freeze({
  deleteWorldContact: "WorldContactDeletion",
  WorldContact: "WorldContactDeletion",
  privateChat: "PrivateWorldChatDeletion",
  privateWorldChat: "PrivateWorldChatDeletion",
  memory: "WorldMemoryScopeDeletion",
  memoryScope: "WorldMemoryScopeDeletion",
  deleteGroupChat: "GroupChatDeletion",
  groupChatDeletion: "GroupChatDeletion",
  messages: "GroupMessageHistoryDeletion",
  history: "GroupMessageHistoryDeletion",
  groupRules: "GroupRulesMutation",
  rulesText: "GroupRulesMutation",
  groupFiles: "GroupFilesMutation",
  files: "GroupFilesMutation",
  otherGroups: "OtherGroups",
  groups: "OtherGroups",
  otherWorlds: "OtherWorlds",
  worldMetadata: "OtherWorlds",
  GlobalAIModel: "GlobalAIModel",
  GlobalAILink: "GlobalAILink",
  ProviderConnection: "ProviderConnection",
  providerConnection: "ProviderConnection"
});

export function resolveGroupAddMemberCandidates(
  groupChatId: string,
  input: GroupMemberManagementInput
): readonly GroupMemberCandidate[] {
  const group = findGroup(groupChatId, input);
  if (!group) {
    return Object.freeze([]);
  }
  const existing = new Set(group.actorIds);
  return Object.freeze(input.contacts
    .filter((contact) => contact.worldId === input.worldId)
    .filter((contact) => contact.kind === "assistant")
    .filter((contact) => !existing.has(contact.actorId))
    .map((contact) => Object.freeze({
      worldId: contact.worldId,
      worldContactId: contact.actorId,
      displayName: contact.displayName
    })));
}

export function validateGroupAddMemberCommand(
  command: unknown,
  input: GroupMemberManagementInput
): GroupMemberCommandValidation<GroupAddMemberCommand> {
  const forbiddenMutations = getForbiddenGroupMemberMutations(command);
  const candidate = normalizeGroupMemberCommand(command);
  const group = candidate ? findGroup(candidate.groupChatId, input) : null;
  const contact = candidate ? findContact(candidate.worldContactId, input) : null;
  const valid = Boolean(
    candidate &&
      candidate.worldId === input.worldId &&
      group &&
      contact &&
      contact.worldId === input.worldId &&
      contact.kind === "assistant" &&
      !group.actorIds.includes(contact.actorId) &&
      forbiddenMutations.length === 0
  );
  return Object.freeze({
    valid,
    command: valid ? candidate : null,
    error: valid ? null : "GroupMemberManagement: invalid add member command.",
    forbiddenMutations
  });
}

export function validateGroupRemoveMemberCommand(
  command: unknown,
  input: GroupMemberManagementInput
): GroupMemberCommandValidation<GroupRemoveMemberCommand> {
  const forbiddenMutations = getForbiddenGroupMemberMutations(command);
  const candidate = normalizeGroupMemberCommand(command);
  const group = candidate ? findGroup(candidate.groupChatId, input) : null;
  const contact = candidate ? findContact(candidate.worldContactId, input) : null;
  const lastMember = Boolean(group && contact && isLastGroupAiMember(group, input, contact.actorId));
  const valid = Boolean(
    candidate &&
      candidate.worldId === input.worldId &&
      group &&
      contact &&
      contact.worldId === input.worldId &&
      contact.kind === "assistant" &&
      group.actorIds.includes(contact.actorId) &&
      !lastMember &&
      forbiddenMutations.length === 0
  );
  return Object.freeze({
    valid,
    command: valid ? candidate : null,
    error: valid ? null : lastMember ? GROUP_MEMBER_REMOVE_LAST_AI_MESSAGE : "GroupMemberManagement: invalid remove member command.",
    forbiddenMutations
  });
}

export function canRemoveGroupMember(command: GroupRemoveMemberCommand, input: GroupMemberManagementInput): boolean {
  return validateGroupRemoveMemberCommand(command, input).valid;
}

export function getGroupRemoveMemberWarning(command: GroupRemoveMemberCommand, input: GroupMemberManagementInput): string {
  const validation = validateGroupRemoveMemberCommand(command, input);
  return validation.valid ? GROUP_MEMBER_REMOVE_WARNING_MESSAGE : validation.error ?? GROUP_MEMBER_REMOVE_WARNING_MESSAGE;
}

export function getForbiddenGroupMemberMutations(command: unknown): readonly GroupMemberManagementForbiddenMutation[] {
  const forbidden = new Set<GroupMemberManagementForbiddenMutation>();
  collectForbiddenFields(command, forbidden, ROOT_ALLOWED_KEYS);
  return Object.freeze([...forbidden]);
}

function normalizeGroupMemberCommand(command: unknown): GroupAddMemberCommand | GroupRemoveMemberCommand | null {
  if (!isRecord(command)) {
    return null;
  }
  const { worldId, groupChatId, worldContactId } = command;
  if (typeof worldId !== "string" || typeof groupChatId !== "string" || typeof worldContactId !== "string") {
    return null;
  }
  return Object.freeze({
    worldId: worldId as WorldId,
    groupChatId,
    worldContactId
  });
}

function findGroup(groupChatId: string, input: GroupMemberManagementInput): WorldGroup | null {
  return input.groups.find((group) => group.id === groupChatId) ?? null;
}

function findContact(worldContactId: string, input: GroupMemberManagementInput): WorldContact | null {
  return input.contacts.find((contact) => contact.actorId === worldContactId) ?? null;
}

function isLastGroupAiMember(group: WorldGroup, input: GroupMemberManagementInput, removedActorId: string): boolean {
  const remainingAiMemberCount = group.actorIds
    .filter((actorId) => actorId !== removedActorId)
    .filter((actorId) => input.contacts.some((contact) => contact.actorId === actorId && contact.kind === "assistant"))
    .length;
  return remainingAiMemberCount === 0;
}

function collectForbiddenFields(
  value: unknown,
  forbidden: Set<GroupMemberManagementForbiddenMutation>,
  allowedKeys: ReadonlySet<string> | null
): void {
  if (!isRecord(value)) {
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    const mapped = FORBIDDEN_KEY_MAP[key];
    if (mapped) {
      forbidden.add(mapped);
    } else if (allowedKeys && !allowedKeys.has(key)) {
      forbidden.add("UnknownField");
    }
    collectForbiddenFields(child, forbidden, null);
  }
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
