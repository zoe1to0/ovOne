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
  -> optional shell operation for SUBMIT_MESSAGE
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
- Chats and Contacts read through `currentWorldId` and the world scope resolver.
- Me remains global and reads account-level snapshot data directly instead of routing through the world resolver.
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

Unknown view values resolve to `CHAT_LIST` inside ViewRouter. This is a temporary fallback, not final invariant behavior.

## Current Overlay States

- `add-menu`
- `chat-menu`
- `ovo-control`
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
- `NAV_BACK`
- `OPEN_ADD_MENU`
- `OPEN_CHAT_MENU`
- `OPEN_OVO_CONTROL`
- `OPEN_EMOJI_PICKER`
- `OPEN_FILE_PICKER`
- `CLOSE_OVERLAY`
- `TEXT_INPUT`
- `SUBMIT_MESSAGE`
- `OPEN_SETTINGS`
- `CLOSE_SETTINGS`
- `OPEN_CONTACT`
- `CREATE_AI_FRIEND`
- `CREATE_GROUP`
- `CREATE_WORLD`
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
| `SWITCH_WORLD` | Sets `currentWorldId`, lands on `CHAT_LIST`, clears active chat/contact, closes overlay and settings. |
| `OPEN_CHAT` | Sets `activeChatId`, sets `activeView` to `CHAT_VIEW`, closes overlay. |
| `NAV_BACK` | From `CONTACT_DETAIL` returns to `CONTACTS`; otherwise returns to `CHAT_LIST` and clears active chat. |
| `OPEN_OVO_CONTROL` | Forces `CHAT_LIST`, clears active chat, opens `ovo-control` overlay. |
| `OPEN_ADD_MENU` | Opens `add-menu` overlay. |
| `OPEN_CHAT_MENU` | Opens `chat-menu` overlay. |
| `OPEN_EMOJI_PICKER` | Opens `emoji-picker` overlay. |
| `OPEN_FILE_PICKER` | Opens `file-picker` overlay. |
| `CLOSE_OVERLAY` | Clears overlay. |
| `TEXT_INPUT` | Updates `inputDraft` only and does not call render. |
| `SUBMIT_MESSAGE` | Behavior Registry trims text, clears draft/overlay, and Flow Executor calls `shell.sendMessage(text)`. |
| `OPEN_SETTINGS` | Sets `settingsOpen`, closes overlay. |
| `CLOSE_SETTINGS` | Clears `settingsOpen`, closes overlay. |
| `OPEN_CONTACT` | Sets `CONTACT_DETAIL`, stores `selectedContactActorId`, closes overlay. |
| `CREATE_AI_FRIEND` | Explicit disabled/no-op behavior; closes overlay. |
| `CREATE_GROUP` | Explicit disabled/no-op behavior; closes overlay. |
| `CREATE_WORLD` | Explicit disabled/no-op behavior; closes overlay. |
| `CHAT_OPEN_GROUP_MEMBERS` | Explicit disabled/no-op behavior; closes overlay. |
| `CHAT_OPEN_SETTINGS` | Explicit disabled/no-op behavior; closes overlay. |
| `CHAT_OPEN_BACKGROUND_SETTINGS` | Explicit disabled/no-op behavior; closes overlay. |
| `SETTINGS_DISCONNECT_AI` | Explicit disabled/no-op behavior; closes overlay. |

## Current Router Behavior

`ViewRouter` delegates route resolution to Behavior Registry:

```text
resolve(activeView) -> {
  route: "CHAT_LIST" | "CHAT_VIEW" | "CONTACTS" | "CONTACT_DETAIL" | "ME",
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

## Current Flow Executor Behavior

`FlowExecutor` owns runtime effects after Behavior Registry has applied local UI state transitions.

| Action | Runtime effect |
| --- | --- |
| `SUBMIT_MESSAGE` with non-empty trimmed text | Calls `shell.sendMessage(text)`, updates `state.view`, syncs `activeChatId`, and sets `activeView` to `CHAT_VIEW`. |
| `SUBMIT_MESSAGE` with empty trimmed text | No runtime effect. |
| Disabled explicit actions | No runtime effect. |
| All other actions | No runtime effect. |

## Current View Derivation

View helpers still derive presentation data from `WorldSnapshot`:

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
  -> optional runtime effect handling for SUBMIT_MESSAGE
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
- `renderShellPage` still owns the known route-to-view factory switch, but unknown-route fallback now lives in ViewRouter.
- Unknown `activeView` falls back to `CHAT_LIST` in ViewRouter.
- World-scoped data model foundation exists, but it is read-only and not a create/edit world product flow.
- `SWITCH_WORLD` is scaffolded as an explicit action, but no dedicated world-switch UI flow is implemented yet.
- No real memory engine or AI provider integration exists behind the world-scoped model foundation.
- View helpers contain business/presentation derivation.
- Chat/contact mapping uses heuristic inference.
- `CONTACT_DETAIL` can render placeholder content.
- `settingsOpen` is hidden sub-navigation inside Me.
- ovO panel has no dedicated world-switch/edit control flow beyond opening the control overlay.
- Emoji picker and file picker panel items do not dispatch follow-up controller actions.
- `SUBMIT_MESSAGE` is the only UI action with a Flow Executor runtime effect.
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
