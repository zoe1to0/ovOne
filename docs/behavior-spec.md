# ovOne Behavior Specification

This document is the source of truth for ovOne UI behavior actions.

Status: Behavior Registry scaffold implemented.

Last updated: 2026-06-27.

## Purpose

The Behavior Specification defines how UI intent becomes deterministic product behavior.

The current implementation uses `src/platform/behavior-registry.ts` as the central action execution scaffold for the mobile ChatShell. It does not add new product features or modify WorldDomain, ChatKernel, Snapshot, AI Adapter, or Persistence.

## Behavior Registry Principle

Every user-visible behavior must be represented by one explicit registry action.

Rules:

- Every UI event must map to exactly one explicit action.
- No generic `MENU_ACTION` sink is allowed.
- No inline behavior logic may live inside views.
- Views may bind UI events to action dispatch only.
- `InteractionController` dispatches explicit actions only.
- Behavior Registry owns UI action -> local UI state transition.
- Runtime effects and autosave remain outside Behavior Registry scope.
- Action names must describe user intent, not DOM structure.
- The same intent must use the same action from every UI entry point.
- Unimplemented behavior must be represented as an explicit disabled action, not hidden behind a generic sink.

## Implemented Flow

```text
UI event
  -> explicit action
  -> InteractionController.dispatch(action)
  -> BehaviorRegistry.execute(action, state)
  -> local SemanticMobileState transition
  -> FlowExecutor.run(action, context)
  -> optional runtime effect for SUBMIT_MESSAGE / SWITCH_WORLD / Create World confirmation
  -> ViewRouter.resolve(state.activeView)
  -> renderShellPage(routeState, ...)
  -> DOM
```

## Product Decisions Confirmed

- `OPEN_CHAT` is one action. It sets `activeChatId` and `activeView = CHAT_VIEW`.
- Overlays use explicit open/close actions, not toggles.
- Emoji and file picker follow-up item actions remain disabled/no-op for now.
- `TEXT_INPUT` updates `inputDraft` but does not re-render yet.
- Unknown `activeView` falls back to `CHAT_LIST`. This is a temporary fallback, not a final invariant.
- ovO click opens the special ovO chat with stable `activeChatId = "ovo"`.
- ovO chat uses the same `CHAT_VIEW` structure as other chats.
- ovO chat composer kind is `ovo` and defaults to `world-button`.
- ovO `world-button` composer shows the current world name as `📍 {world}` and opens the first-level ovO world menu.
- The first-level ovO world menu shows sibling options: Switch World and Edit World.
- Switch World opens the world switcher list and selecting a world dispatches `SWITCH_WORLD`.
- Edit World opens the world editor selector list and selecting a world dispatches disabled scaffold action `OPEN_WORLD_EDITOR`.
- Reality appears in the editor selector and is marked as locked; no real worldview editing is allowed.
- ovO control overlay still exists as a read-only world switching scaffold, but it is no longer the direct ovO click path.
- World edit actions inside ovO remain later explicit actions.
- Behavior Registry owns UI action -> state transition only. Runtime effects and autosave are out of scope.
- `SWITCH_WORLD` changes `currentWorldId`, lands on `CHAT_LIST`, clears active chat/contact selection, and Flow Executor refreshes the shell view through `shell.switchWorld(worldId)`.
- Composer mode resolution is centralized in `src/platform/composer-mode.ts`.
- Normal composer supports `text` and `voice-button`.
- ovO composer supports `world-button` and `text`; ovO default resolves to `world-button` for future ovO chat binding.
- Current visible chat composer remains normal/text by default.
- Create World now opens a page-like draft flow through `OPEN_CREATE_WORLD_DRAFT`.
- Create World draft is a route/page-like view (`CREATE_WORLD_DRAFT`), not an overlay.
- The draft view is staged vertically: world name, worldview area, attached source controls, official quick-world chips, AI selection, and next mode.
- Official quick worlds render as small chips.
- Create World draft state is stored in `SemanticMobileState.createWorldDraft`, not in `WorldScopedSnapshot`.
- Create World draft validation state is stored locally as `validationError`.
- `OPEN_CREATE_WORLD_DETAIL_EDIT` routes to `CREATE_WORLD_DETAIL_EDIT`, a scaffold page for world text review and role assignment mode selection.
- Confirming the Create World draft with `nextMode = "random-role"` and a non-empty name creates a custom world through Flow Executor and the shell runtime boundary.
- Confirming the Create World draft with `nextMode = "detailed-edit"` does not create a world yet.
- Confirming Create World detailed edit with a non-empty world name creates a custom world through Flow Executor and the shell runtime boundary.
- Detailed Edit role modes are `random-role`, `fixed-role`, and `empty-role`.
- `empty-role` records no role assignment and does not trigger active initial reaction behavior.
- In Detailed Edit, `random-role` generates scaffold role slots equal to the user plus selected AI count.
- Each random-role slot stores `roleName` and `personaNotes`.
- `selectedUserRoleSlotId` may mark exactly one random-role slot as the user's role; selecting the same slot again clears it so all participants can be randomly assigned later.
- Invalid `selectedUserRoleSlotId` values are cleared during registry state transitions and again before Flow Executor calls the create-world service.
- `random-role` and `fixed-role` store placeholder role assignment metadata only; no real role generation is performed.
- Confirming Create World without a required world name does not create a world, leaves the current create page open, and sets `validationError = "请输入世界名称"`.
- Blank-world creation keeps selected AI original display names and records no assigned roles.
- Non-blank source creation records role assignment as a placeholder only; it is not real random generation.
- Cancelling the Create World draft clears the draft and returns to `CHAT_LIST`.

