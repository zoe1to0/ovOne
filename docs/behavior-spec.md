# ovOne Behavior Specification

This document starts the ovOne Behavior Specification phase.

Status: foundation only. No product behavior is implemented by this document.

Last updated: 2026-06-27.

## Purpose

The Behavior Specification defines how UI intent becomes deterministic product behavior.

The current implementation has a controller-shaped UI path, but action execution is still embedded in `src/platform/mobile-mvp-adapter.ts`. This spec defines the target behavior contract before any refactor begins.

## Behavior Registry Principle

Every user-visible behavior must be represented by one explicit registry action.

Rules:

- Every UI event must map to exactly one explicit action.
- No generic `MENU_ACTION` sink is allowed in the target behavior model.
- No inline behavior logic may live inside views.
- Views may bind UI events to action dispatch only.
- `InteractionController` dispatches explicit actions only.
- Behavior Registry owns action execution.
- Behavior Registry is the only layer that maps actions to state transitions, runtime calls, overlays, and rerender triggers.
- Action names must describe user intent, not DOM structure.
- The same intent must use the same action from every UI entry point.
- Unimplemented behavior must be represented as an explicit pending action, not hidden behind a generic sink.

## Target Flow

```text
UI event
  -> explicit action
  -> InteractionController.dispatch(action)
  -> BehaviorRegistry.execute(action, context)
  -> state/runtime effect
  -> snapshot/view refresh
  -> render
```

## Non-Goals For This Phase

- Do not implement new product features.
- Do not refactor current UI code yet.
- Do not change product rules.
- Do not change WorldDomain, ChatKernel, Snapshot, AI Adapter, Persistence, or tests as part of the foundation document.

## Action Categories

### Navigation Actions

Navigation actions select the active view without performing business behavior.

Initial target actions:

- `NAV_OPEN_CHAT_LIST`
- `NAV_OPEN_CHAT`
- `NAV_OPEN_CONTACTS`
- `NAV_OPEN_CONTACT_DETAIL`
- `NAV_OPEN_ME`
- `NAV_BACK`

### Overlay Actions

Overlay actions open or close floating UI layers.

Initial target actions:

- `OVERLAY_OPEN_CREATE_MENU`
- `OVERLAY_OPEN_CHAT_MENU`
- `OVERLAY_OPEN_OVO_PANEL`
- `OVERLAY_OPEN_EMOJI_PICKER`
- `OVERLAY_OPEN_FILE_PICKER`
- `OVERLAY_CLOSE`
- `OVERLAY_TOGGLE`

### Chat Actions

Chat actions update chat interaction state or send chat input through runtime.

Initial target actions:

- `CHAT_SELECT`
- `CHAT_INPUT_CHANGED`
- `CHAT_SEND_MESSAGE`
- `CHAT_OPEN_MENU`
- `CHAT_OPEN_GROUP_MEMBERS`
- `CHAT_OPEN_SETTINGS`
- `CHAT_OPEN_BACKGROUND_SETTINGS`

### Contact Actions

Contact actions operate on world-scoped contact UI and contact detail behavior.

Initial target actions:

- `CONTACT_SELECT`
- `CONTACT_OPEN_DETAIL`
- `CONTACT_UPDATE_NICKNAME`
- `CONTACT_UPDATE_PERSONA_PERCEPTION`
- `CONTACT_UPDATE_COMMUNICATION_MODE`
- `CONTACT_UPDATE_TONE`
- `CONTACT_DELETE_FROM_CURRENT_WORLD`

### World Actions

World actions operate on internal world context through explicit behavior.

Initial target actions:

- `WORLD_SWITCH`
- `WORLD_OPEN_SWITCHER`
- `WORLD_OPEN_EDITOR`
- `WORLD_ADD_MEMBER`
- `WORLD_CREATE`
- `WORLD_EDIT_SETTINGS`

### ovO Actions

ovO actions represent the system controller entry behavior.

Initial target actions:

- `OVO_OPEN_PANEL`
- `OVO_OPEN_WORLD_SWITCHER`
- `OVO_OPEN_WORLD_EDITOR`
- `OVO_OPEN_CREATE_MENU`
- `OVO_DISMISS_PANEL`

### Me / Settings Actions

Me and Settings actions operate on global account-level UI.

Initial target actions:

- `ME_OPEN`
- `SETTINGS_OPEN`
- `SETTINGS_CLOSE`
- `SETTINGS_OPEN_LINKED_AI`
- `SETTINGS_DISCONNECT_AI`
- `SETTINGS_OPEN_LANGUAGE`

### Creation Actions

Creation actions represent all `+` flows.

Initial target actions:

- `CREATE_OPEN_MENU`
- `CREATE_AI_FRIEND`
- `CREATE_GROUP`
- `CREATE_WORLD`

## Current Action Audit

