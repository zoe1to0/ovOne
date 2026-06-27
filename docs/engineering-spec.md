# ovOne Engineering Spec

This document is the source of truth for current ovOne v2 engineering behavior.

## Product Definition

ovOne is a world-based AI chat platform.

The application exposes three first-level pages:

- Chats
- Contacts
- Me

Chats and Contacts are scoped to the active world. Me is global and never changes with world switching.

## Current Implementation Snapshot

```text
main.ts
  -> platform/index.ts
  -> mountChatShell(document.body)
  -> createOnboardedProductRuntime(...)
  -> local SemanticMobileState closure
  -> render()
  -> createChatShell(shell, state, render)
  -> ViewRouter.resolve(state.activeView)
  -> renderShellPage(viewState, snapshot, state, controller)
  -> DOM
```

## Current Stable Core

- Single production UI entry is `mountChatShell`.
- Legacy UI roots are disabled.
- UI actions mostly route through `InteractionController`.
- Render path is centralized through `activeView -> ViewRouter.resolve -> renderShellPage`.

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

## Current Event Flow

```text
UI event
  -> InteractionController
  -> state update
  -> commitStateTransition(state, render)
  -> ViewRouter.resolve(activeView)
  -> render()
```

## Maintenance Rule

After every Codex implementation task, update:

- `docs/engineering-spec.md`
- `docs/known-issues.md`
- `docs/decision-log.md` if a product or engineering decision changed

No future implementation task is complete until documentation is updated.