## Action Categories

### Navigation Actions

- `NAV_OPEN_CHAT_LIST`
- `NAV_OPEN_CONTACTS`
- `NAV_OPEN_ME`
- `SWITCH_WORLD`
- `OPEN_CHAT`
- `OPEN_OVO_CHAT`
- `NAV_BACK`

### Overlay Actions

- `OPEN_ADD_MENU`
- `OPEN_CHAT_MENU`
- `OPEN_OVO_CONTROL`
- `OPEN_OVO_WORLD_MENU`
- `OPEN_WORLD_SWITCHER`
- `OPEN_WORLD_EDITOR_SELECTOR`
- `OPEN_EMOJI_PICKER`
- `OPEN_FILE_PICKER`
- `CLOSE_OVERLAY`

### Chat Actions

- `TOGGLE_COMPOSER_MODE`
- `SET_COMPOSER_MODE`
- `TEXT_INPUT`
- `SUBMIT_MESSAGE`
- `CHAT_OPEN_GROUP_MEMBERS`
- `CHAT_OPEN_SETTINGS`
- `CHAT_OPEN_BACKGROUND_SETTINGS`

### Contact Actions

- `OPEN_CONTACT`

### World Actions

- `SWITCH_WORLD`
- `OPEN_WORLD_EDITOR`
- `UPDATE_CREATE_WORLD_DRAFT`
- `UPDATE_CREATE_WORLD_DETAIL`
- `UPDATE_CREATE_WORLD_RANDOM_ROLE_SLOT`
- `UPDATE_CREATE_WORLD_FIXED_ROLE`
- `TOGGLE_RANDOM_ROLE_USER_SLOT`
- `SELECT_WORLDVIEW_SOURCE`
- `TOGGLE_CREATE_WORLD_AI`
- `SELECT_CREATE_WORLD_NEXT_MODE`
- `SELECT_DETAIL_ROLE_MODE`
- `CONFIRM_CREATE_WORLD_DRAFT`
- `CONFIRM_CREATE_WORLD_DETAIL`
- `CANCEL_CREATE_WORLD_DRAFT`
- `CANCEL_CREATE_WORLD_DETAIL`

### ovO Actions

- `OPEN_OVO_CHAT`
- `OPEN_OVO_CONTROL`
- `OPEN_OVO_WORLD_MENU`

### Me / Settings Actions

- `OPEN_SETTINGS`
- `CLOSE_SETTINGS`
- `SETTINGS_DISCONNECT_AI`

### Creation Actions

- `CREATE_AI_FRIEND`
- `CREATE_GROUP`
- `OPEN_CREATE_WORLD_DRAFT`
- `OPEN_CREATE_WORLD_DETAIL_EDIT`
- `UPDATE_CREATE_WORLD_DRAFT`
- `UPDATE_CREATE_WORLD_DETAIL`
- `UPDATE_CREATE_WORLD_RANDOM_ROLE_SLOT`
- `UPDATE_CREATE_WORLD_FIXED_ROLE`
- `TOGGLE_RANDOM_ROLE_USER_SLOT`
- `SELECT_WORLDVIEW_SOURCE`
- `TOGGLE_CREATE_WORLD_AI`
- `SELECT_CREATE_WORLD_NEXT_MODE`
- `SELECT_DETAIL_ROLE_MODE`
- `CONFIRM_CREATE_WORLD_DRAFT`
- `CONFIRM_CREATE_WORLD_DETAIL`
- `CANCEL_CREATE_WORLD_DRAFT`
- `CANCEL_CREATE_WORLD_DETAIL`

## Implemented Action Mapping

