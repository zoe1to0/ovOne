# ovOne Engineering Spec

This document is the source of truth for current ovOne v2 engineering behavior.

Last audited: 2026-06-27.

## Product Definition

ovOne is a world-based AI chat platform.

The application exposes three first-level pages:

- Chats
- Contacts
- Me

Chats and Contacts are scoped to the active world. Me is global and never changes with world switching.

## Product Rules

- Reality is the default world.
- Reality cannot be deleted.
- Reality worldview cannot be modified.
- Reality has stronger model-name visibility rules than custom worlds.
- Custom worlds are fully isolated from Reality and from each other.
- World switching always lands on that world's Chats list.
- World switching does not restore the previous active chat or previous active view.
- Global AI Link is app-level.
- World Contact is world-level.
- Chat is world-level.
- Memory is world-level.
- The same base AI model can appear in multiple worlds, but each world owns an independent contact/chat/memory instance.
- Deleting an AI contact in one world deletes only that world's contact/chat/memory for that AI.
- Deleting a contact does not disconnect the AI model globally.
- Re-adding the same AI model to that world creates a new clean instance.
- Disconnecting a linked AI model only happens in Me -> Settings -> Linked AI.
- Newly linked AI models do not automatically appear in custom worlds.
- To add a newly linked AI to an existing custom world, the user must use ovO -> Edit World -> Add Member.
- ovO is a global system character/control layer.
- ovO cannot be customized.
- ovO is the entry for world switching and world editing.
- Add/create actions include add AI friend, create group, create world.

## Current Real Architecture

```text
Browser
  -> src/main.ts
  -> src/platform/index.ts
  -> mountChatShell(document.body)
  -> createOnboardedProductRuntime({ storage: createBrowserWorldStorage() }).shell
  -> enterRealityContext(shell)
  -> local SemanticMobileState closure
  -> render()
  -> createChatShell(shell, state, render)
  -> createInteractionController(shell, state, render)
  -> createBehaviorRegistry()
  -> createFlowExecutor()
  -> currentWorldId + world-scope resolver for Chats/Contacts reads
  -> ViewRouter.resolve(state.activeView)
  -> renderShellPage(routeState, snapshot, state, controller)
  -> createShellPageFrame(...)
  -> createOverlayLayer(...)
  -> createBottomNav(...)
  -> DOM
```

Runtime state and world data remain below the shell:

```text
UI action
  -> InteractionController.dispatch(action)
  -> BehaviorRegistry.execute(action, state)
  -> local SemanticMobileState update
  -> FlowExecutor.run(action, { shell, state })
  -> optional shell operation for SUBMIT_MESSAGE / SWITCH_WORLD / Create World confirmation
  -> runtime / kernel / world domain / snapshot system
  -> state.view.product.snapshot
  -> renderShellPage(...)
```

## Current Implementation

- Production browser entry: `src/main.ts`.
- Public platform export: `src/platform/index.ts` exports only `mountChatShell`.
- Active UI implementation: `src/platform/mobile-mvp-adapter.ts`.
- Behavior Registry scaffold: `src/platform/behavior-registry.ts`.
- Flow Executor scaffold: `src/platform/flow-executor.ts`.
- Create World service: `src/minimal-ui-shell/create-world-service.ts`.
- Composer mode state machine: `src/platform/composer-mode.ts`.
- World-scoped data model foundation: `src/domain/world-model.ts`.
- Read-only world scope resolver: `src/domain/world-scope-resolver.ts`.
- Runtime bootstrap used by UI: `createOnboardedProductRuntime({ storage: createBrowserWorldStorage() }).shell`.
- Initial UI state:
  - `splashVisible: true`
  - `activeView: "CHAT_LIST"`
  - `currentWorldId: initialView.product.snapshot.worldMeta.id`
  - `activeChatId: null`
  - `overlay: null`
  - `selectedContactActorId: null`
  - `composerMode: resolveDefaultComposerMode("normal")`
  - `inputDraft: ""`
  - `settingsOpen: false`
  - `createWorldDraft: null`
  - `view: enterRealityContext(shell)`
- Splash timeout:
  - waits 900 ms
  - sets `splashVisible` to `false`
  - forces `activeView` to `CHAT_LIST`
  - refreshes shell view
  - clears `activeChatId`
  - re-renders
