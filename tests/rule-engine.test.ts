import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  RuleEngine,
  WorldDomain,
  toWorldId
} from "../src/index.js";
import type { RuleContext, RuleInput } from "../src/index.js";

describe("Rule Engine", () => {
  it("allows execution when no constraints match", () => {
    const engine = RuleEngine.create();
    const decision = engine.evaluate(input(), context());

    assert.equal(decision.decision, "allow");
    assert.equal(decision.ruleId, null);
    assert.equal(decision.scope, null);
  });

  it("applies world rules before memory and persona rules", () => {
    const engine = RuleEngine.create();
    const decision = engine.evaluate(
      input({ executionType: "send-message" }),
      context({
        worldRules: [
          {
            id: "world.no-send",
            decision: "reject",
            reason: "World disallows sending.",
            when: (candidate) => candidate.executionType === "send-message"
          }
        ],
        memoryRules: [
          {
            id: "memory.needs-redaction",
            decision: "revise",
            reason: "Memory asks for redaction.",
            when: () => true
          }
        ],
        personaRules: [
          {
            id: "persona.soft-tone",
            decision: "revise",
            reason: "Persona asks for softer style.",
            when: () => true
          }
        ]
      })
    );

    assert.equal(decision.decision, "reject");
    assert.equal(decision.scope, "world");
    assert.equal(decision.ruleId, "world.no-send");
  });

  it("applies memory scope rules before persona style rules", () => {
    const engine = RuleEngine.create();
    const decision = engine.evaluate(
      input(),
      context({
        memoryRules: [
          {
            id: "memory.scope-private",
            decision: "revise",
            reason: "Memory scope requires constraint.",
            when: () => true
          }
        ],
        personaRules: [
          {
            id: "persona.shorter",
            decision: "revise",
            reason: "Persona asks for shorter style.",
            when: () => true
          }
        ]
      })
    );

    assert.equal(decision.decision, "revise");
    assert.equal(decision.scope, "memory");
    assert.equal(decision.ruleId, "memory.scope-private");
  });

  it("keeps persona rules style-only by type and returns revise", () => {
    const engine = RuleEngine.create();
    const decision = engine.evaluate(
      input(),
      context({
        personaRules: [
          {
            id: "persona.formal",
            decision: "revise",
            reason: "Persona requires formal style.",
            when: () => true
          }
        ]
      })
    );

    assert.equal(decision.decision, "revise");
    assert.equal(decision.scope, "persona");
    assert.equal(decision.reason, "Persona requires formal style.");
  });

  it("accepts optional agent trace without using it to generate content", () => {
    const engine = RuleEngine.create();
    const decision = engine.evaluate(
      input(),
      context({
        agentTrace: [
          {
            agentId: "planner",
            event: "consensus.accepted"
          }
        ]
      })
    );

    assert.equal(decision.decision, "allow");
  });
});

function input(overrides: Partial<RuleInput> = {}): RuleInput {
  return Object.freeze({
    executionType: "send-message",
    target: "chat",
    ...overrides
  });
}

function context(
  overrides: {
    readonly worldRules?: RuleContext["worldView"]["rules"];
    readonly memoryRules?: RuleContext["memory"]["scopeRules"];
    readonly personaRules?: RuleContext["persona"]["rules"];
    readonly agentTrace?: RuleContext["agentTrace"];
  } = {}
): RuleContext {
  const domain = WorldDomain.create({
    reality: {
      ownerActorId: "user",
      assistantActorId: "ovone"
    }
  });
  const state = domain.getWorldState(toWorldId("reality"));

  const base = {
    worldId: state.world.id,
    worldView: Object.freeze({
      rules: overrides.worldRules ?? [],
      facts: Object.freeze({ title: state.world.title })
    }),
    persona: Object.freeze({
      settings: Object.freeze({ tone: "plain" }),
      rules: overrides.personaRules ?? []
    }),
    memory: Object.freeze({
      snapshot: Object.freeze({ namespace: state.memoryScope.namespace }),
      scopeRules: overrides.memoryRules ?? []
    })
  };

  return Object.freeze(
    overrides.agentTrace ? { ...base, agentTrace: overrides.agentTrace } : base
  );
}