| UI intent | Registry action | Current behavior |
| --- | --- | --- |
| Open Chats tab | `NAV_OPEN_CHAT_LIST` | Sets `activeView` to `CHAT_LIST`, clears active chat/contact, closes overlay and settings. |
| Open Contacts tab | `NAV_OPEN_CONTACTS` | Sets `activeView` to `CONTACTS`, clears active chat/contact, closes overlay and settings. |
| Open Me tab | `NAV_OPEN_ME` | Sets `activeView` to `ME`, clears active chat/contact, closes overlay. |
| Switch world from ovO overlay | `SWITCH_WORLD` | Sets `currentWorldId`, lands on `CHAT_LIST`, clears active chat/contact, closes overlay/settings, and Flow Executor refreshes the shell view. |
| Open chat row | `OPEN_CHAT` | Sets `activeChatId`, sets `activeView` to `CHAT_VIEW`, resets to normal text composer, closes overlay. |
| Back | `NAV_BACK` | From contact detail returns to `CONTACTS`; otherwise returns to `CHAT_LIST` and clears active chat. |
| ovO click | `OPEN_OVO_CHAT` | Sets `activeChatId = "ovo"`, sets `CHAT_VIEW`, resets to ovO `world-button` composer, closes overlay/settings. |
| Open ovO world menu | `OPEN_OVO_WORLD_MENU` | Opens first-level ovO world menu with Switch World and Edit World as sibling options. |
| Open world switcher | `OPEN_WORLD_SWITCHER` | Opens world switcher list. Selecting a world dispatches `SWITCH_WORLD`. |
| Open world editor selector | `OPEN_WORLD_EDITOR_SELECTOR` | Opens world editor selector list. Reality is marked locked. |
| Select world to edit | `OPEN_WORLD_EDITOR` | Explicit disabled/no-op scaffold; closes overlay and performs no real editing. |
| Open ovO control overlay | `OPEN_OVO_CONTROL` | Existing scaffold action that forces `CHAT_LIST`, clears active chat, and opens the first-level ovO world menu; not the direct ovO click path. |
| Plus button | `OPEN_ADD_MENU` | Opens add menu overlay. |
| Chat menu button | `OPEN_CHAT_MENU` | Opens chat menu overlay. |
| Emoji button | `OPEN_EMOJI_PICKER` | Opens emoji picker overlay. |
| File button | `OPEN_FILE_PICKER` | Opens file picker overlay. |
| Close overlay | `CLOSE_OVERLAY` | Clears current overlay. |
| Toggle composer mode | `TOGGLE_COMPOSER_MODE` | Uses composer mode state machine to rotate the current mode for the given composer kind. |
| Set composer mode | `SET_COMPOSER_MODE` | Sets the requested mode only when it is valid for the given composer kind. |
| Text input | `TEXT_INPUT` | Updates `inputDraft` and skips render. |
| Send message | `SUBMIT_MESSAGE` | Behavior Registry trims text and clears draft/overlay; Flow Executor runs the send-message runtime effect. |
| Open settings | `OPEN_SETTINGS` | Sets `settingsOpen`, closes overlay. |
| Close settings | `CLOSE_SETTINGS` | Clears `settingsOpen`, closes overlay. |
| Open contact | `OPEN_CONTACT` | Sets `CONTACT_DETAIL`, stores `selectedContactActorId`, closes overlay. |
| Add AI friend | `CREATE_AI_FRIEND` | Explicit disabled/no-op behavior; closes overlay. |
| Create group | `CREATE_GROUP` | Explicit disabled/no-op behavior; closes overlay. |
| Create world | `OPEN_CREATE_WORLD_DRAFT` | Opens `CREATE_WORLD_DRAFT` page and initializes local draft state. |
| Open detailed edit | `OPEN_CREATE_WORLD_DETAIL_EDIT` | Opens `CREATE_WORLD_DETAIL_EDIT` scaffold and sets draft next mode to `detailed-edit`. |
| Update Create World draft text | `UPDATE_CREATE_WORLD_DRAFT` | Updates `worldName` or `worldviewText` in local draft state only. |
| Update Create World detail text | `UPDATE_CREATE_WORLD_DETAIL` | Updates detail scaffold fields in the same local draft state. |
| Update random role slot | `UPDATE_CREATE_WORLD_RANDOM_ROLE_SLOT` | Updates scaffold role name or persona/relationship notes for one random-role slot. |
| Update fixed role row | `UPDATE_CREATE_WORLD_FIXED_ROLE` | Updates placeholder role name or relationship/persona notes for a fixed-role participant. |
| Toggle random user role slot | `TOGGLE_RANDOM_ROLE_USER_SLOT` | Selects exactly one random-role slot as the user's role, or clears it when the selected slot is clicked again. |
| Select worldview source | `SELECT_WORLDVIEW_SOURCE` | Updates local draft `worldviewSourceType`. |
| Toggle Create World AI | `TOGGLE_CREATE_WORLD_AI` | Adds/removes an AI id in local draft `selectedAIModelIds`. |
| Select Create World next mode | `SELECT_CREATE_WORLD_NEXT_MODE` | Sets local draft `nextMode` to `random-role` or `detailed-edit`. |
| Select detail role mode | `SELECT_DETAIL_ROLE_MODE` | Sets detail role mode to `random-role`, `fixed-role`, or `empty-role`. |
| Confirm Create World draft | `CONFIRM_CREATE_WORLD_DRAFT` | Registry sanitizes/validates draft state; Flow Executor creates a world only for valid `random-role`, then switches into it and clears draft/overlay. |
| Confirm Create World detail | `CONFIRM_CREATE_WORLD_DETAIL` | Registry sanitizes/validates draft state; Flow Executor creates a world for valid detail edit drafts, then switches into it and clears draft/overlay. |
| Cancel Create World draft | `CANCEL_CREATE_WORLD_DRAFT` | Clears local draft state and returns to `CHAT_LIST`. |
| Cancel Create World detail | `CANCEL_CREATE_WORLD_DETAIL` | Clears local draft state and returns to `CHAT_LIST`. |
| Group members | `CHAT_OPEN_GROUP_MEMBERS` | Explicit disabled/no-op behavior; closes overlay. |
| Chat settings | `CHAT_OPEN_SETTINGS` | Explicit disabled/no-op behavior; closes overlay. |
| Background settings | `CHAT_OPEN_BACKGROUND_SETTINGS` | Explicit disabled/no-op behavior; closes overlay. |
| Disconnect AI | `SETTINGS_DISCONNECT_AI` | Explicit disabled/no-op behavior; closes overlay. |