- Render root is replaced with `mountRoot.replaceChildren(...)` on each render.
- Snapshot used by UI is `state.view.product.snapshot`.
- Chats and Contacts read through `currentWorldId` and the world scope resolver.
- Me remains global and reads account-level snapshot data directly instead of routing through the world resolver.
- ovO header dispatches `OPEN_OVO_CHAT`, opens `CHAT_VIEW`, and uses stable `activeChatId = "ovo"`.
- ovO ChatView uses the same chat page structure as other chats, but its composer kind is `ovo`.
- ovO composer defaults to `world-button`, displays `📍 {currentWorldName}`, opens the first-level ovO world menu, and can toggle to text mode through `TOGGLE_COMPOSER_MODE`.
- First-level ovO world menu contains sibling options `OPEN_WORLD_SWITCHER` and `OPEN_WORLD_EDITOR_SELECTOR`.
- World switcher lists `state.view.availableWorlds`, marks the current world, and dispatches `SWITCH_WORLD`.
- World editor selector lists `state.view.availableWorlds`, marks the current world, marks Reality as locked, and dispatches disabled scaffold `OPEN_WORLD_EDITOR`.
- Add menu Create World dispatches `OPEN_CREATE_WORLD_DRAFT` and routes to the page-like `CREATE_WORLD_DRAFT` view.
- Create World draft state lives in `SemanticMobileState.createWorldDraft` until confirmation.
- Create World validation state lives in `createWorldDraft.validationError`.
- Create World draft view is a staged vertical flow: world name, worldview text area with attached source controls, small official quick-world chips, AI selection, and next mode.
- `OPEN_CREATE_WORLD_DETAIL_EDIT` routes to `CREATE_WORLD_DETAIL_EDIT`, a scaffold route for reviewing/editing world name, worldview text, and role assignment mode.
- `CONFIRM_CREATE_WORLD_DRAFT` with `nextMode = "random-role"` and a non-empty world name runs through Flow Executor and `shell.createWorldFromDraft(...)`.
- Minimal random-role creation creates a custom world from selected AI ids, appends it to `availableWorlds`, switches to the new world, lands on `CHAT_LIST`, clears active chat/contact/overlay/settings state, and clears the draft.
- `CONFIRM_CREATE_WORLD_DRAFT` with `nextMode = "detailed-edit"` or a missing world name does not create a world yet and keeps the draft open.
- `CONFIRM_CREATE_WORLD_DETAIL` with a non-empty world name runs through Flow Executor and `shell.createWorldFromDraft(...)`.
- `CONFIRM_CREATE_WORLD_DRAFT` and `CONFIRM_CREATE_WORLD_DETAIL` both pass through the same validation/sanitization gate before runtime creation.
- Detailed Edit supports role modes `random-role`, `fixed-role`, and `empty-role`; role content remains placeholder metadata.
- Detailed Edit Random Role mode creates scaffold role slots equal to user plus selected AI count.
- Random Role slots store `roleName` and `personaNotes`; `selectedUserRoleSlotId` optionally marks one slot as the user's role and can be cleared for fully random future assignment.
- Invalid `selectedUserRoleSlotId` values are cleared before create-world runtime effects execute.
- Empty Role creation records role assignment as `none`.
- Blank-world creation keeps selected AI original display names and stores role assignment as `none`.
- Non-blank source creation stores role assignment as `placeholder`; no real role generation is performed.
- CSS production namespace is `.mvp-*`.

## Current Stable Core

- Single production UI entry is `mountChatShell`.
- Legacy UI roots are disabled by throwing `LegacyUiMountDisabledError`.
- `mountApp`, `mountAppShell`, and `mountMinimalUiShell` are not exported from `src/platform/index.ts`.
- Render path is centralized through `activeView -> ViewRouter.resolve -> renderShellPage`.
- `ViewRouter.resolve` delegates to Behavior Registry `resolveView` and returns an explicit route object.
- Chat list, chat view, contacts, contact detail, Me, overlays, and bottom navigation are all created inside `mobile-mvp-adapter.ts`.
- Major visible interactive controls dispatch explicit actions through `InteractionController`.

## Disabled Legacy Paths

- `src/platform/browser-adapter.ts`
  - `mountApp(...)` throws.
  - `mountAppShell(...)` throws.
