import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveCurrentWorld,
  resolveWorldChats,
  resolveWorldContacts
} from "../src/domain/index.js";
import type { WorldChat, WorldContact, WorldScopedSnapshot } from "../src/domain/index.js";
import { createBehaviorRegistry } from "../src/platform/behavior-registry.js";
import type { SemanticMobileState } from "../src/platform/behavior-registry.js";
import { toWorldId } from "../src/world-domain/index.js";

describe("World scoped data model foundation", () => {
  it("resolves Reality contacts and chats independently from custom worlds", () => {
    const snapshot = createWorldScopedSnapshot();

    assert.deepEqual(worldContacts(snapshot.currentWorldId, snapshot).map((contact) => contact.contactId), [
      "reality-contact-1",
      "reality-contact-2"
    ]);
    assert.deepEqual(worldChats(snapshot.currentWorldId, snapshot).map((chat) => chat.chatId), [
      "reality-chat-1",
      "reality-chat-2"
    ]);
    assert.deepEqual(worldContacts(customWorldId, snapshot).map((contact) => contact.contactId), [
      "custom-contact-1"
    ]);
    assert.deepEqual(worldChats(customWorldId, snapshot).map((chat) => chat.chatId), [
      "custom-chat-1"
    ]);
  });

  it("keeps the same base model as separate WorldContact instances per world", () => {
    const snapshot = createWorldScopedSnapshot();
    const realityContact = worldContacts(realityWorldId, snapshot).find(
      (contact) => contact.baseModelId === "model:gpt-dialogue"
    );
    const customContact = worldContacts(customWorldId, snapshot).find(
      (contact) => contact.baseModelId === "model:gpt-dialogue"
    );

    assert.ok(realityContact);
    assert.ok(customContact);
    assert.equal(realityContact.baseModelId, customContact.baseModelId);
    assert.notEqual(realityContact.contactId, customContact.contactId);
    assert.notEqual(realityContact.worldId, customContact.worldId);
  });

  it("does not auto-add newly linked AI models to custom world contacts", () => {
    const snapshot = createWorldScopedSnapshot();

    assert.ok(snapshot.globalAILinks.some((link) => link.modelId === "model:newly-linked"));
    assert.equal(worldContacts(customWorldId, snapshot).some((contact) => contact.baseModelId === "model:newly-linked"), false);
  });

  it("resolves current world from central currentWorldId only", () => {
    const snapshot = createWorldScopedSnapshot();

    assert.equal(resolvedWorldId(resolveCurrentWorld({ currentWorldId: realityWorldId }, snapshot)), realityWorldId);
    assert.equal(resolvedWorldId(resolveCurrentWorld({ currentWorldId: customWorldId }, snapshot)), customWorldId);
    assert.equal(resolveCurrentWorld({ currentWorldId: toWorldId("missing") }, snapshot), null);
  });

  it("switch world action lands on CHAT_LIST and clears world-local selection state", () => {
    const registry = createBehaviorRegistry();
    const state: SemanticMobileState = {
      activeView: "CHAT_VIEW",
      currentWorldId: realityWorldId,
      activeChatId: "reality-chat-1",
      overlay: "chat-menu",
      selectedContactActorId: "actor:old",
      selectedWorldIdForEditing: null,
      composerMode: "text",
      inputDraft: "",
      settingsOpen: true,
      createWorldDraft: null,
      worldEditorDraft: null,
      contactDetailDraft: null,
      worldCreationTransition: null,
      splashVisible: false,
      view: {} as SemanticMobileState["view"]
    };

    const result = registry.execute({ type: "SWITCH_WORLD", worldId: customWorldId }, state);

    assert.equal(result.shouldRender, true);
    assert.equal(state.currentWorldId, customWorldId);
    assert.equal(state.activeView, "CHAT_LIST");
    assert.equal(state.activeChatId, null);
    assert.equal(state.selectedContactActorId, null);
    assert.equal(state.overlay, null);
    assert.equal(state.settingsOpen, false);
  });
});

const realityWorldId = toWorldId("reality");
const customWorldId = toWorldId("custom:studio");

