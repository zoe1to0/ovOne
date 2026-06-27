import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { WorldDomain, toWorldId } from "../src/index.js";

describe("WorldDomain final write architecture", () => {
  it("allows ovO structural patches for world view, settings, AI contacts, and relationship graph", () => {
    const domain = createDomain();
    const worldId = toWorldId("reality");

    let state = domain.applyStructuralPatch({
      type: "world.view.adjusted",
      worldId,
      patch: { weather: "rain", era: "near-future" }
    });
    assert.equal(state.metadata.worldView.weather, "rain");

    state = domain.applyStructuralPatch({
      type: "world.settings.adjusted",
      worldId,
      settings: { memoryMode: "world-scoped" }
    });
    assert.equal(state.metadata.settings.memoryMode, "world-scoped");

    state = domain.applyStructuralPatch({
      type: "ai.contact.added",
      worldId,
      contact: {
        actorId: "guide",
        displayName: "Guide",
        kind: "assistant"
      }
    });
    assert.equal(state.contacts.find((contact) => contact.actorId === "guide")?.displayName, "Guide");

    state = domain.applyStructuralPatch({
      type: "relationship.graph.modified",
      worldId,
      groups: [
        {
          id: "core",
          title: "Core Circle",
          actorIds: ["user", "ovone", "guide"]
        }
      ]
    });
    assert.deepEqual(state.groups[0]?.actorIds, ["user", "ovone", "guide"]);
  });

  it("rejects ovO structural patches that try to override identity", () => {
    const domain = createDomain();
    const worldId = toWorldId("reality");

    assert.throws(
      () =>
        domain.applyStructuralPatch({
          type: "world.view.adjusted",
          worldId,
          patch: { displayName: "Changed" }
        }),
      /identity/
    );

    assert.throws(
      () =>
        domain.applyStructuralPatch({
          type: "ai.contact.added",
          worldId,
          contact: {
            actorId: "ovone",
            displayName: "Different ovOne",
            kind: "assistant"
          }
        }),
      /identity override/
    );
  });

  it("allows Contact Editor persona overlays without changing character identity", () => {
    const domain = createDomain();
    const state = domain.applyPersonaOverlay({
      type: "contact.persona.overlayed",
      worldId: toWorldId("reality"),
      actorId: "ovone",
      overlay: {
        tone: { warmth: "high" },
        personality: { patience: "steady" },
        relationshipPerception: { user: "trusted" }
      }
    });

    const ovone = state.contacts.find((contact) => contact.actorId === "ovone");
    assert.equal(ovone?.displayName, "ovOne");
    assert.equal(state.metadata.personaOverlays.ovone?.tone?.warmth, "high");
  });

  it("rejects Contact Editor attempts to edit identity or world structure", () => {
    const domain = createDomain();

    assert.throws(
      () =>
        domain.applyPersonaOverlay({
          type: "contact.persona.overlayed",
          worldId: toWorldId("reality"),
          actorId: "ovone",
          overlay: {
            tone: { warmth: "high" },
            displayName: "Different"
          } as never
        }),
      /Contact Editor/
    );

    assert.throws(
      () =>
        domain.applyPersonaOverlay({
          type: "contact.persona.overlayed",
          worldId: toWorldId("reality"),
          actorId: "missing",
          overlay: {
            tone: { warmth: "high" }
          }
        }),
      /not defined/
    );
  });
});

function createDomain(): WorldDomain {
  return WorldDomain.create({
    reality: {
      ownerActorId: "user",
      assistantActorId: "ovone"
    }
  });
}