- `src/platform/minimal-ui-adapter.ts`
  - `mountMinimalUiShell(...)` throws.
- `src/bootstrap/runtime.ts`
  - `mountOvOneRuntime(...)` throws.
- `src/platform/index.ts`
  - does not export browser/minimal legacy mount functions.

## Current State Fields

- `activeView`
- `currentWorldId`
- `activeChatId`
- `overlay`
- `selectedContactActorId`
- `composerMode`
- `inputDraft`
- `settingsOpen`
- `createWorldDraft`
- `splashVisible`
- `view`

## Current View States

- `CHAT_LIST`
- `CHAT_VIEW`
- `CONTACTS`
- `CONTACT_DETAIL`
- `ME`
- `CREATE_WORLD_DRAFT`
- `CREATE_WORLD_DETAIL_EDIT`

Unknown view values resolve to `CHAT_LIST` inside ViewRouter. This is a temporary fallback, not final invariant behavior.

## Current Overlay States

- `add-menu`
- `chat-menu`
- `ovo-control`
- `ovo-world-menu`
- `world-switcher`
- `world-editor-selector`
- `emoji-picker`
- `file-picker`
- `null`

Overlays are opened and closed through explicit actions. They no longer use toggle behavior.

## Current Controller Actions

- `NAV_OPEN_CHAT_LIST`
- `NAV_OPEN_CONTACTS`
- `NAV_OPEN_ME`
- `SWITCH_WORLD`
- `OPEN_CHAT`
- `OPEN_OVO_CHAT`
- `NAV_BACK`
- `OPEN_ADD_MENU`
- `OPEN_CHAT_MENU`
- `OPEN_OVO_CONTROL`
- `OPEN_OVO_WORLD_MENU`
- `OPEN_WORLD_SWITCHER`
- `OPEN_WORLD_EDITOR_SELECTOR`
- `OPEN_WORLD_EDITOR`
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
- `OPEN_EMOJI_PICKER`
- `OPEN_FILE_PICKER`
- `CLOSE_OVERLAY`
- `TOGGLE_COMPOSER_MODE`
- `SET_COMPOSER_MODE`
- `TEXT_INPUT`
- `SUBMIT_MESSAGE`
- `OPEN_SETTINGS`
- `CLOSE_SETTINGS`
- `OPEN_CONTACT`
- `CREATE_AI_FRIEND`
- `CREATE_GROUP`
- `CHAT_OPEN_GROUP_MEMBERS`
- `CHAT_OPEN_SETTINGS`
- `CHAT_OPEN_BACKGROUND_SETTINGS`
- `SETTINGS_DISCONNECT_AI`

## Current Action Behavior

