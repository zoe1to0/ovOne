import type { WorldId } from "../world-domain/index.js";

export type RuleDecisionKind = "allow" | "reject" | "revise";
export type RuleScope = "world" | "memory" | "persona";

export type RuleDecision = Readonly<{
  readonly decision: RuleDecisionKind;
  readonly ruleId: string | null;
  readonly scope: RuleScope | null;
  readonly reason: string | null;
}>;

export type RuleInput = Readonly<{
  readonly executionType: string;
  readonly target: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}>;

export type WorldRule = Readonly<{
  readonly id: string;
  readonly decision: Exclude<RuleDecisionKind, "allow">;
  readonly reason: string;
  readonly when: RulePredicate;
}>;

export type MemoryScopeRule = Readonly<{
  readonly id: string;
  readonly decision: Exclude<RuleDecisionKind, "allow">;
  readonly reason: string;
  readonly when: RulePredicate;
}>;

export type PersonaRule = Readonly<{
  readonly id: string;
  readonly decision: "revise";
  readonly reason: string;
  readonly when: RulePredicate;
}>;

export type RulePredicate = (input: RuleInput, context: RuleContext) => boolean;

export type RuleContext = Readonly<{
  readonly worldId: WorldId;
  readonly worldView: Readonly<{
    readonly rules: readonly WorldRule[];
    readonly facts?: Readonly<Record<string, unknown>>;
  }>;
  readonly persona: Readonly<{
    readonly settings: Readonly<Record<string, unknown>>;
    readonly rules: readonly PersonaRule[];
  }>;
  readonly memory: Readonly<{
    readonly snapshot: Readonly<Record<string, unknown>>;
    readonly scopeRules: readonly MemoryScopeRule[];
  }>;
  readonly agentTrace?: readonly Readonly<{
    readonly agentId: string;
    readonly event: string;
    readonly metadata?: Readonly<Record<string, unknown>>;
  }>[];
}>;

export type RuleEngineInstance = Readonly<{
  readonly evaluate: (input: RuleInput, context: RuleContext) => RuleDecision;
}>;
