import type {
  MemoryScopeRule,
  PersonaRule,
  RuleContext,
  RuleDecision,
  RuleEngineInstance,
  RuleInput,
  RuleScope,
  WorldRule
} from "./types.js";

export const RuleEngine = Object.freeze({
  create
});

export function create(): RuleEngineInstance {
  return Object.freeze({
    evaluate
  });
}

export function evaluate(input: RuleInput, context: RuleContext): RuleDecision {
  return (
    evaluateRuleGroup("world", context.worldView.rules, input, context) ??
    evaluateRuleGroup("memory", context.memory.scopeRules, input, context) ??
    evaluateRuleGroup("persona", context.persona.rules, input, context) ??
    allow()
  );
}

function evaluateRuleGroup(
  scope: "world",
  rules: readonly WorldRule[],
  input: RuleInput,
  context: RuleContext
): RuleDecision | null;
function evaluateRuleGroup(
  scope: "memory",
  rules: readonly MemoryScopeRule[],
  input: RuleInput,
  context: RuleContext
): RuleDecision | null;
function evaluateRuleGroup(
  scope: "persona",
  rules: readonly PersonaRule[],
  input: RuleInput,
  context: RuleContext
): RuleDecision | null;
function evaluateRuleGroup(
  scope: RuleScope,
  rules: readonly (WorldRule | MemoryScopeRule | PersonaRule)[],
  input: RuleInput,
  context: RuleContext
): RuleDecision | null {
  for (const rule of rules) {
    if (rule.when(input, context)) {
      return Object.freeze({
        decision: rule.decision,
        ruleId: rule.id,
        scope,
        reason: rule.reason
      });
    }
  }
  return null;
}

function allow(): RuleDecision {
  return Object.freeze({
    decision: "allow",
    ruleId: null,
    scope: null,
    reason: null
  });
}