| Action | Current behavior |
| --- | --- |
| `NAV_OPEN_CHAT_LIST` | Sets `CHAT_LIST`, clears active chat/contact, closes overlay and settings. |
| `NAV_OPEN_CONTACTS` | Sets `CONTACTS`, clears active chat/contact, closes overlay and settings. |
| `NAV_OPEN_ME` | Sets `ME`, clears active chat/contact, closes overlay. |
| `SWITCH_WORLD` | Sets `currentWorldId`, lands on `CHAT_LIST`, clears active chat/contact, closes overlay/settings, and Flow Executor refreshes the shell view. |
| `OPEN_CHAT` | Sets `activeChatId`, sets `activeView` to `CHAT_VIEW`, resets to normal text composer, closes overlay. |
| `NAV_BACK` | From `CONTACT_DETAIL` returns to `CONTACTS`; otherwise returns to `CHAT_LIST` and clears active chat. |
| `OPEN_OVO_CHAT` | Sets `activeChatId = "ovo"`, opens `CHAT_VIEW`, resets to ovO `world-button` composer, closes overlay/settings. |
| `OPEN_OVO_WORLD_MENU` | Opens first-level ovO world menu with Switch World and Edit World as sibling options. |
| `OPEN_WORLD_SWITCHER` | Opens world switcher list. |
| `OPEN_WORLD_EDITOR_SELECTOR` | Opens world editor selector list and marks Reality locked. |
| `OPEN_WORLD_EDITOR` | Explicit disabled/no-op scaffold; closes overlay and performs no real editing. |
| `OPEN_OVO_CONTROL` | Existing scaffold action that forces `CHAT_LIST`, clears active chat, opens first-level ovO world menu; not the direct ovO click path. |
| `OPEN_ADD_MENU` | Opens `add-menu` overlay. |
| `OPEN_CHAT_MENU` | Opens `chat-menu` overlay. |
| `OPEN_EMOJI_PICKER` | Opens `emoji-picker` overlay. |
| `OPEN_FILE_PICKER` | Opens `file-picker` overlay. |
| `CLOSE_OVERLAY` | Clears overlay. |
| `TOGGLE_COMPOSER_MODE` | Rotates the current composer mode for the requested composer kind. |
| `SET_COMPOSER_MODE` | Sets the requested composer mode only when valid for the requested composer kind. |
| `TEXT_INPUT` | Updates `inputDraft` only and does not call render. |
| `SUBMIT_MESSAGE` | Behavior Registry trims text, clears draft/overlay, and Flow Executor calls `shell.sendMessage(text)`. |
| `OPEN_SETTINGS` | Sets `settingsOpen`, closes overlay. |
| `CLOSE_SETTINGS` | Clears `settingsOpen`, closes overlay. |
| `OPEN_CONTACT` | Sets `CONTACT_DETAIL`, stores `selectedContactActorId`, closes overlay. |
| `CREATE_AI_FRIEND` | Explicit disabled/no-op behavior; closes overlay. |
| `CREATE_GROUP` | Explicit disabled/no-op behavior; closes overlay. |
| `OPEN_CREATE_WORLD_DRAFT` | Opens `CREATE_WORLD_DRAFT` page and initializes local draft state. |
| `OPEN_CREATE_WORLD_DETAIL_EDIT` | Sets draft next mode to `detailed-edit` and opens `CREATE_WORLD_DETAIL_EDIT` scaffold page. |
| `UPDATE_CREATE_WORLD_DRAFT` | Updates local draft `worldName` or `worldviewText`. |
| `UPDATE_CREATE_WORLD_DETAIL` | Updates detail scaffold fields in the same local draft. |
| `UPDATE_CREATE_WORLD_RANDOM_ROLE_SLOT` | Updates scaffold role name or persona/relationship notes for one random-role slot. |
| `UPDATE_CREATE_WORLD_FIXED_ROLE` | Updates placeholder fixed role row fields. |
| `TOGGLE_RANDOM_ROLE_USER_SLOT` | Selects exactly one random-role slot as the user's role, or clears the selection when clicked again. |
| `SELECT_WORLDVIEW_SOURCE` | Updates local draft worldview source type. |
| `TOGGLE_CREATE_WORLD_AI` | Adds/removes an AI id in local draft selected AI list. |
| `SELECT_CREATE_WORLD_NEXT_MODE` | Updates local draft next mode. |
| `SELECT_DETAIL_ROLE_MODE` | Updates detail scaffold role assignment mode. |
| `CONFIRM_CREATE_WORLD_DRAFT` | Registry validates/sanitizes draft state; Flow Executor creates a world only for `random-role` with a non-empty name, then clears draft/overlay and lands on `CHAT_LIST`. |
| `CONFIRM_CREATE_WORLD_DETAIL` | Registry validates/sanitizes draft state; Flow Executor creates a world for valid detail edit drafts, then clears draft/overlay and lands on `CHAT_LIST`. |
| `CANCEL_CREATE_WORLD_DRAFT` | Clears local draft and returns to `CHAT_LIST`. |
| `CANCEL_CREATE_WORLD_DETAIL` | Clears local draft and returns to `CHAT_LIST`. |
| `OPEN_WORLD_EDITOR` | Explicit disabled/no-op behavior; closes overlay. |
| `CHAT_OPEN_GROUP_MEMBERS` | Explicit disabled/no-op behavior; closes overlay. |
| `CHAT_OPEN_SETTINGS` | Explicit disabled/no-op behavior; closes overlay. |
| `CHAT_OPEN_BACKGROUND_SETTINGS` | Explicit disabled/no-op behavior; closes overlay. |
| `SETTINGS_DISCONNECT_AI` | Explicit disabled/no-op behavior; closes overlay. |

## Current Router Behavior

`ViewRouter` delegates route resolution to Behavior Registry:

