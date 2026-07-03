import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  GROUP_MEMBER_REMOVE_LAST_AI_MESSAGE,
  GROUP_MEMBER_REMOVE_WARNING_MESSAGE,
  canRemoveGroupMember,
  getForbiddenGroupMemberMutations,
  getGroupRemoveMemberWarning,
  resolveGroupAddMemberCandidates,
  validateGroupAddMemberCommand,
  validateGroupRemoveMemberCommand
} from "../src/domain/index.js";
import { toWorldId } from "../src/world-domain/index.js";
import type { WorldContact, WorldGroup } from "../src/world-domain/index.js";

const worldId = toWorldId("world:group");
const otherWorldId = toWorldId("world:other");

const contacts: readonly WorldContact[] = Object.freeze([
  contact("ai:one", "One", worldId),
  contact("ai:two", "Two", worldId),
  contact("ai:three", "Three", worldId),
  contact("human:owner", "Owner", worldId, "human"),
  contact("ai:other-world", "Other", otherWorldId)
]);

const groups: readonly WorldGroup[] = Object.freeze([
  Object.freeze({
    id: "group:one",
    title: "Group One",
    actorIds: Object.freeze(["ai:one", "ai:two"])
  }),
  Object.freeze({
    id: "group:last",
    title: "Last Member",
    actorIds: Object.freeze(["ai:one"])
  })
]);

const input = Object.freeze({
  worldId,
  contacts,
  groups
});

describe("Group Member Management contract scaffold", () => {
  it("resolves add candidates from current-world AI contacts that are not already in the group", () => {
    const candidates = resolveGroupAddMemberCandidates("group:one", input);

    assert.deepEqual(candidates.map((candidate) => candidate.worldContactId), ["ai:three"]);
    assert.equal(candidates.every((candidate) => candidate.worldId === worldId), true);
  });

  it("accepts valid add commands and rejects cross-world or existing group members", () => {
    assert.equal(validateGroupAddMemberCommand({
      worldId,
      groupChatId: "group:one",
      worldContactId: "ai:three"
    }, input).valid, true);
    assert.equal(validateGroupAddMemberCommand({
      worldId,
      groupChatId: "group:one",
      worldContactId: "ai:one"
    }, input).valid, false);
    assert.equal(validateGroupAddMemberCommand({
      worldId,
      groupChatId: "group:one",
      worldContactId: "ai:other-world"
    }, input).valid, false);
  });

  it("accepts existing group AI member removal and rejects non-members", () => {
    const command = {
      worldId,
      groupChatId: "group:one",
      worldContactId: "ai:one"
    };

    assert.equal(validateGroupRemoveMemberCommand(command, input).valid, true);
    assert.equal(canRemoveGroupMember(command, input), true);
    assert.equal(getGroupRemoveMemberWarning(command, input), GROUP_MEMBER_REMOVE_WARNING_MESSAGE);
    assert.equal(validateGroupRemoveMemberCommand({
      worldId,
      groupChatId: "group:one",
      worldContactId: "ai:three"
    }, input).valid, false);
  });

  it("rejects removing the last AI member with the dissolution warning", () => {
    const result = validateGroupRemoveMemberCommand({
      worldId,
      groupChatId: "group:last",
      worldContactId: "ai:one"
    }, input);

    assert.equal(result.valid, false);
    assert.equal(result.error, GROUP_MEMBER_REMOVE_LAST_AI_MESSAGE);
  });

  it("documents forbidden mutations outside group membership changes", () => {
    const result = validateGroupRemoveMemberCommand({
      worldId,
      groupChatId: "group:one",
      worldContactId: "ai:one",
      deleteWorldContact: true,
      privateWorldChat: "chat:ai:one",
      memoryScope: "memory:ai:one",
      deleteGroupChat: true,
      messages: [],
      groupRules: {},
      groupFiles: [],
      otherGroups: [],
      otherWorlds: [],
      GlobalAIModel: {},
      GlobalAILink: {},
      ProviderConnection: {}
    }, input);

    assert.equal(result.valid, false);
    assert.ok(result.forbiddenMutations.includes("WorldContactDeletion"));
    assert.ok(result.forbiddenMutations.includes("PrivateWorldChatDeletion"));
    assert.ok(result.forbiddenMutations.includes("WorldMemoryScopeDeletion"));
    assert.ok(result.forbiddenMutations.includes("GroupChatDeletion"));
    assert.ok(result.forbiddenMutations.includes("GroupMessageHistoryDeletion"));
    assert.ok(result.forbiddenMutations.includes("GroupRulesMutation"));
    assert.ok(result.forbiddenMutations.includes("GroupFilesMutation"));
    assert.ok(result.forbiddenMutations.includes("OtherGroups"));
    assert.ok(result.forbiddenMutations.includes("OtherWorlds"));
    assert.ok(result.forbiddenMutations.includes("GlobalAIModel"));
    assert.ok(result.forbiddenMutations.includes("GlobalAILink"));
    assert.ok(result.forbiddenMutations.includes("ProviderConnection"));
    assert.ok(getForbiddenGroupMemberMutations({ groupFiles: [] }).includes("GroupFilesMutation"));
  });
});

function contact(
  actorId: string,
  displayName: string,
  targetWorldId = worldId,
  kind: "assistant" | "human" = "assistant"
): WorldContact {
  return Object.freeze({
    worldId: targetWorldId,
    actorId,
    displayName,
    kind,
    outputMode: "Dialogue"
  }) as WorldContact;
}
