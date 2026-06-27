# ovOne Known Issues

Last audited: 2026-06-27.

## Current Known Engineering Issues

- Disabled explicit actions exist for creation/settings flows but do not implement product behavior yet.
- Some visible buttons are unbound or decorative only.
- `TEXT_INPUT` updates `inputDraft` but input is not truly controlled.
- `TEXT_INPUT` returns before `commitStateTransition`, so typing state is not re-rendered.
- `ViewRouter` delegates view validation to Behavior Registry, but `renderShellPage` still owns real page selection.
- Unknown `activeView` falls back to `CHAT_LIST`. This is temporary fallback behavior.
- View helpers contain business/presentation derivation.
- Chat/contact mapping uses heuristic inference.
- `CONTACT_DETAIL` can render placeholder content.
- `settingsOpen` is hidden sub-navigation inside Me.
- ovO panel has no dedicated world-switch/edit control flow beyond opening the control overlay.
- Emoji picker and file picker panel items do not dispatch follow-up controller actions.
- `SUBMIT_MESSAGE` is the only UI action that currently requests a shell runtime operation from the mobile UI controller.
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
- Runtime effects and autosave are out of scope for Behavior Registry.
- `SUBMIT_MESSAGE` currently returns a `SEND_MESSAGE` runtime effect request that the controller executes through the existing shell flow.

## Freeze Review Result

2026-06-27 freeze review found no undocumented implementation mismatch that blocked the Behavior Registry phase. Existing issues were intentionally documented and carried forward.

## Maintenance Rule

After every Codex implementation task, update this file with any new, resolved, or changed issue.
