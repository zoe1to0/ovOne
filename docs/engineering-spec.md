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
- `MENU_ACTION` is still a placeholder sink and must not be treated as implemented behavior.

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
  -> ViewRouter.resolve(state.activeView)
  -> renderShellPage(viewState, snapshot, state, controller)
  -> createShellPageFrame(...)
  -> createOverlayLayer(...)
  -> createBottomNav(...)
  -> DOM
```

Runtime state and world data remain below the shell:

```text
UI action
  -> InteractionController.dispatch(action)
  -> local SemanticMobileState update
  -> shell operation when needed
  -> runtime / kernel / world domain / snapshot system
  -> state.view.product.snapshot
  -> renderShellPage(...)
```

## Current Implementation

- Production browser entry: `src/main.ts`.
- Public platform export: `src/platform/index.ts` exports only `mountChatShell`.
- Active UI implementation: `src/platform/mobile-mvp-adapter.ts`.
- Runtime bootstrap used by UI: `createOnboardedProductRuntime({ storage: createBrowserWorldStorage() }).shell`.
- Initial UI state:
  - `splashVisible: true`
  - `activeView: "CHAT_LIST"`
  - `activeChatId: null`
  - `overlay: null`
  - `selectedContactActorId: null`
  - `inputDraft: ""`
  - `settingsOpen: false`
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
- CSS production namespace is `.mvp-*`.

## Current Stable Core

- Single production UI entry is `mountChatShell`.
- Legacy UI roots are disabled by throwing `LegacyUiMountDisabledError`.
- `mountApp`, `mountAppShell`, and `mountMinimalUiShell` are not exported from `src/platform/index.ts`.
- Render path is centralized through `activeView -> ViewRouter.resolve -> renderShellPage`.
- Chat list, chat view, contacts, contact detail, Me, overlays, and bottom navigation are all created inside `mobile-mvp-adapter.ts`.
- All major visible interactive controls are intended to call `InteractionController.dispatch(...)`.

## Disabled Legacy Paths

- `src/platform/browser-adapter.ts`
  - `mountApp(...)` throws.
  - `mountAppShell(...)` throws.
- `src/platform/minimal-ui-adapter.ts`
  - `mountMinimalUiShell(...)` throws.
- `src/platform/index.ts`
  - does not export browser/minimal legacy mount functions.

## Current State Fields

- `activeView`
- `activeChatId`
- `overlay`
- `selectedContactActorId`
- `inputDraft`
- `settingsOpen`
- `splashVisible`
- `view`

## Current View States

- `CHAT_LIST`
- `CHAT_VIEW`
- `CONTACTS`
- `CONTACT_DETAIL`
- `ME`

## Current Overlay States

- `add-menu`
- `chat-menu`
- `ovo-control`
- `emoji-picker`
- `file-picker`
- `null`

## Current Controller Actions

- `TAB_SWITCH`
- `OPEN_CHAT`
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
- `MENU_ACTION`

## Current Action Behavior

| Action | Current behavior |
| --- | --- |
| `TAB_SWITCH` | Maps tab to `activeView`, clears active chat/contact, closes overlay, closes Me settings. |
| `OPEN_CHAT` | Sets `activeChatId`, sets `activeView` to `CHAT_VIEW`, closes overlay. |
| `BACK` | From `CONTACT_DETAIL` returns to `CONTACTS`; otherwise returns to `CHAT_LIST` and clears active chat. |
| `OVO_CLICK` | Forces `CHAT_LIST`, clears active chat, toggles `ovo-control` overlay. |
| `CREATE_MENU` | Toggles `add-menu` overlay. |
| `CHAT_MENU` | Toggles `chat-menu` overlay. |
| `EMOJI_PICKER` | Toggles `emoji-picker` overlay. |
| `FILE_UPLOAD` | Toggles `file-picker` overlay. |
| `TEXT_INPUT` | Updates `inputDraft` only and does not call render. |
| `SUBMIT_MESSAGE` | Trims text, calls `shell.sendMessage(text)`, updates snapshot view, enters `CHAT_VIEW`, clears draft and overlay. |
| `OPEN_SETTINGS` | Sets `settingsOpen`, closes overlay. |
| `CLOSE_SETTINGS` | Clears `settingsOpen`, closes overlay. |
| `OPEN_CONTACT` | Sets `CONTACT_DETAIL`, stores `selectedContactActorId`, closes overlay. |
| `MENU_ACTION` | Refreshes shell view and closes overlay only. It does not implement the requested intent. |

## Current Router Behavior

`ViewRouter` is currently identity-only:

```text
resolve(activeView) -> activeView
currentOverlay(state) -> state.overlay
```

Real page selection is owned by `renderShellPage(...)`:

| activeView | Rendered view |
| --- | --- |
| `CHAT_LIST` | `createChatList(snapshot, controller)` |
| `CHAT_VIEW` | `createChatView(snapshot, state.activeChatId, controller)` |
| `CONTACTS` | `createContactsView(snapshot, controller)` |
| `CONTACT_DETAIL` | `createContactDetailView(snapshot, state.selectedContactActorId, controller)` |
| any other value | `createMeView(snapshot, state.settingsOpen, controller)` |

## Current View Derivation

View helpers still derive presentation data from `WorldSnapshot`:

- `chatsFromSnapshot(snapshot)` reads `snapshot.chatState.chats`.
- `contactsFromSnapshot(snapshot)` filters assistant contacts and removes ovO.
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
  -> local SemanticMobileState mutation
  -> optional shell operation
  -> commitStateTransition(state, render)
  -> ViewRouter.resolve(activeView)
  -> render()
  -> mountRoot.replaceChildren(...)
```

Exceptions:

- `TEXT_INPUT` mutates `inputDraft` and returns without rendering.
- Empty `SUBMIT_MESSAGE` returns without rendering.
- Emoji/file picker panel buttons created without controller/action do not dispatch follow-up behavior.

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

- `MENU_ACTION` is placeholder only.
- Some visible buttons are unbound or only decorative.
- `TEXT_INPUT` updates `inputDraft` but input is not truly controlled.
- `ViewRouter` is identity-only.
- `renderShellPage` owns real routing and has fallback behavior.
- View helpers contain business/presentation derivation.
- Chat/contact mapping uses heuristic inference.
- `CONTACT_DETAIL` can render placeholder content.
- `settingsOpen` is hidden sub-navigation inside Me.
- ovO panel has no dedicated world-switch/edit control flow beyond overlay toggling and tab shortcuts.

## v0.1 Tag Criteria

The `v0.1` tag represents the current baseline after this audit:

- GitHub repository initialized and pushed.
- Engineering docs exist and describe current implementation reality.
- Single production UI entry is `mountChatShell`.
- Legacy browser/minimal UI roots are disabled.
- Current limitations are documented as known issues.

## Maintenance Rule

After every Codex implementation task, update:

- `docs/engineering-spec.md`
- `docs/known-issues.md`
- `docs/decision-log.md` if a product or engineering decision changed

No future implementation task is complete until documentation is updated.
