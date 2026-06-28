# ovOne Decision Log

## 2026-06-28: World Bootstrap Planner scaffold added

Decision: Create World now produces a deterministic bootstrap plan after custom world creation.

Rules:

- `src/domain/world-bootstrap-planner.ts` owns bootstrap planning.
- The planner returns `WorldBootstrapPlan` with `privateMessages`, `groups`, `roleMode`, and `sourceType`.
- Non-empty role worlds plan one private initial message per selected AI contact.
- Empty Role worlds plan zero private initial messages and zero groups.
- Group plans are capped at two and are never created just because many AI are selected.
- The create-world service stores the plan in world metadata for later runtime work.
- The planner does not call an LLM, generate message text, create memory, create messages, or create group chats.

## 2026-06-27: Create World validation hardened

Decision: Existing Create World confirmation now uses an explicit validation and sanitization gate before runtime creation.

Rules:

- Missing world name sets local `createWorldDraft.validationError = "请输入世界名称"`.
- Missing world name does not create a world and keeps the user on the current create route.
- Registry confirm actions sanitize random role slots and clear invalid `selectedUserRoleSlotId` values.
- Flow Executor repeats validation/sanitization before calling the create-world service.
- Successful create behavior is unchanged.
- Broader validation, real role generation, loading animation, AI initial messages, and auto group creation remain out of scope.

## 2026-06-27: Random Role detail scaffold corrected

Decision: Detailed Edit Random Role mode now collects explicit role slots instead of the earlier flat notes scaffold.

This supersedes the earlier flat placeholder behavior.

Rules:

- Random Role detail mode generates scaffold role slots equal to user plus selected AI count.
- Each random-role slot stores `roleName` and `personaNotes`.
- `selectedUserRoleSlotId` may mark exactly one slot as the user's role.
- Selecting the already selected user role slot clears the selection, allowing all participants to be randomly assigned later.
- Slot data is scaffold metadata only and does not perform real random role assignment.
- Confirming a valid Detailed Edit draft still creates a custom world through the existing create-world service and switches to the new world `CHAT_LIST`.
- Fixed Role and Empty Role behavior remain unchanged.
- Real random role generation, AI initial messages, auto group creation, and detailed validation remain out of scope.

## 2026-06-27: Create World Detailed Edit scaffold fields added

Decision: Create World Detailed Edit is now an actionable scaffold route instead of a placeholder-only route.

This supersedes earlier notes that described Detailed Edit as non-creating placeholder behavior. The later Random Role detail scaffold decision supersedes the early flat Random Role placeholder listed here.

Rules:

- `CREATE_WORLD_DETAIL_EDIT` renders world name and worldview text inputs from the same `createWorldDraft` state.
- Detail edit role modes are `random-role`, `fixed-role`, and `empty-role`.
- Random Role detail mode now uses explicit role slots.
- Fixed Role detail mode exposes placeholder role rows for the user and selected AI friends.
- Empty Role detail mode explains that no active initial reaction is triggered.
- `UPDATE_CREATE_WORLD_DETAIL`, `UPDATE_CREATE_WORLD_FIXED_ROLE`, and `SELECT_DETAIL_ROLE_MODE` mutate local draft state only.
- `CONFIRM_CREATE_WORLD_DETAIL` creates a custom world only when the world name is non-empty.
- Detailed Edit confirmation uses the existing shell create-world boundary and then switches to the new world `CHAT_LIST`.
- Empty Role stores role assignment as `none`.
- Random Role and Fixed Role store placeholder role assignment metadata only; no real role generation is implemented.
- Document parsing, AI initial messages, auto group creation, and real detailed role behavior remain out of scope.

## 2026-06-27: Create World draft becomes page route

Decision: Create World draft navigation now uses explicit page routes instead of an overlay panel.

Rules:

- `+ -> 创建世界` dispatches `OPEN_CREATE_WORLD_DRAFT`.
- `OPEN_CREATE_WORLD_DRAFT` initializes draft state and routes to `CREATE_WORLD_DRAFT`.
- The draft page is a staged vertical flow with world name, worldview area, attached source controls, official quick-world chips, AI selection, and next mode.
- Official quick-world options are chips, not large cards.
- Detailed Edit dispatches `OPEN_CREATE_WORLD_DETAIL_EDIT`.
- `OPEN_CREATE_WORLD_DETAIL_EDIT` routes to `CREATE_WORLD_DETAIL_EDIT`, a placeholder scaffold page.
- Detailed Edit does not create a world and does not bounce back to the draft start.
- Random Role confirmation preserves the existing create/switch/land-on-CHAT_LIST behavior.
- No real detailed edit fields, loading animation, random role generation, document parsing, AI initial messages, or auto group creation are included.

## 2026-06-27: Minimal Random Role Create World flow added

Decision: Create World confirmation now creates a custom world only for valid Random Role drafts.

Rules:

