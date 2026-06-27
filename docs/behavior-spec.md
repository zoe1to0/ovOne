# ovOne Behavior Specification

This document is the source of truth for ovOne UI behavior actions.

Status: Behavior Registry scaffold implemented.

Last updated: 2026-06-27.

## Purpose

The Behavior Specification defines how UI intent becomes deterministic product behavior.

The current implementation introduces `src/platform/behavior-registry.ts` as the central action execution scaffold for the mobile ChatShell. It does not add new product features or modify WorldDomain, ChatKernel, Snapshot, AI Adapter, Persistence, or the world data model.

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
  -> optional runtime effect for SUBMIT_MESSAGE
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
- ovO click opens the ovO control overlay only. World switch/edit actions inside ovO remain later explicit actions.
- Behavior Registry owns UI action -> state transition only. Runtime effects and autosave are out of scope.

## Action Categories

### Navigation Actions

- `NAV_OPEN_CHAT_LIST`
- `NAV_OPEN_CONTACTS`
- `NAV_OPEN_ME`
- `OPEN_CHAT`
- `NAV_BACK`

### Overlay Actions

- `OPEN_ADD_MENU`
- `OPEN_CHAT_MENU`
- `OPEN_OVO_CONTROL`
- `OPEN_EMOJI_PICKER`
- `OPEN_FILE_PICKER`
- `CLOSE_OVERLAY`

### Chat Actions

- `TEXT_INPUT`
- `SUBMIT_MESSAGE`
- `CHAT_OPEN_GROUP_MEMBERS`
- `CHAT_OPEN_SETTINGS`
- `CHAT_OPEN_BACKGROUND_SETTINGS`

### Contact Actions

- `OPEN_CONTACT`

### World Actions

- `CREATE_WORLD`

### ovO Actions

- `OPEN_OVO_CONTROL`

### Me / Settings Actions

- `OPEN_SETTINGS`
- `CLOSE_SETTINGS`
- `SETTINGS_DISCONNECT_AI`

### Creation Actions

- `CREATE_AI_FRIEND`
- `CREATE_GROUP`
- `CREATE_WORLD`

## Implemented Action Mapping

| UI intent | Registry action | Current behavior |
| --- | --- | --- |
| Open Chats tab | `NAV_OPEN_CHAT_LIST` | Sets `activeView` to `CHAT_LIST`, clears active chat/contact, closes overlay and settings. |
| Open Contacts tab | `NAV_OPEN_CONTACTS` | Sets `activeView` to `CONTACTS`, clears active chat/contact, closes overlay and settings. |
| Open Me tab | `NAV_OPEN_ME` | Sets `activeView` to `ME`, clears active chat/contact, closes overlay. |
| Open chat row | `OPEN_CHAT` | Sets `activeChatId`, sets `activeView` to `CHAT_VIEW`, closes overlay. |
| Back | `NAV_BACK` | From contact detail returns to `CONTACTS`; otherwise returns to `CHAT_LIST` and clears active chat. |
| ovO click | `OPEN_OVO_CONTROL` | Forces `CHAT_LIST`, clears active chat, opens ovO control overlay. |
| Plus button | `OPEN_ADD_MENU` | Opens add menu overlay. |
| Chat menu button | `OPEN_CHAT_MENU` | Opens chat menu overlay. |
| Emoji button | `OPEN_EMOJI_PICKER` | Opens emoji picker overlay. |
| File button | `OPEN_FILE_PICKER` | Opens file picker overlay. |
| Close overlay | `CLOSE_OVERLAY` | Clears current overlay. |
| Text input | `TEXT_INPUT` | Updates `inputDraft` and skips render. |
| Send message | `SUBMIT_MESSAGE` | Behavior Registry trims text and clears draft/overlay; Flow Executor runs the send-message runtime effect. |
| Open settings | `OPEN_SETTINGS` | Sets `settingsOpen`, closes overlay. |
| Close settings | `CLOSE_SETTINGS` | Clears `settingsOpen`, closes overlay. |
| Open contact | `OPEN_CONTACT` | Sets `CONTACT_DETAIL`, stores `selectedContactActorId`, closes overlay. |
| Add AI friend | `CREATE_AI_FRIEND` | Explicit disabled/no-op behavior; closes overlay. |
| Create group | `CREATE_GROUP` | Explicit disabled/no-op behavior; closes overlay. |
| Create world | `CREATE_WORLD` | Explicit disabled/no-op behavior; closes overlay. |
| Group members | `CHAT_OPEN_GROUP_MEMBERS` | Explicit disabled/no-op behavior; closes overlay. |
| Chat settings | `CHAT_OPEN_SETTINGS` | Explicit disabled/no-op behavior; closes overlay. |
| Background settings | `CHAT_OPEN_BACKGROUND_SETTINGS` | Explicit disabled/no-op behavior; closes overlay. |
| Disconnect AI | `SETTINGS_DISCONNECT_AI` | Explicit disabled/no-op behavior; closes overlay. |

## Disabled Actions

These actions are named and routed but intentionally do not implement product behavior yet:

- `CREATE_AI_FRIEND`
- `CREATE_GROUP`
- `CREATE_WORLD`
- `CHAT_OPEN_GROUP_MEMBERS`
- `CHAT_OPEN_SETTINGS`
- `CHAT_OPEN_BACKGROUND_SETTINGS`
- `SETTINGS_DISCONNECT_AI`

## Current Temporary Fallbacks

- Unknown `activeView` resolves to `{ route: "CHAT_LIST", fallbackApplied: true, issue }`.
- The unknown `activeView` fallback is owned by ViewRouter/Behavior Registry route resolution.
- `renderShellPage(...)` consumes the resolved route object and does not own unknown-route fallback.
- `SUBMIT_MESSAGE` is the only action currently handled by Flow Executor.
- Emoji and file picker panel items remain decorative after the overlay opens.

## Remaining Behavior Questions

- Should unknown `activeView` eventually fail loudly in tests instead of falling back to Chat list?
- Should more runtime effects move into Flow Executor as explicit flows?
- What exact actions should ovO overlay expose for world switch and world edit?
- What are the concrete product flows for the disabled creation/settings actions?

## Maintenance Rule

After any behavior implementation task, update this document with:

- added actions
- removed actions
- renamed actions
- changed execution ownership
- newly disabled or implemented actions
- unresolved behavior questions that were answered
