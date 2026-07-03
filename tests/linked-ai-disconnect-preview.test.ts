import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  LINKED_AI_DISCONNECT_GROUP_HISTORY_NOTE,
  LINKED_AI_DISCONNECT_GROUP_MEMBERSHIP_NOTE,
  LINKED_AI_DISCONNECT_SCOPE_NOTE,
  buildLinkedAIDisconnectPreview
} from "../src/domain/index.js";
import type { WorldScopedSnapshot } from "../src/domain/index.js";
import { toWorldId } from "../src/world-domain/index.js";

describe("Me Settings linked AI disconnect preview", () => {
  it("lists affected worlds and selected AI private cleanup targets only", () => {
    const snapshot = createSnapshot();
    const before = JSON.stringify(toPlain(snapshot));

    const preview = buildLinkedAIDisconnectPreview({ globalAILinkId: "link:target" }, snapshot);

    assert.equal(preview.readOnly, true);
    assert.equal(preview.globalAILinkId, "link:target");
    assert.equal(preview.globalAIModelId, "model:target");
    assert.deepEqual(preview.affectedWorlds.map((world) => world.worldId), [realityWorldId, customWorldId]);
    assert.equal(preview.affectedWorlds.some((world) => world.worldId === absentWorldId), false);
    assert.deepEqual(preview.affectedWorlds[0]?.privateContactIds, ["reality-target-contact"]);
    assert.deepEqual(preview.affectedWorlds[0]?.privateChatIds, ["reality-target-chat"]);
    assert.deepEqual(preview.affectedWorlds[0]?.memoryScopeIds, ["reality-target-contact", "reality-target-chat"]);
    assert.deepEqual(preview.affectedWorlds[1]?.privateContactIds, ["custom-target-contact"]);
    assert.deepEqual(preview.affectedWorlds[1]?.privateChatIds, ["custom-target-chat"]);
    assert.deepEqual(preview.affectedWorlds[1]?.memoryScopeIds, ["custom-target-contact", "custom-target-chat"]);
    assert.equal(
      preview.affectedWorlds.every((world) => world.privateContactIds.every((id) => !id.includes("other"))),
      true
    );
    assert.equal(JSON.stringify(toPlain(snapshot)), before);
  });

  it("surfaces group membership removal as future and preserves group history", () => {
    const preview = buildLinkedAIDisconnectPreview({ globalAILinkId: "link:target" }, createSnapshot());

    const reality = preview.affectedWorlds.find((world) => world.worldId === realityWorldId);
    assert.equal(reality?.groupMemberRemovalStatus, "not-supported-yet");
    assert.equal(reality?.groupMembershipLabel, "将来仅移除群成员身份");
    assert.ok(preview.notes.includes(LINKED_AI_DISCONNECT_SCOPE_NOTE));
    assert.ok(preview.notes.includes(LINKED_AI_DISCONNECT_GROUP_MEMBERSHIP_NOTE));
    assert.ok(preview.notes.includes(LINKED_AI_DISCONNECT_GROUP_HISTORY_NOTE));
    assert.match(preview.notes.join("\n"), /group chats and historical group messages must be preserved/);
  });
});

const realityWorldId = toWorldId("reality");
const customWorldId = toWorldId("custom:target-world");
const absentWorldId = toWorldId("custom:absent-world");

function createSnapshot(): WorldScopedSnapshot {
  return {
    currentWorldId: realityWorldId,
    globalAIModels: [
      { modelId: "model:target", displayName: "Target AI" },
      { modelId: "model:other", displayName: "Other AI" }
    ],
    globalAILinks: [
      { linkId: "link:target", modelId: "model:target", connectedAt: 1, status: "connected" },
      { linkId: "link:other", modelId: "model:other", connectedAt: 2, status: "connected" }
    ],
    worlds: new Map([
      [
        realityWorldId,
        {
          world: world(realityWorldId, "Reality", "reality"),
          contacts: [
            contact(realityWorldId, "reality-target-contact", "actor:target:reality", "model:target"),
            contact(realityWorldId, "reality-other-contact", "actor:other:reality", "model:other")
          ],
          chats: [
            chat(realityWorldId, "reality-target-chat", "reality-target-contact"),
            chat(realityWorldId, "reality-other-chat", "reality-other-contact")
          ],
          groups: [{ id: "reality-group", title: "Reality Group", actorIds: ["actor:target:reality", "actor:other:reality"] }],
          memory: {
            worldId: realityWorldId,
            namespace: "memory:reality",
            contactMemoryKeys: ["reality-target-contact", "reality-other-contact"],
            chatMemoryKeys: ["reality-target-chat", "reality-other-chat"]
          }
        }
      ],
      [
        customWorldId,
        {
          world: world(customWorldId, "Target World", "custom"),
          contacts: [
            contact(customWorldId, "custom-target-contact", "actor:target:custom", "model:target"),
            contact(customWorldId, "custom-other-contact", "actor:other:custom", "model:other")
          ],
          chats: [
            chat(customWorldId, "custom-target-chat", "custom-target-contact"),
            chat(customWorldId, "custom-other-chat", "custom-other-contact")
          ],
          groups: [],
          memory: {
            worldId: customWorldId,
            namespace: "memory:custom",
            contactMemoryKeys: ["custom-target-contact", "custom-other-contact"],
            chatMemoryKeys: ["custom-target-chat", "custom-other-chat"]
          }
        }
      ],
      [
        absentWorldId,
        {
          world: world(absentWorldId, "Absent World", "custom"),
          contacts: [contact(absentWorldId, "absent-other-contact", "actor:other:absent", "model:other")],
          chats: [chat(absentWorldId, "absent-other-chat", "absent-other-contact")],
          groups: [],
          memory: {
            worldId: absentWorldId,
            namespace: "memory:absent",
            contactMemoryKeys: ["absent-other-contact"],
            chatMemoryKeys: ["absent-other-chat"]
          }
        }
      ]
    ])
  };
}

function world(worldId: typeof realityWorldId, title: string, type: "reality" | "custom") {
  return {
    worldId,
    title,
    type,
    lifecycle: "active" as const,
    ownerActorId: "user",
    assistantActorId: "ovo",
    worldView: {},
    settings: {}
  };
}

function contact(worldId: typeof realityWorldId, contactId: string, actorId: string, baseModelId: string) {
  return {
    worldId,
    contactId,
    actorId,
    baseModelId,
    displayName: contactId,
    kind: "assistant" as const,
    outputMode: "Dialogue" as const,
    persona: {}
  };
}

function chat(worldId: typeof realityWorldId, chatId: string, contactId: string) {
  return {
    worldId,
    chatId,
    title: chatId,
    participantContactIds: [contactId],
    messages: []
  };
}

function toPlain(snapshot: WorldScopedSnapshot) {
  return {
    ...snapshot,
    worlds: [...snapshot.worlds.entries()]
  };
}