```text
resolve(activeView) -> {
  route: "CHAT_LIST" | "CHAT_VIEW" | "CONTACTS" | "CONTACT_DETAIL" | "ME" | "CREATE_WORLD_DRAFT" | "CREATE_WORLD_DETAIL_EDIT",
  fallbackApplied: boolean,
  issue?: string
}
currentOverlay(state) -> BehaviorRegistry.currentOverlay(state)
```

Unknown `activeView` values are resolved to `CHAT_LIST` with `fallbackApplied: true`. `renderShellPage(...)` consumes the resolved route object and does not own unknown-route fallback.

| Resolved route | Rendered view |
| --- | --- |
| `CHAT_LIST` | `createChatList(snapshot, state, controller)` |
| `CHAT_VIEW` | `createChatView(snapshot, state.activeChatId, controller)` |
| `CONTACTS` | `createContactsView(snapshot, state, controller)` |
| `CONTACT_DETAIL` | `createContactDetailView(snapshot, state.selectedContactActorId, controller)` |
| `ME` | `createMeView(snapshot, state.settingsOpen, controller)` |
| `CREATE_WORLD_DRAFT` | `createCreateWorldDraftView(snapshot, state, controller)` |
| `CREATE_WORLD_DETAIL_EDIT` | `createCreateWorldDetailEditView(snapshot, state, controller)` |

## Current Flow Executor Behavior

`FlowExecutor` owns runtime effects after Behavior Registry has applied local UI state transitions.

| Action | Runtime effect |
| --- | --- |
| `SUBMIT_MESSAGE` with non-empty trimmed text | Calls `shell.sendMessage(text)`, updates `state.view`, syncs `activeChatId`, and sets `activeView` to `CHAT_VIEW`. |
| `SUBMIT_MESSAGE` with empty trimmed text | No runtime effect. |
| `SWITCH_WORLD` | Calls `shell.switchWorld(worldId)`, updates `state.view`, and syncs `currentWorldId` from the resulting snapshot. |
| `CONFIRM_CREATE_WORLD_DRAFT` with `nextMode = "random-role"` and non-empty name | Calls `shell.createWorldFromDraft(draft)`, updates `state.view`, syncs `currentWorldId`, lands on `CHAT_LIST`, clears active chat/contact/overlay/settings state, and clears `createWorldDraft`. |
| `CONFIRM_CREATE_WORLD_DRAFT` with `nextMode = "detailed-edit"` or missing name | No runtime effect. |
| `CONFIRM_CREATE_WORLD_DETAIL` with non-empty name and `nextMode = "detailed-edit"` | Calls `shell.createWorldFromDraft(draft)`, updates `state.view`, syncs `currentWorldId`, lands on `CHAT_LIST`, clears active chat/contact/overlay/settings state, and clears `createWorldDraft`. |
| `CONFIRM_CREATE_WORLD_DETAIL` with missing name | No runtime effect. |
| Disabled explicit actions | No runtime effect. |
| All other actions | No runtime effect. |

## Current View Derivation

View helpers still derive presentation data from `WorldSnapshot`:

- `createComposer(snapshot, state, controller)` resolves `normal` or `ovo` composer kind from `activeChatId`.
- `isOvoChatId(state.activeChatId)` treats stable `activeChatId = "ovo"` as the ovO special chat route.
- `chatsFromSnapshot(snapshot, worldId)` reads through `resolveWorldChats(worldId, snapshot)`.
- `contactsFromSnapshot(snapshot, worldId)` reads through `resolveWorldContacts(worldId, snapshot)`, filters assistant contacts, and removes ovO.
- Me settings/favorites read direct account-level assistant contacts and do not use `currentWorldId`.
- `chatTitle(snapshot, chat)` infers a title by matching chats to contacts.
- `contactForChat(snapshot, chat)` uses heuristic matching by contact display name or actor id.
- `contactRelationshipLine(snapshot, contact)` shows model names in Reality and persona labels in custom worlds.
- `unreadCount(snapshot, chat)` derives unread count from the last message author.

These helpers are current implementation reality, not final architecture purity.

## Current Event Flow

```text
UI event
  -> bindControllerAction / bindTextInput / bindComposerSubmit
  -> InteractionController.dispatch(action)
  -> BehaviorRegistry.execute(action, state)
  -> local SemanticMobileState mutation
  -> FlowExecutor.run(action, { shell, state })
  -> optional runtime effect handling for SUBMIT_MESSAGE / SWITCH_WORLD / Create World confirmation
  -> commitStateTransition(state, render)
  -> ViewRouter.resolve(activeView)
  -> resolved route object
  -> render()
  -> mountRoot.replaceChildren(...)
```

