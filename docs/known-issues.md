# ovOne Known Issues

Last audited: 2026-06-27.

## Current Known Engineering Issues

- Disabled explicit actions exist for creation/settings flows but do not implement product behavior yet.
- Some visible buttons are unbound or decorative only.
- `TEXT_INPUT` updates `inputDraft` but input is not truly controlled.
- `TEXT_INPUT` returns before `commitStateTransition`, so typing state is not re-rendered.
- ovO chat composer/world-button UI is bound, and the first-level world menu hierarchy is bound.
- Normal `voice-button` mode is a foundation mode only and does not send real voice.
- `renderShellPage` still owns the known route-to-view factory switch, but unknown-route fallback now lives in ViewRouter.
- Unknown `activeView` falls back to `CHAT_LIST` in ViewRouter. This is temporary fallback behavior.
- World-scoped data model foundation is read-only scaffolding and does not implement create/edit world flows.
- ovO world menu supports read-only world switching and a world editor selector scaffold.
- The current world resolver reads current sample/runtime snapshots only; it is not a persistence schema migration.
- Real memory engine integration is not implemented; `WorldMemoryScope` is a foundation placeholder.
- Real AI provider integration is not implemented; `GlobalAIModel` and `GlobalAILink` are foundation types.
- View helpers contain business/presentation derivation.
- Chat/contact mapping uses heuristic inference.
- `CONTACT_DETAIL` can render placeholder content.
- `settingsOpen` is hidden sub-navigation inside Me.
- ovO panel has read-only world switching but no world edit control flow yet.
- `OPEN_WORLD_EDITOR` is a disabled/no-op scaffold and does not open a real editor yet.
- Reality is shown as locked in the editor selector, but no real worldview edit prevention is needed yet because editing is not implemented.
- Emoji picker and file picker panel items do not dispatch follow-up controller actions.
- `SUBMIT_MESSAGE` and `SWITCH_WORLD` are the only UI actions currently handled by Flow Executor.
- Production UI code lives in a large single adapter file, so controller, router, state, view helpers, and DOM rendering are not physically separated yet.

## Current Warning

The generic `MENU_ACTION` sink has been removed from the active mobile UI action model. Its former intents are now explicit disabled actions and must not be treated as implemented product behavior.

Disabled explicit actions:

- `CREATE_AI_FRIEND`
- `CREATE_GROUP`
- `CREATE_WORLD`
- `CHAT_OPEN_GROUP_MEMBERS`
- `CHAT_OPEN_SETTINGS`
- `CHAT_OPEN_BACKGROUND_SETTINGS`
- `SETTINGS_DISCONNECT_AI`

## Stable As Of v0.1

- `src/main.ts` mounts `mountChatShell(document.body)`.
- `src/platform/index.ts` exports only `mountChatShell`.
- `mountApp`, `mountAppShell`, and `mountMinimalUiShell` throw `LegacyUiMountDisabledError`.
- `mountOvOneRuntime` throws `LegacyUiMountDisabledError` and is not an active browser UI mount.
- The active production CSS namespace is `.mvp-*`.

## Behavior Registry Status

- Behavior Registry scaffold exists in `src/platform/behavior-registry.ts`.
- `InteractionController` delegates local UI state transitions to Behavior Registry.
- ViewRouter route resolution returns `{ route, fallbackApplied, issue? }`.
- Unknown active views resolve to `CHAT_LIST` before the view layer renders.
- Runtime effects and autosave are out of scope for Behavior Registry.
- Flow Executor exists in `src/platform/flow-executor.ts`.
- Flow Executor currently handles `SUBMIT_MESSAGE` and `SWITCH_WORLD`.
- Disabled explicit actions do not execute runtime effects.

## Freeze Review Result

2026-06-27 freeze review found no undocumented implementation mismatch that blocked the Behavior Registry phase. Existing issues were intentionally documented and carried forward.

## Maintenance Rule

After every Codex implementation task, update this file with any new, resolved, or changed issue.
