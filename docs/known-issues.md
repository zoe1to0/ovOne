# ovOne Known Issues

Last audited: 2026-06-27.

## Current Known Engineering Issues

- `MENU_ACTION` is placeholder only.
- Some visible buttons are unbound or decorative only.
- `TEXT_INPUT` updates `inputDraft` but input is not truly controlled.
- `ViewRouter` is identity-only.
- `renderShellPage` owns real routing and has fallback behavior.
- View helpers contain business derivation.
- Chat/contact mapping uses heuristic inference.
- `CONTACT_DETAIL` can render placeholder content.
- `settingsOpen` is hidden sub-navigation inside Me.
- ovO panel has no dedicated world-switch/edit control flow beyond overlay toggling and tab shortcuts.
- Emoji picker and file picker panel items do not dispatch follow-up controller actions.
- `SUBMIT_MESSAGE` is the only UI action that currently invokes a shell runtime operation from the mobile UI controller.
- `TEXT_INPUT` returns before `commitStateTransition`, so typing state is not re-rendered.
- `renderShellPage` falls back to Me for unknown view values instead of failing explicitly.
- Production UI code lives in a large single adapter file, so controller, router, state, view helpers, and DOM rendering are not physically separated yet.
- Behavior Registry does not exist in code yet; `docs/behavior-spec.md` is currently a target contract only.
- Current action names do not yet follow the explicit Behavior Registry naming model.

## Current Warning

`MENU_ACTION` must not be treated as implemented behavior until each menu intent is mapped to a real flow.

## Stable As Of v0.1

- `src/main.ts` mounts `mountChatShell(document.body)`.
- `src/platform/index.ts` exports only `mountChatShell`.
- `mountApp`, `mountAppShell`, and `mountMinimalUiShell` throw `LegacyUiMountDisabledError`.
- `mountOvOneRuntime` throws `LegacyUiMountDisabledError` and is not an active browser UI mount.
- The active production CSS namespace is `.mvp-*`.

## Freeze Review Result

2026-06-27 freeze review found no undocumented implementation mismatch that blocks the Behavior Registry phase. Existing issues remain unresolved and intentionally documented above.

## Behavior Specification Warning

Behavior Registry principles are documented but not implemented. Until implementation begins, `MENU_ACTION` remains a placeholder sink in code.

## Maintenance Rule

After every Codex implementation task, update this file with any new, resolved, or changed issue.
