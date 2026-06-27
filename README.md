# ovOne

ovOne is a world-based AI chat platform.

This repository is governed by the engineering spec in `docs/engineering-spec.md`.
Future implementation work must keep the documentation in sync with product and engineering decisions.

## Current Product Shape

- First-level pages: Chats, Contacts, Me.
- Chats and Contacts are scoped to the active world.
- Me is global and does not change with world switching.
- Reality is the default permanent world.
- ovO is the global system character and control layer.

## Development

```bash
npm install
npm run check
npm test
npm run build
npm run dev:check
```

## Documentation

- `docs/engineering-spec.md`: Current source of truth for architecture and implementation state.
- `docs/product-rules.md`: Frozen product rules and data ownership rules.
- `docs/decision-log.md`: Product and engineering decisions.
- `docs/known-issues.md`: Known implementation issues and drift points.
