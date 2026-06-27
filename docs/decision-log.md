# ovOne Decision Log

## 2026-06-27: World-scoped data model is frozen

Decision: World-scoped data model is frozen.

Rules:

- `GlobalAILink` is global.
- `WorldContact` is per-world.
- `Chat` is per-world.
- `Memory` is per-world.
- World switching lands on Chats list.
- Me is global.

## Maintenance Rule

After every Codex implementation task, update:

- `docs/engineering-spec.md`
- `docs/known-issues.md`
- `docs/decision-log.md` if a product or engineering decision changed

No future implementation task is complete until documentation is updated.