| Current action | Current category | Target classification | Target action |
| --- | --- | --- | --- |
| `TAB_SWITCH` | Navigation | Split | `NAV_OPEN_CHAT_LIST`, `NAV_OPEN_CONTACTS`, `NAV_OPEN_ME` |
| `OPEN_CHAT` | Navigation / Chat | Rename | `CHAT_SELECT` or `NAV_OPEN_CHAT` with `chatId` |
| `BACK` | Navigation | Rename | `NAV_BACK` |
| `OVO_CLICK` | ovO / Overlay | Rename | `OVO_OPEN_PANEL` or `OVERLAY_OPEN_OVO_PANEL` |
| `CREATE_MENU` | Creation / Overlay | Rename | `CREATE_OPEN_MENU` or `OVERLAY_OPEN_CREATE_MENU` |
| `CHAT_MENU` | Chat / Overlay | Rename | `CHAT_OPEN_MENU` or `OVERLAY_OPEN_CHAT_MENU` |
| `EMOJI_PICKER` | Overlay | Rename | `OVERLAY_OPEN_EMOJI_PICKER` |
| `FILE_UPLOAD` | Overlay | Rename | `OVERLAY_OPEN_FILE_PICKER` |
| `TEXT_INPUT` | Chat | Rename | `CHAT_INPUT_CHANGED` |
| `SUBMIT_MESSAGE` | Chat | Rename | `CHAT_SEND_MESSAGE` |
| `OPEN_SETTINGS` | Me / Settings | Rename | `SETTINGS_OPEN` |
| `CLOSE_SETTINGS` | Me / Settings | Rename | `SETTINGS_CLOSE` |
| `OPEN_CONTACT` | Contact / Navigation | Rename | `CONTACT_OPEN_DETAIL` |
| `MENU_ACTION: add-ai` | Creation | Replace placeholder | `CREATE_AI_FRIEND` |
| `MENU_ACTION: create-group` | Creation | Replace placeholder | `CREATE_GROUP` |
| `MENU_ACTION: create-world` | Creation / World | Replace placeholder | `CREATE_WORLD` |
| `MENU_ACTION: group-members` | Chat | Replace placeholder | `CHAT_OPEN_GROUP_MEMBERS` |
| `MENU_ACTION: chat-settings` | Chat | Replace placeholder | `CHAT_OPEN_SETTINGS` |
| `MENU_ACTION: background-settings` | Chat | Replace placeholder | `CHAT_OPEN_BACKGROUND_SETTINGS` |
| `MENU_ACTION: disconnect-ai` | Me / Settings | Replace placeholder | `SETTINGS_DISCONNECT_AI` |

## Keep As-Is

No current action is accepted as final as-is.

Some current actions may keep equivalent payload shape after rename:

- `OPEN_CHAT` payload `chatId`
- `OPEN_CONTACT` payload `actorId`
- `TEXT_INPUT` payload `text`
- `SUBMIT_MESSAGE` payload `text`

## Rename

Current actions that should become explicit target names:

- `BACK`
- `OVO_CLICK`
- `CREATE_MENU`
- `CHAT_MENU`
- `EMOJI_PICKER`
- `FILE_UPLOAD`
- `TEXT_INPUT`
- `SUBMIT_MESSAGE`
- `OPEN_SETTINGS`
- `CLOSE_SETTINGS`
- `OPEN_CONTACT`

## Split

Current actions that combine multiple target intents:

- `TAB_SWITCH`
  - `chats` -> `NAV_OPEN_CHAT_LIST`
  - `contacts` -> `NAV_OPEN_CONTACTS`
  - `me` -> `NAV_OPEN_ME`
- `OPEN_CHAT`
  - selection intent -> `CHAT_SELECT`
  - navigation intent -> `NAV_OPEN_CHAT`

## Replace Placeholder

`MENU_ACTION` must be removed from the target behavior model.

Each current `MENU_ACTION.intent` must become its own explicit action:

- `add-ai` -> `CREATE_AI_FRIEND`
- `create-group` -> `CREATE_GROUP`
- `create-world` -> `CREATE_WORLD`
- `group-members` -> `CHAT_OPEN_GROUP_MEMBERS`
- `chat-settings` -> `CHAT_OPEN_SETTINGS`
- `background-settings` -> `CHAT_OPEN_BACKGROUND_SETTINGS`
- `disconnect-ai` -> `SETTINGS_DISCONNECT_AI`

## Current Inline Behavior To Extract Later

The following behavior currently lives inside `createInteractionController(...)` and should move to Behavior Registry in a future implementation phase:

- Tab-to-view mapping.
- Active chat selection.
- Back behavior branching.
- Overlay toggle behavior.
- Message trimming and empty-message short circuit.
- `shell.sendMessage(text)` invocation.
- Settings open/close behavior.
- Contact detail selection.
- Placeholder `MENU_ACTION` handling.

The following view helper behavior should be reviewed separately before extraction:

- Chat title inference.
- Contact-to-chat heuristic matching.
- Reality/custom contact subtitle derivation.
- Unread count derivation.
- ovO filtering from contact lists.

## Unresolved Behavior Questions

- Should navigation and selection be one action (`CHAT_SELECT`) or two actions (`CHAT_SELECT` then `NAV_OPEN_CHAT`)?
- Should overlay actions be represented as explicit open/close actions or a generic typed `OVERLAY_TOGGLE` action?
- Should emoji/file picker item clicks dispatch insert/upload actions immediately, or remain decorative until tool support exists?
- Should `TEXT_INPUT` trigger render for typing state, or should it stay non-rendering until controlled input is implemented?
- Should unknown `activeView` fail explicitly instead of falling back to Me?
- Should ovO panel expose world switch/edit actions now, or only define pending actions until world UI behavior is implemented?
- Should Behavior Registry own persistence autosave triggers, or leave them inside persistent runtime wrappers?

## Behavior Registry Readiness Criteria

The next implementation phase can start when:

- This behavior spec is accepted as the source of truth for action naming.
- No new product feature is hidden behind `MENU_ACTION`.
- A registry module can be introduced without changing WorldDomain, ChatKernel, Snapshot, or AI Adapter.
- Tests can assert every visible UI event dispatches an explicit action.

## Maintenance Rule

After any behavior implementation task, update this document with:

- added actions
- removed actions
- renamed actions
- changed execution ownership
- unresolved behavior questions that were answered
