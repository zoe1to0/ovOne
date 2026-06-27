# ovOne Known Issues

## Current Known Engineering Issues

- `MENU_ACTION` is placeholder only.
- Some visible buttons are unbound.
- `TEXT_INPUT` updates `inputDraft` but input is not truly controlled.
- `ViewRouter` is identity-only.
- `renderShellPage` owns real routing and has fallback behavior.
- View helpers contain business derivation.
- Chat/contact mapping uses heuristic inference.
- `CONTACT_DETAIL` can render placeholder content.
- `settingsOpen` is hidden sub-navigation inside Me.
- ovO panel has no dedicated control flow beyond overlay toggling.

## Current Warning

`MENU_ACTION` must not be treated as implemented behavior until each menu intent is mapped to a real flow.

## Maintenance Rule

After every Codex implementation task, update this file with any new, resolved, or changed issue.
