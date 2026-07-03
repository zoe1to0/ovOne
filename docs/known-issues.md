# ovOne Known Issues

Last audited: 2026-06-29.

## Current Known Engineering Issues

- Disabled explicit actions exist for creation/chat menu flows but do not implement product behavior yet.
- Some visible buttons are unbound or decorative only.
- `TEXT_INPUT` updates `inputDraft` but input is not truly controlled.
- `TEXT_INPUT` returns before `commitStateTransition`, so typing state is not re-rendered.
- ovO chat composer/world-button UI is bound, and the first-level world menu hierarchy is bound.
- Normal `voice-button` mode is a foundation mode only and does not send real voice.
- `renderShellPage` still owns the known route-to-view factory switch, but unknown-route fallback now lives in ViewRouter.
- Unknown `activeView` falls back to `CHAT_LIST` in ViewRouter. This is temporary fallback behavior.
- World-scoped data model foundation now supports minimal random-role world creation, detailed edit scaffold creation, World Editor page scaffold, custom world metadata saving, controlled custom-world Add Member execution scaffold, and confirmed custom-world Remove Member execution.
- Create World random-role and detailed-edit scaffold confirmation can create a world from selected AI and switch into it, but real random role generation, real generated/fixed role behavior, document parsing, real AI initial messages, and auto group creation are not implemented.
- Create World Detailed Edit exposes scaffold fields only; Random Role slot data and selected user role slot are placeholder metadata.
- Random Role detail slots are not assigned to participants yet; real random assignment remains unimplemented.
- World Bootstrap Planner and stub executor create deterministic placeholder private messages only; they do not generate AI text, create memory, or auto-create group chats yet.
- Create Group can create a current-world group chat with selected current-world AI contacts, but group member management, group rules, group files, initial AI messages, and real group memory behavior are not implemented.
- Chat Settings / Group Detail still has scaffold-only background upload, group add/remove member, group rules save, and group files. Appearance color/background reference save is implemented for selected-chat metadata only.
- Group rules have a text draft and validation contract, but `SAVE_GROUP_RULES` does not persist rules or affect AI behavior yet.
- Chat Settings image upload remains unimplemented; `backgroundImageRef` can be saved only as an existing draft/reference value, not through real upload.
- Create World loading/welcome transition is scaffold state with explicit completion, but no polished animation timing, real generated identity, or loading process exists yet.
- Create World missing-name and missing-AI validation are explicit, but broader validation beyond required world name and selected AI is not implemented yet.
- ovO world menu supports read-only world switching and a World Editor page scaffold.
- The current world resolver reads current sample/runtime snapshots only; it is not a persistence schema migration.
- Real memory engine integration is not implemented; `WorldMemoryScope` is a foundation placeholder.
- Real AI provider integration is not implemented; `GlobalAIModel` and `GlobalAILink` are foundation types.
- View helpers contain business/presentation derivation.
- Chat/contact mapping uses heuristic inference.
- `CONTACT_DETAIL` now renders Contacts Detail preference/delete content; preference saving and confirmed current-world Delete Friend are implemented.
- `settingsOpen` is hidden sub-navigation inside Me.
- ovO panel has read-only world switching, custom world metadata saving, world-level role/member metadata saving, Contacts Detail preference saving, Contacts Detail confirmed Delete Friend, Add Member execution for custom-world contact/chat/memory placeholder creation, and confirmed Remove Member execution for custom-world contact/private chat/memory placeholder deletion, but no group membership cleanup, initial member messages after member add, real Me Settings disconnect execution, or real memory engine integration yet.
- `SAVE_WORLD_EDITOR` persists custom world name/worldview metadata plus allowed world-level role/member metadata; it must not be treated as Contacts Detail preference editing, chat editing, memory editing, GlobalAIModel editing, or GlobalAILink editing.
- World Editor role/member scaffold now collects and saves world-level user role and AI member role metadata for custom worlds.
- World Editor role/member scaffold must not be treated as Contacts Detail behavior; contact remark/nickname, `你认为他是怎样的人？`, answer mode, chat tone/how the contact speaks to the user, and emoji permission remain outside World Editor.
- Contacts Detail preference controls persist current-world `WorldContact` preference fields; confirmed Delete Friend removes current-world contact/private chat/memory placeholder data but does not perform future group-member removal or global disconnect.
- Me Settings global context authorization for weather/time is documented as an account-level boundary, but real authorization UI and permission enforcement are not implemented yet.
- Me Settings Linked AI shows a disconnect confirmation and read-only dry-run preview from Global AI Links and has deterministic cleanup, execution-contract, and guarded-execution scaffolds, but confirmed global disconnect mutation is not implemented yet.
- Linked AI disconnect cleanup planning records affected worlds, contacts, private chats, memory scope ids, and unsupported future group-member removal status; guarded execution validates the future mutation boundary and records local dry-run confirmation, but it does not execute Global AI Link/provider/world cleanup yet.
- Linked AI disconnect execution snapshots and rollback plans are design contracts only; they capture the future mutation scope and restoration requirements but do not execute disconnect or rollback.
- Linked AI disconnect preflight validates future operation order only; actual Global AI Link/provider/world cleanup execution remains unimplemented.
- Linked AI disconnect atomic executor is disabled/simulation-only; `execute` mode is unavailable and real runtime mutation remains unimplemented.
- Group-member removal is not implemented yet; group chats, other group members, group history, and removed AI historical group messages must remain until explicit group dissolution behavior exists.
- World Editor Add Member creates only custom-world `WorldContact`, private `WorldChat`, and isolated memory placeholder metadata; it must not be treated as role editing, group membership, initial message generation, provider connection management, or real memory engine behavior.
- World Editor Remove Member deletes only custom-world `WorldContact`, private `WorldChat`, and memory placeholder metadata after confirmation; it must not be treated as group-member removal execution, group chat deletion, group message deletion, provider disconnect, Global AI Link deletion, Reality mutation, other-world mutation, or real memory-engine cleanup.
- Create World import document options are disabled with an inline unavailable notice; official quick world options remain scaffold placeholders only.
- Reality is shown as locked in the editor selector and World Editor page; Reality worldview editing remains unavailable.
- Emoji picker and file picker panel items do not dispatch follow-up controller actions.
- `SUBMIT_MESSAGE`, `SWITCH_WORLD`, valid random-role `CONFIRM_CREATE_WORLD_DRAFT`, valid `CONFIRM_CREATE_WORLD_DETAIL`, valid `CONFIRM_CREATE_GROUP`, valid custom-world `SAVE_WORLD_EDITOR`, valid `SAVE_CONTACT_DETAIL_PREFERENCES`, valid `SAVE_CHAT_SETTINGS`, confirmed `CONFIRM_DELETE_FRIEND`, valid custom-world `ADD_WORLD_MEMBER`, and confirmed custom-world `CONFIRM_REMOVE_WORLD_MEMBER` are the UI actions currently handled by Flow Executor.
- Production UI code lives in a large single adapter file, so controller, router, state, view helpers, and DOM rendering are not physically separated yet.

## Current Warning

The generic `MENU_ACTION` sink has been removed from the active mobile UI action model. Its former intents are now explicit disabled actions and must not be treated as implemented product behavior.

Disabled explicit actions:

- `CREATE_AI_FRIEND`
- `CHAT_OPEN_GROUP_MEMBERS`
- `CHAT_OPEN_SETTINGS`
- `CHAT_OPEN_BACKGROUND_SETTINGS`

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
- Flow Executor currently handles `SUBMIT_MESSAGE`, `SWITCH_WORLD`, valid Create World confirmations, custom world metadata save, Contacts Detail preference save, Chat Settings appearance save, confirmed Contacts Detail Delete Friend, custom world Add Member, and confirmed custom world Remove Member.
- Disabled explicit actions do not execute runtime effects.

## Freeze Review Result

2026-06-27 freeze review found no undocumented implementation mismatch that blocked the Behavior Registry phase. Existing issues were intentionally documented and carried forward.

## Maintenance Rule

After every Codex implementation task, update this file with any new, resolved, or changed issue.
