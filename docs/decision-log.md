# ovOne Decision Log

## 2026-06-27: Behavior Specification phase begins

Decision: ovOne enters the Behavior Specification phase before behavior refactoring.

Rules:

- `docs/behavior-spec.md` defines the target Behavior Registry contract.
- Every UI event must map to exactly one explicit action in the target model.
- Generic `MENU_ACTION` is forbidden in the target model and must be replaced by explicit actions.
- Views must dispatch actions only; Behavior Registry owns action execution in the target model.
- No product feature implementation is included in this decision.
- Product rules remain unchanged.

## 2026-06-27: v0.1 freeze review accepts documented foundation state

Decision: ovOne v0.1 is accepted as a documented foundation baseline for the next Behavior Registry phase.

Rules:

- No product rules changed in the freeze review.
- `v0.1` and `v0.1-foundation` are baseline markers for the audited foundation state.
- Behavior Registry work must start from the documented current implementation, not from assumed final architecture.
- Existing gaps such as placeholder `MENU_ACTION`, identity-only `ViewRouter`, heuristic chat/contact mapping, and unbound decorative controls remain known issues.

## 2026-06-27: v0.1 engineering baseline is tagged from audited implementation state

Decision: `v0.1` marks the first GitHub-backed engineering baseline.

Rules:

- The source of truth for current implementation state is `docs/engineering-spec.md`.
- The production browser UI entry is `src/main.ts -> mountChatShell(document.body)`.
- `src/platform/index.ts` exports only `mountChatShell` for production UI mounting.
- Legacy UI mounts remain present only as disabled compatibility stubs that throw.
- Known UI/runtime gaps remain documented in `docs/known-issues.md` and are not considered implemented behavior.

## 2026-06-27: World-scoped data model is frozen

Decision: World-scoped data model is frozen.

Rules:

- `GlobalAILink` is global.
- `WorldContact` is per-world.
- `Chat` is per-world.
- `Memory` is per-world.
- World switching lands on Chats list.
- Me is global.

## Maintenance Rule

After every Codex implementation task, update:

- `docs/engineering-spec.md`
- `docs/known-issues.md`
- `docs/decision-log.md` if a product or engineering decision changed

No future implementation task is complete until documentation is updated.