Exceptions:

- `TEXT_INPUT` mutates `inputDraft` and returns without rendering.
- Empty `SUBMIT_MESSAGE` returns without rendering.
- Disabled explicit actions close overlay but do not implement product behavior.
- Disabled explicit actions do not execute Flow Executor runtime effects.
- Emoji/file picker panel buttons created without controller/action do not dispatch follow-up behavior.
- Create World draft edit actions mutate only local `createWorldDraft` state.
- Random-role Create World draft confirmation and valid Detailed Edit confirmation are the Create World actions with Flow Executor runtime effects.

## Current Test/Verification Surface

Package scripts:

- `npm run check`
- `npm test`
- `npm run build`
- `npm run dev`
- `npm run dev:check`
- `npm run harness`
- `npm run drift`
- `npm run e2e`
- `npm run hardening`

Current package version: `0.1.0`.

## Current Known Issue Summary

- Disabled explicit actions exist for creation/settings flows but do not implement product behavior yet.
- Some visible buttons are unbound or only decorative.
- `TEXT_INPUT` updates `inputDraft` but input is not truly controlled.
- ovO world-button menu hierarchy is bound, but real world editing is not implemented yet.
- Normal `voice-button` mode is a foundation mode only and does not send real voice.
- `renderShellPage` still owns the known route-to-view factory switch, but unknown-route fallback now lives in ViewRouter.
- Unknown `activeView` falls back to `CHAT_LIST` in ViewRouter.
- Minimal random-role Create World and Detailed Edit scaffold confirmation create and switch into a custom world, but real role generation, document parsing, AI initial messages, and auto group creation are not implemented.
- ovO world menu supports read-only world switching and editor selection scaffold, but no create/edit world flow is implemented yet.
- No real memory engine or AI provider integration exists behind the world-scoped model foundation.
- View helpers contain business/presentation derivation.
- Chat/contact mapping uses heuristic inference.
- `CONTACT_DETAIL` can render placeholder content.
- `settingsOpen` is hidden sub-navigation inside Me.
- ovO panel has read-only world switching but no world edit control flow yet.
- Emoji picker and file picker panel items do not dispatch follow-up controller actions.
- `SUBMIT_MESSAGE`, `SWITCH_WORLD`, `CONFIRM_CREATE_WORLD_DRAFT`, and `CONFIRM_CREATE_WORLD_DETAIL` are the UI actions with Flow Executor runtime effects.
- Production UI code lives in a large single adapter file, so controller, router, state, view helpers, and DOM rendering are not physically separated yet.

## v0.1 Tag Criteria

The `v0.1` tag represents the current baseline after the foundation audit:

- GitHub repository initialized and pushed.
- Engineering docs exist and describe current implementation reality.
- Single production UI entry is `mountChatShell`.
- Legacy browser/minimal UI roots are disabled.
- Current limitations are documented as known issues.

The `v0.1-foundation` tag is an additional foundation marker for the same audited baseline family. It does not change product behavior or architecture.

## Freeze Review Status

2026-06-27 freeze review result:

- Docs accurately reflected the production entry path at freeze time.
- Docs accurately reflected the active UI shell, local semantic mobile state, identity-only ViewRouter, and `renderShellPage` ownership of page selection at freeze time.
- Docs accurately reflected disabled legacy UI roots.
- Known unresolved behavior gaps were documented in `docs/known-issues.md`.
- No product rules were changed during freeze review.
- The repo was accepted as ready for Behavior Registry phase.

## Behavior Specification

Behavior Registry scaffold is implemented in `src/platform/behavior-registry.ts`.

The Behavior Specification lives in `docs/behavior-spec.md` and documents explicit actions, disabled/no-op actions, and remaining behavior questions.

## Maintenance Rule

After every Codex implementation task, update:

- `docs/engineering-spec.md`
- `docs/behavior-spec.md` when behavior actions or execution ownership change
- `docs/known-issues.md`
- `docs/decision-log.md` if a product or engineering decision changed

No future implementation task is complete until documentation is updated.