## Disabled Actions

These actions are named and routed but intentionally do not implement product behavior yet:

- `CREATE_AI_FRIEND`
- `CREATE_GROUP`
- `OPEN_WORLD_EDITOR`
- `CHAT_OPEN_GROUP_MEMBERS`
- `CHAT_OPEN_SETTINGS`
- `CHAT_OPEN_BACKGROUND_SETTINGS`
- `SETTINGS_DISCONNECT_AI`

## Composer Modes

| Composer kind | Supported modes | Default mode | Current binding |
| --- | --- | --- | --- |
| `normal` | `text`, `voice-button` | `text` | Chat composer renders `text` by default. |
| `ovo` | `world-button`, `text` | `world-button` | ovO chat composer renders `world-button` by default; keyboard action toggles it to `text`; world button opens ovO world menu. |

## Current Temporary Fallbacks

- Unknown `activeView` resolves to `{ route: "CHAT_LIST", fallbackApplied: true, issue }`.
- The unknown `activeView` fallback is owned by ViewRouter/Behavior Registry route resolution.
- `renderShellPage(...)` consumes the resolved route object and does not own unknown-route fallback.
- `SUBMIT_MESSAGE` and `SWITCH_WORLD` are currently handled by Flow Executor.
- `CONFIRM_CREATE_WORLD_DRAFT` is handled by Flow Executor only for valid `random-role` creation.
- `CONFIRM_CREATE_WORLD_DETAIL` is handled by Flow Executor for valid detailed edit creation.
- Emoji and file picker panel items remain decorative after the overlay opens.
- ovO world-button menu hierarchy is bound, but real world editing is not implemented yet.
- Create World confirmation creates worlds for Random Role draft and valid Detailed Edit scaffold submissions, but real random role generation, document parsing, AI initial messages, and auto group creation are not implemented yet.
- Detailed Edit currently exposes scaffold fields only; Random Role role slots are collected as metadata and no real random assignment or detailed validation is implemented.

## Remaining Behavior Questions

- Should unknown `activeView` eventually fail loudly in tests instead of falling back to Chat list?
- Should more runtime effects move into Flow Executor as explicit flows?
- What exact actions should ovO overlay expose for world edit?
- What should the real `OPEN_WORLD_EDITOR` implementation display after world editor behavior is in scope?
- What validation UI should missing Create World name display?
- What validation details should Create World Detailed Edit require before confirmation?
- What should the normal `voice-button` mode do before real voice sending exists?
- What are the concrete product flows for the disabled creation/settings actions?

## Maintenance Rule

After any behavior implementation task, update this document with:

- added actions
- removed actions
- renamed actions
- changed execution ownership
- newly disabled or implemented actions
- unresolved behavior questions that were answered