- `CONFIRM_CREATE_WORLD_DRAFT` remains a Behavior Registry state action and does not mutate WorldDomain directly.
- Flow Executor owns the random-role creation runtime effect.
- The shell exposes `createWorldFromDraft(draft)` as the runtime boundary for controlled world creation.
- Creation commits a new custom `WorldState` through WorldDomain, appends the world to `availableWorlds`, switches into it, and lands on `CHAT_LIST`.
- Successful creation clears `activeChatId`, `selectedContactActorId`, overlay/settings state, and `createWorldDraft`.
- Selected AI ids become independent world-scoped contacts and chats in the new world.
- Reality remains unchanged.
- Blank-world creation keeps original selected AI display names and stores role assignment as `none`.
- Non-blank source creation stores role assignment as `placeholder`; no real role generation is implemented.
- `nextMode = "detailed-edit"` does not create a world yet.
- Missing world name does not create a world yet.
- Document parsing, AI initial messages, auto group creation, and detailed edit remain out of scope.

## 2026-06-27: Create World draft scaffold added

Decision: Create World now opens a local draft scaffold instead of being a disabled/no-op menu action.

Rules:

- `+ -> Create World` dispatches `OPEN_CREATE_WORLD_DRAFT`.
- Create World draft state is stored in `SemanticMobileState.createWorldDraft`.
- Draft fields are `worldName`, `worldviewSourceType`, `worldviewText`, `selectedAIModelIds`, and `nextMode`.
- `UPDATE_CREATE_WORLD_DRAFT` updates draft text fields.
- `SELECT_WORLDVIEW_SOURCE` updates the worldview source option.
- `TOGGLE_CREATE_WORLD_AI` updates selected AI ids in draft state.
- `SELECT_CREATE_WORLD_NEXT_MODE` updates the future next mode.
- `CONFIRM_CREATE_WORLD_DRAFT` was initially scaffolded without creation; it is now implemented only for valid Random Role drafts in the later Minimal Random Role Create World decision.
- `CANCEL_CREATE_WORLD_DRAFT` initially cleared the local draft and closed the overlay; the current routed flow clears the draft and returns to `CHAT_LIST`.
- No world creation, world switching, role generation, detailed edit page, memory editing, AI initial messages, group creation, or world data model change is included in this decision.

## 2026-06-27: ovO world-button menu hierarchy added

Decision: The ovO chat world-button now opens a first-level world menu before world switching or edit selection.

Rules:

- Clicking `📍 {currentWorldName}` dispatches `OPEN_OVO_WORLD_MENU`.
- First-level ovO world menu shows Switch World and Edit World as sibling options.
- Switch World dispatches `OPEN_WORLD_SWITCHER`.
- World switcher lists existing worlds, marks the current world, and selecting a world dispatches `SWITCH_WORLD`.
- Edit World dispatches `OPEN_WORLD_EDITOR_SELECTOR`.
- World editor selector lists existing worlds, marks the current world, and marks Reality as locked.
- Selecting a world to edit dispatches disabled scaffold action `OPEN_WORLD_EDITOR`.
- No create world flow, real edit world page, memory editing, or world data model change is included in this decision.

## 2026-06-27: ovO opens as chat with world-button composer

Decision: ovO is now entered as a special chat route before world switch/edit menu behavior is implemented.

Rules:

- Clicking ovO dispatches `OPEN_OVO_CHAT`, not direct world-control overlay opening.
- `OPEN_OVO_CHAT` sets `activeView = CHAT_VIEW` and stable `activeChatId = "ovo"`.
- ovO chat uses the same ChatView structure as normal chats.
- ovO chat composer kind is `ovo`.
- ovO chat composer defaults to `world-button`.
- ovO `world-button` displays `📍 {currentWorldName}` and does not open a world menu yet.
- The left keyboard action toggles ovO composer to text mode through `TOGGLE_COMPOSER_MODE`.
- Normal chats continue to open with the normal text composer.
- No world switch/edit menu, create world flow, world editor UI, or world data model change is included in this decision.

## 2026-06-27: Composer mode state machine foundation added

Decision: ovOne now has a reusable composer mode state machine before ovO chat/world-button behavior is implemented.

Rules:

- No ovO chat flow was implemented.
- No world menu, create world, edit world, or world editor UI was implemented.
- No real voice sending was implemented.
- `normal` composer supports `text` and `voice-button`.
- `ovo` composer supports `world-button` and `text`.
- ovO default composer mode resolves to `world-button` for future binding.
- Current ChatView remains normal/text by default.
- `TOGGLE_COMPOSER_MODE` and `SET_COMPOSER_MODE` are explicit local UI state actions.
- World switching behavior is unchanged.

## 2026-06-27: ovO overlay binds read-only world switching

Decision: ovO control overlay now exposes existing worlds for read-only context switching.

Rules:

- No create world flow was implemented.
- No edit world flow or world editor UI was implemented.
- ovO overlay lists `state.view.availableWorlds`.
- The current world is visually marked.
- Selecting a world dispatches `SWITCH_WORLD`.
- Behavior Registry keeps owning the local `SWITCH_WORLD` state transition.
- Flow Executor owns the `shell.switchWorld(worldId)` runtime effect and refreshes `state.view`.
- World switching lands on `CHAT_LIST` and clears active chat/contact/overlay/settings state.
- Chats and Contacts then render from the selected world's snapshot/context.
- Me remains global.

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