function worldContacts(worldId: typeof realityWorldId, snapshot: WorldScopedSnapshot): readonly WorldContact[] {
  return resolveWorldContacts(worldId, snapshot) as readonly WorldContact[];
}

function worldChats(worldId: typeof realityWorldId, snapshot: WorldScopedSnapshot): readonly WorldChat[] {
  return resolveWorldChats(worldId, snapshot) as readonly WorldChat[];
}

function resolvedWorldId(world: ReturnType<typeof resolveCurrentWorld>): typeof realityWorldId | null {
  if (!world) {
    return null;
  }
  return "worldId" in world ? world.worldId : world.id;
}

function createWorldScopedSnapshot(): WorldScopedSnapshot {
  return {
    currentWorldId: realityWorldId,
    globalAIModels: [
      { modelId: "model:gpt-dialogue", displayName: "Dialogue Model" },
      { modelId: "model:qa", displayName: "QA Model" },
      { modelId: "model:newly-linked", displayName: "New Linked Model" }
    ],
    globalAILinks: [
      { linkId: "link:dialogue", modelId: "model:gpt-dialogue", connectedAt: 1, status: "connected" },
      { linkId: "link:qa", modelId: "model:qa", connectedAt: 2, status: "connected" },
      { linkId: "link:new", modelId: "model:newly-linked", connectedAt: 3, status: "connected" }
    ],
    worlds: new Map([
      [
        realityWorldId,
        {
          world: {
            worldId: realityWorldId,
            title: "Reality",
            type: "reality",
            lifecycle: "active",
            ownerActorId: "user",
            assistantActorId: "ovo",
            worldView: Object.freeze({ immutable: true }),
            settings: Object.freeze({})
          },
          contacts: [
            {
              worldId: realityWorldId,
              contactId: "reality-contact-1",
              actorId: "actor:reality-friend",
              baseModelId: "model:gpt-dialogue",
              displayName: "Reality Friend",
              kind: "assistant",
              outputMode: "Dialogue",
              persona: Object.freeze({ tone: "gentle" })
            },
            {
              worldId: realityWorldId,
              contactId: "reality-contact-2",
              actorId: "actor:reality-qa",
              baseModelId: "model:qa",
              displayName: "Reality QA",
              kind: "assistant",
              outputMode: "QA",
              persona: Object.freeze({ tone: "direct" })
            }
          ],
          chats: [
            {
              worldId: realityWorldId,
              chatId: "reality-chat-1",
              title: "Reality Friend",
              participantContactIds: ["reality-contact-1"],
              messages: []
            },
            {
              worldId: realityWorldId,
              chatId: "reality-chat-2",
              title: "Reality QA",
              participantContactIds: ["reality-contact-2"],
              messages: []
            }
          ],
          groups: [],
          memory: {
            worldId: realityWorldId,
            namespace: "memory:reality",
            contactMemoryKeys: ["reality-contact-1"],
            chatMemoryKeys: ["reality-chat-1"]
          }
        }
      ],
      [
        customWorldId,
        {
          world: {
            worldId: customWorldId,
            title: "Studio",
            type: "custom",
            lifecycle: "active",
            ownerActorId: "user",
            assistantActorId: "ovo",
            worldView: Object.freeze({ genre: "studio" }),
            settings: Object.freeze({})
          },
          contacts: [
            {
              worldId: customWorldId,
              contactId: "custom-contact-1",
              actorId: "actor:studio-friend",
              baseModelId: "model:gpt-dialogue",
              displayName: "Studio Friend",
              kind: "assistant",
              outputMode: "Dialogue",
              persona: Object.freeze({ role: "studio-only" })
            }
          ],
          chats: [
            {
              worldId: customWorldId,
              chatId: "custom-chat-1",
              title: "Studio Friend",
              participantContactIds: ["custom-contact-1"],
              messages: []
            }
          ],
          groups: [],
          memory: {
            worldId: customWorldId,
            namespace: "memory:studio",
            contactMemoryKeys: ["custom-contact-1"],
            chatMemoryKeys: ["custom-chat-1"]
          }
        }
      ]
    ])
  };
}
