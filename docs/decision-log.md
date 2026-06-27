# ovOne Decision Log

## 2026-06-27: World-scoped data model foundation added

Decision: ovOne now has a typed world-scoped data model foundation and read-only resolver layer.

Rules:

- No product rules changed.
- `src/domain/world-model.ts` defines `GlobalAIModel`, `GlobalAILink`, `World`, `WorldContact`, `WorldChat`, `WorldMemoryScope`, and `WorldScopedSnapshot`.
- `src/domain/world-scope-resolver.ts` resolves current world, world contacts, and world chats without mutating runtime state.
- `SemanticMobileState` now stores `currentWorldId`.
- Chats and Contacts read through the current world resolver.
- Me remains global and does not read through the world resolver.
- `SWITCH_WORLD` is an explicit action scaffold that lands on `CHAT_LIST` and clears active chat/contact state.
- No create world UI, real memory engine, real AI provider integration, or world persistence migration is included in this decision.

## 2026-06-27: Flow Executor handles submit-message runtime effect

Decision: ovOne now separates UI state transitions from runtime side effects for `SUBMIT_MESSAGE`.

Rules:

- No product rules changed.
- Behavior Registry remains UI state-transition only.
- Flow Executor owns runtime effects.
- For now, Flow Executor handles only `SUBMIT_MESSAGE`.
- `SUBMIT_MESSAGE` preserves existing behavior by calling `shell.sendMessage(text)`, syncing `state.view`, `activeChatId`, and `activeView`.
- `TEXT_INPUT` remains renderless.
- Disabled explicit actions remain no-op and do not execute runtime effects.

## 2026-06-27: ViewRouter owns activeView fallback

Decision: Unknown `activeView` fallback now belongs to ViewRouter route resolution, not `renderShellPage`.

Rules:

- No product rules changed.
- `ViewRouter.resolve(...)` returns `{ route, fallbackApplied, issue? }`.
- Known routes resolve with `fallbackApplied: false`.
- Unknown routes resolve to `CHAT_LIST` with `fallbackApplied: true`.
- `renderShellPage(...)` consumes the resolved route object and only maps known routes to view factories.
- Unknown routes must not render Me.

## 2026-06-27: Behavior Registry scaffold implemented

Decision: ovOne now routes mobile ChatShell UI actions through a Behavior Registry scaffold.

Rules:

- No product rules changed.
- `src/platform/behavior-registry.ts` owns UI action -> local UI state transitions.
- `InteractionController` remains the dispatcher and executes only explicit actions.
- `OPEN_CHAT` is one action that sets `activeChatId` and `activeView = CHAT_VIEW`.
- Overlays use explicit open/close actions, not toggle actions.
- Unknown `activeView` falls back to `CHAT_LIST` as temporary fallback behavior.
- Generic `MENU_ACTION` is removed from the active mobile UI action model.
- Former menu intents are explicit disabled/no-op actions until product behavior is implemented.
- Runtime effects and autosave remain outside Behavior Registry scope.

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
