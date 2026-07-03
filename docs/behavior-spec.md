# ovOne Behavior Specification

This document is the source of truth for ovOne UI behavior actions.

Status: Behavior Registry scaffold implemented.

Last updated: 2026-06-27.

## Purpose

The Behavior Specification defines how UI intent becomes deterministic product behavior.

The current implementation uses `src/platform/behavior-registry.ts` as the central action execution scaffold for the mobile ChatShell. It does not add new product features or modify WorldDomain, ChatKernel, Snapshot, AI Adapter, or Persistence.

## Behavior Registry Principle

Every user-visible behavior must be represented by one explicit registry action.

Rules:

- Every UI event must map to exactly one explicit action.
- No generic `MENU_ACTION` sink is allowed.
- No inline behavior logic may live inside views.
- Views may bind UI events to action dispatch only.
- `InteractionController` dispatches explicit actions only.
- Behavior Registry owns UI action -> local UI state transition.
- Runtime effects and autosave remain outside Behavior Registry scope.
- Action names must describe user intent, not DOM structure.
- The same intent must use the same action from every UI entry point.
- Unimplemented behavior must be represented as an explicit disabled action, not hidden behind a generic sink.

## Implemented Flow

```text
UI event
  -> explicit action
  -> InteractionController.dispatch(action)
  -> BehaviorRegistry.execute(action, state)
  -> local SemanticMobileState transition
  -> FlowExecutor.run(action, context)
  -> optional runtime effect for SUBMIT_MESSAGE / SWITCH_WORLD / Create World confirmation / SAVE_WORLD_EDITOR / SAVE_CONTACT_DETAIL_PREFERENCES / CONFIRM_DELETE_FRIEND / ADD_WORLD_MEMBER / CONFIRM_REMOVE_WORLD_MEMBER
  -> ViewRouter.resolve(state.activeView)
  -> renderShellPage(routeState, ...)
  -> DOM
```

## Product Decisions Confirmed

- `OPEN_CHAT` is one action. It sets `activeChatId` and `activeView = CHAT_VIEW`.
- Overlays use explicit open/close actions, not toggles.
- Emoji and file picker follow-up item actions remain disabled/no-op for now.
- `TEXT_INPUT` updates `inputDraft` but does not re-render yet.
- Unknown `activeView` falls back to `CHAT_LIST`. This is a temporary fallback, not a final invariant.
- ovO click opens the special ovO chat with stable `activeChatId = "ovo"`.
- ovO chat uses the same `CHAT_VIEW` structure as other chats.
- ovO chat composer kind is `ovo` and defaults to `world-button`.
- ovO `world-button` composer shows the current world name as `📍 {world}` and opens the first-level ovO world menu.
- The first-level ovO world menu shows sibling options: Switch World and Edit World.
- Switch World opens the world switcher list and selecting a world dispatches `SWITCH_WORLD`.
- Edit World opens the world editor selector list and selecting a world dispatches `OPEN_WORLD_EDITOR`.
- `OPEN_WORLD_EDITOR` opens the route/page-like `WORLD_EDITOR` scaffold; it does not mutate world data.
- Reality appears in the editor selector and World Editor page as locked; no Reality worldview editing is allowed.
- World Editor metadata save contract validates and saves custom world `name` and `worldview`.
- Custom world name cannot be empty and shows `请输入世界名称` when invalid.
- Custom worldview can be cleared and shows `清空世界观会使该世界更接近空白世界`.
- Substantial worldview changes show `大幅修改世界观可能影响该世界内角色表现和后续体验`.
- Reality name/worldview cannot be edited and Reality save remains disabled.
- World Editor Add Member applies only to custom worlds.
- Add-member candidates come from connected Global AI Links and exclude AI already present in the selected custom world.
- Reality shows locked add-member state.
- `ADD_WORLD_MEMBER` validates the selected candidate through the add-member contract, then Flow Executor calls `shell.addWorldMember(...)`.
- Successful Add Member creates only the selected custom world's `WorldContact`, private `WorldChat`, and isolated memory placeholder metadata.
- Add Member does not mutate Reality, other worlds, existing contacts/chats/memory, groups, provider connections, Global AI Links, or initial messages.
- World Editor Remove Member applies only to custom worlds.
- Remove-member confirmation validates through `WorldRemoveMemberCommand`.
- Opening remove-member confirmation stores local confirmation state and shows `删除后，该 AI 在此世界的聊天与记忆将被清除，但不会断开全局接入。`.
- Confirming remove-member requires existing confirmation state, then Flow Executor calls `shell.removeWorldMember(...)`.
- Successful Remove Member deletes only the selected custom world's `WorldContact`, private `WorldChat`, and isolated memory placeholder metadata for that member.
- Remove Member does not mutate Reality, other worlds, groups, Global AI links/models, or provider connections.
- World Editor role/member scaffold is custom-world only.
- World Editor role/member scaffold has a user role row and current world AI member role rows.
- `UPDATE_WORLD_EDITOR_USER_ROLE_DRAFT` and `UPDATE_WORLD_EDITOR_MEMBER_ROLE_DRAFT` update local draft fields before save and show `角色设定将在保存时更新`.
- `SAVE_WORLD_EDITOR` persists custom world name/worldview metadata and allowed world-level role/member metadata.
- User role metadata is stored in world metadata; AI member role metadata is stored only on matching world-scoped contact role fields.
- World Editor role/member save contract is defined in `src/domain/world-role-editor-contract.ts` and is executed through `shell.saveWorldRoleMetadata(...)`.
- The role/member save contract allows only user `roleName` / `personaNotes` and AI member `worldRoleName` / `worldPersonaNotes`.
- The role/member save contract rejects Reality and forbids contact preferences, weather/time permissions, global AI settings, provider connection mutation, chat mutation, and memory mutation.
- World Editor owns only world-level setup: world name, worldview/world setting, user role name/identity notes in this world, and AI world role name/persona relationship/background in this world.
- World Editor must not expose contact-level preference controls such as nickname/user remark, answer mode, chat tone, or emoji permission.
- Contacts Detail owns contact-level communication preferences: remark/nickname, `你认为他是怎样的人？`, answer mode, chat tone/how the contact speaks to the user, and emoji permission.
- Contacts Detail preference draft is current-world local state until save; `SAVE_CONTACT_DETAIL_PREFERENCES` validates and persists only the allowed current-world `WorldContact` preference fields.
- Contacts Detail Delete Friend opens confirmation with `删除后，该 AI 在当前世界的聊天与记忆将被清除，但不会断开全局接入。`; confirmed delete removes only the current world's `WorldContact`, private `WorldChat`, and `WorldMemoryScope` placeholder, then routes safely to `CONTACTS`.
- Contacts Detail Delete Friend does not mutate other worlds, group chats, `GlobalAIModel`, `GlobalAILink`, provider connections, or Me Settings disconnect state.
- When an AI is removed from a world, deleted as a friend, or globally disconnected, future group handling may remove only that AI's group membership.
- Group chats, other group members, group history, and the AI's historical group messages must remain unless the user explicitly dissolves the group.
- Blank `你认为他是怎样的人？` may default from world role/worldview in custom worlds; in Reality it starts from an unfamiliar/new friend relationship.
- Me Settings owns global product-authorized context access such as weather/time.
- Weather/time access is not per-contact; after user authorization, connected AI models can read it by default until revoked in Me -> Settings.
- Individual AI contacts cannot separately disable weather/time access.
- Me Settings Linked AI disconnect is governed by `src/domain/linked-ai-disconnect-contract.ts`.
- Disconnect linked AI is separate from Contacts Detail Delete Friend.
- Opening disconnect confirmation validates an existing connected Global AI Link and shows `断开后，该 AI 将从 ovOne 的已接入 AI 中移除。各世界中的相关联系人、聊天与记忆处理将在断开流程中统一执行。`.
- Confirming linked-AI disconnect remains scaffold/no-op in this milestone and must not mutate `GlobalAIModel`, `GlobalAILink`, provider connections, worlds, contacts, chats, or memory.
- Future linked-AI disconnect cleanup planning is defined in `src/domain/linked-ai-disconnect-cleanup-plan.ts`.
- `LinkedAIDisconnectCleanupPlan` records the target Global AI Link/model, affected worlds, world contact ids, private chat ids, memory scope ids, deferred provider/global-link actions, and `groupMemberRemovalStatus`.
- Cleanup planning is deterministic and read-only; it does not execute disconnect, delete Global AI Links, delete provider connections, or mutate world contacts/chats/memory.
- Future group member removal is recorded as `not-supported-yet` when affected AI appears in groups; group membership mutation remains future work.
- Opening disconnect confirmation also builds `LinkedAIDisconnectPreviewViewModel` through `buildLinkedAIDisconnectPreview(...)`.
- The preview is read-only and lists affected worlds, selected-AI private contacts/chats/memory scopes, future group-membership removal status, group-history preservation, and the difference from deleting a friend in one world.
- Cancel closes the preview by clearing local confirmation state.
- Confirming linked-AI disconnect now routes through `guardLinkedAIDisconnectExecution(...)`.
- The guard requires a valid connected linked AI command, matching confirmation state, generated preview/cleanup plan, and passing execution contract.
- Guard failure records local scaffold error state only.
- Guard success records local `dry-run-confirmed` status and `断开流程已确认，实际断开暂未开放`; it still performs no runtime mutation.
- Linked AI disconnect execution boundaries are defined in `src/domain/linked-ai-disconnect-execution-contract.ts`.
- `LinkedAIDisconnectExecutionPlan` is derived from the existing disconnect command plus cleanup plan, records only future allowed mutations, and remains planned.
- The execution contract rejects plans that include other AI, unrelated worlds, world deletion, immediate group member removal execution, group chat deletion, group message deletion, weather/time permission mutation, user profile mutation, unrelated Contacts Detail preference mutation, or World Editor metadata mutation.
- Linked AI disconnect execution snapshot boundaries are defined in `src/domain/linked-ai-disconnect-execution-snapshot.ts`.
- `LinkedAIDisconnectExecutionSnapshot` captures the target Global AI Link plus selected-AI world contacts, private chats, memory scope ids, and future group-membership removals before any future mutation can run.
- The snapshot contract is read-only and explicitly preserves worlds, other AI, group chats, group messages, provider connection, weather/time permission, and user profile.
- `LinkedAIDisconnectRollbackPlan` is generated from the snapshot as a future restoration design only; rollback execution is not implemented.
- Linked AI disconnect preflight is defined in `src/domain/linked-ai-disconnect-preflight.ts`.
- Preflight validates the future atomic order: validate command -> create snapshot -> create rollback plan -> mark selected Global AI Link disconnecting -> remove selected-AI world contacts -> remove selected-AI private chats -> remove selected-AI memory scopes -> preserve group history -> defer selected-AI group membership removal -> defer provider connection mutation.
- Preflight is deterministic, read-only, and does not execute any disconnect mutation.
- Disabled atomic executor scaffold is defined in `src/domain/linked-ai-disconnect-atomic-executor.ts`.
- Atomic executor `disabled` mode records no operations, `simulate` mode records ordered preflight operations and rollback steps, and `execute` mode is rejected/unavailable.
- Atomic simulation is read-only and must preserve group history while keeping group membership and provider connection mutation deferred.
- Confirming linked-AI disconnect does not run real execution; it only passes or fails the guarded execution scaffold.
- ovO control overlay still exists as a read-only world switching scaffold, but it is no longer the direct ovO click path.
- World edit actions inside ovO remain later explicit actions.
- Behavior Registry owns UI action -> state transition only. Runtime effects and autosave are out of scope.
- `SWITCH_WORLD` changes `currentWorldId`, lands on `CHAT_LIST`, clears active chat/contact selection, and Flow Executor refreshes the shell view through `shell.switchWorld(worldId)`.
- Composer mode resolution is centralized in `src/platform/composer-mode.ts`.
- Normal composer supports `text` and `voice-button`.
- ovO composer supports `world-button` and `text`; ovO default resolves to `world-button` for future ovO chat binding.
- Current visible chat composer remains normal/text by default.
- Create World now opens a page-like draft flow through `OPEN_CREATE_WORLD_DRAFT`.
- Create World draft is a route/page-like view (`CREATE_WORLD_DRAFT`), not an overlay.
- The draft view is staged vertically: world name, worldview area, attached source controls, official quick-world chips, AI selection, and next mode.
- Official quick worlds render as small chips.
- Create World draft state is stored in `SemanticMobileState.createWorldDraft`, not in `WorldScopedSnapshot`.
- Create World draft validation state is stored locally as `validationError`, `fieldErrors`, and `noticeMessage`.
- `OPEN_CREATE_WORLD_DETAIL_EDIT` routes to `CREATE_WORLD_DETAIL_EDIT`, a scaffold page for world text review and role assignment mode selection.
- Confirming the Create World draft with `nextMode = "random-role"`, a non-empty name, and at least one selected AI creates a custom world through Flow Executor and the shell runtime boundary.
- Confirming the Create World draft with `nextMode = "detailed-edit"` does not create a world yet.
- Confirming Create World detailed edit with a non-empty world name and at least one selected AI creates a custom world through Flow Executor and the shell runtime boundary.
- Successful Create World confirmation sets a local loading/welcome transition scaffold and then lands on the new world's `CHAT_LIST`.
- `COMPLETE_WORLD_CREATION_TRANSITION` explicitly ends the local transition scaffold, clears `worldCreationTransition`, and keeps the user in the new world's `CHAT_LIST`.
- Transition loading text is `{worldName} 载入中…`.
- Transition welcome text uses draft identity metadata only: Empty Role, Blank World, and project-document worlds use `欢迎来到 {worldName}。`; identity worlds use `你是 {roleName}，今天是你来到 {worldName} 的第一天。`.
- If identity exists but no real generated role name exists yet, the scaffold role name is `新世界中的你`.
- Detailed Edit role modes are `random-role`, `fixed-role`, and `empty-role`.
- `empty-role` records no role assignment and does not trigger active initial reaction behavior.
- In Detailed Edit, `random-role` generates scaffold role slots equal to the user plus selected AI count.
- Each random-role slot stores `roleName` and `personaNotes`.
- `selectedUserRoleSlotId` may mark exactly one random-role slot as the user's role; selecting the same slot again clears it so all participants can be randomly assigned later.
- Invalid `selectedUserRoleSlotId` values are cleared during registry state transitions and again before Flow Executor calls the create-world service.
- `random-role` and `fixed-role` store placeholder role assignment metadata only; no real role generation is performed.
- After successful Create World confirmation, the create-world service produces a deterministic `WorldBootstrapPlan`.
- Non-empty role worlds create one scaffold initial private message per selected AI contact.
- Scaffold initial messages use explicit placeholder text and are not final generated AI content.
- Created scaffold initial private message plans are marked `stub-generated`.
- Bootstrap execution statuses are `planned`, `stub-generated`, `generated`, `skipped`, and `failed`; current runtime does not mark any item `generated` because no real LLM generation exists.
- Empty Role worlds create zero active initial private messages and zero groups.
- Bootstrap execution does not call an LLM, mutate memory, or create group chats.
- Confirming Create World without a required world name does not create a world, leaves the current create page open, and sets world-name validation to `请输入世界名称`.
- Confirming Create World without a selected AI does not create a world, leaves the current create page open, and sets selected-AI validation to `请选择至少一个 AI 朋友`.
- Document import source controls show `文档导入暂未开放` and do not switch the draft into a fake imported source state.
- Fixed Role incomplete rows show `角色信息可稍后继续完善` and do not block creation.
- Random Role empty slots show `未填写的角色将由系统随机补全` and do not block creation.
- Blank-world creation keeps selected AI original display names and records no assigned roles.
- Non-blank source creation records role assignment as a placeholder only; it is not real random generation.
- Cancelling the Create World draft clears the draft and returns to `CHAT_LIST`.

## Action Categories

### Navigation Actions

- `NAV_OPEN_CHAT_LIST`
- `NAV_OPEN_CONTACTS`
- `NAV_OPEN_ME`
- `SWITCH_WORLD`
- `OPEN_CHAT`
- `OPEN_OVO_CHAT`
- `NAV_BACK`

### Overlay Actions

- `OPEN_ADD_MENU`
- `OPEN_CHAT_MENU`
- `OPEN_OVO_CONTROL`
- `OPEN_OVO_WORLD_MENU`
- `OPEN_WORLD_SWITCHER`
- `OPEN_WORLD_EDITOR_SELECTOR`
- `OPEN_WORLD_EDITOR`
- `CANCEL_WORLD_EDITOR`
- `OPEN_EMOJI_PICKER`
- `OPEN_FILE_PICKER`
- `CLOSE_OVERLAY`

### Chat Actions

- `TOGGLE_COMPOSER_MODE`
- `SET_COMPOSER_MODE`
- `TEXT_INPUT`
- `SUBMIT_MESSAGE`
- `CHAT_OPEN_GROUP_MEMBERS`
- `CHAT_OPEN_SETTINGS`
- `CHAT_OPEN_BACKGROUND_SETTINGS`

### Contact Actions

- `OPEN_CONTACT`

### World Actions

- `SWITCH_WORLD`
- `OPEN_WORLD_EDITOR`
- `UPDATE_WORLD_EDITOR_DRAFT`
- `UPDATE_WORLD_EDITOR_USER_ROLE_DRAFT`
- `UPDATE_WORLD_EDITOR_MEMBER_ROLE_DRAFT`
- `CANCEL_WORLD_EDITOR`
- `SAVE_WORLD_EDITOR`
- `ADD_WORLD_MEMBER`
- `OPEN_REMOVE_WORLD_MEMBER_CONFIRMATION`
- `CANCEL_REMOVE_WORLD_MEMBER`
- `CONFIRM_REMOVE_WORLD_MEMBER`
- `UPDATE_CREATE_WORLD_DRAFT`
- `UPDATE_CREATE_WORLD_DETAIL`
- `UPDATE_CREATE_WORLD_RANDOM_ROLE_SLOT`
- `UPDATE_CREATE_WORLD_FIXED_ROLE`
- `TOGGLE_RANDOM_ROLE_USER_SLOT`
- `SELECT_WORLDVIEW_SOURCE`
- `TOGGLE_CREATE_WORLD_AI`
- `SELECT_CREATE_WORLD_NEXT_MODE`
- `SELECT_DETAIL_ROLE_MODE`
- `CONFIRM_CREATE_WORLD_DRAFT`
- `CONFIRM_CREATE_WORLD_DETAIL`
- `CANCEL_CREATE_WORLD_DRAFT`
- `CANCEL_CREATE_WORLD_DETAIL`
- `COMPLETE_WORLD_CREATION_TRANSITION`

### ovO Actions

- `OPEN_OVO_CHAT`
- `OPEN_OVO_CONTROL`
- `OPEN_OVO_WORLD_MENU`

### Me / Settings Actions

- `OPEN_SETTINGS`
- `CLOSE_SETTINGS`
- `OPEN_LINKED_AI_DISCONNECT_CONFIRMATION`
- `CANCEL_LINKED_AI_DISCONNECT`
- `CONFIRM_LINKED_AI_DISCONNECT`

### Creation Actions

- `CREATE_AI_FRIEND`
- `CREATE_GROUP`
- `OPEN_CREATE_WORLD_DRAFT`
- `OPEN_CREATE_WORLD_DETAIL_EDIT`
- `UPDATE_CREATE_WORLD_DRAFT`
- `UPDATE_CREATE_WORLD_DETAIL`
- `UPDATE_CREATE_WORLD_RANDOM_ROLE_SLOT`
- `UPDATE_CREATE_WORLD_FIXED_ROLE`
- `TOGGLE_RANDOM_ROLE_USER_SLOT`
- `SELECT_WORLDVIEW_SOURCE`
- `TOGGLE_CREATE_WORLD_AI`
- `SELECT_CREATE_WORLD_NEXT_MODE`
- `SELECT_DETAIL_ROLE_MODE`
- `CONFIRM_CREATE_WORLD_DRAFT`
- `CONFIRM_CREATE_WORLD_DETAIL`
- `CANCEL_CREATE_WORLD_DRAFT`
- `CANCEL_CREATE_WORLD_DETAIL`
- `COMPLETE_WORLD_CREATION_TRANSITION`

## Implemented Action Mapping

| UI intent | Registry action | Current behavior |
| --- | --- | --- |
| Open Chats tab | `NAV_OPEN_CHAT_LIST` | Sets `activeView` to `CHAT_LIST`, clears active chat/contact, closes overlay and settings. |
| Open Contacts tab | `NAV_OPEN_CONTACTS` | Sets `activeView` to `CONTACTS`, clears active chat/contact, closes overlay and settings. |
| Open Me tab | `NAV_OPEN_ME` | Sets `activeView` to `ME`, clears active chat/contact, closes overlay. |
| Switch world from ovO overlay | `SWITCH_WORLD` | Sets `currentWorldId`, lands on `CHAT_LIST`, clears active chat/contact, closes overlay/settings, and Flow Executor refreshes the shell view. |
| Open chat row | `OPEN_CHAT` | Sets `activeChatId`, sets `activeView` to `CHAT_VIEW`, resets to normal text composer, closes overlay. |
| Back | `NAV_BACK` | From contact detail returns to `CONTACTS`; otherwise returns to `CHAT_LIST` and clears active chat. |
| ovO click | `OPEN_OVO_CHAT` | Sets `activeChatId = "ovo"`, sets `CHAT_VIEW`, resets to ovO `world-button` composer, closes overlay/settings. |
| Open ovO world menu | `OPEN_OVO_WORLD_MENU` | Opens first-level ovO world menu with Switch World and Edit World as sibling options. |
| Open world switcher | `OPEN_WORLD_SWITCHER` | Opens world switcher list. Selecting a world dispatches `SWITCH_WORLD`. |
| Open world editor selector | `OPEN_WORLD_EDITOR_SELECTOR` | Opens world editor selector list. Reality is marked locked. |
| Select world to edit | `OPEN_WORLD_EDITOR` | Opens `WORLD_EDITOR` page scaffold, stores `selectedWorldIdForEditing`, initializes local `worldEditorDraft`, and closes overlay without switching worlds. |
| Update world editor draft | `UPDATE_WORLD_EDITOR_DRAFT` | Updates local World Editor draft fields for custom worlds only; does not mutate world data. |
| Update world editor user role draft | `UPDATE_WORLD_EDITOR_USER_ROLE_DRAFT` | Updates local custom-world user role scaffold fields before save and shows the save-on-submit notice. |
| Update world editor member role draft | `UPDATE_WORLD_EDITOR_MEMBER_ROLE_DRAFT` | Updates local custom-world AI member role scaffold fields before save and shows the save-on-submit notice. |
| Save world editor | `SAVE_WORLD_EDITOR` | Validates local World Editor draft through the save contracts; valid custom worlds update metadata name/worldview plus allowed world-level role/member metadata and remain on `WORLD_EDITOR`. |
| Add world member | `ADD_WORLD_MEMBER` | Validates a linked AI candidate and, for valid custom worlds, creates a world-scoped contact, private chat, and isolated memory placeholder while keeping the editor open. |
| Open remove-member confirmation | `OPEN_REMOVE_WORLD_MEMBER_CONFIRMATION` | Validates an existing custom-world AI member and stores local confirmation state with warning text. |
| Cancel remove member | `CANCEL_REMOVE_WORLD_MEMBER` | Clears local remove-member confirmation state. |
| Confirm remove member | `CONFIRM_REMOVE_WORLD_MEMBER` | Requires matching confirmation state; Flow Executor deletes the selected custom-world contact, private chat, and memory placeholder, then clears confirmation. |
| Cancel world editor | `CANCEL_WORLD_EDITOR` | Clears local World Editor state and returns safely to `CHAT_LIST`. |
| Open ovO control overlay | `OPEN_OVO_CONTROL` | Existing scaffold action that forces `CHAT_LIST`, clears active chat, and opens the first-level ovO world menu; not the direct ovO click path. |
| Plus button | `OPEN_ADD_MENU` | Opens add menu overlay. |
| Chat menu button | `OPEN_CHAT_MENU` | Opens chat menu overlay. |
| Emoji button | `OPEN_EMOJI_PICKER` | Opens emoji picker overlay. |
| File button | `OPEN_FILE_PICKER` | Opens file picker overlay. |
| Close overlay | `CLOSE_OVERLAY` | Clears current overlay. |
| Toggle composer mode | `TOGGLE_COMPOSER_MODE` | Uses composer mode state machine to rotate the current mode for the given composer kind. |
| Set composer mode | `SET_COMPOSER_MODE` | Sets the requested mode only when it is valid for the given composer kind. |
| Text input | `TEXT_INPUT` | Updates `inputDraft` and skips render. |
| Send message | `SUBMIT_MESSAGE` | Behavior Registry trims text and clears draft/overlay; Flow Executor runs the send-message runtime effect. |
| Open settings | `OPEN_SETTINGS` | Sets `settingsOpen`, closes overlay. |
| Close settings | `CLOSE_SETTINGS` | Clears `settingsOpen`, closes overlay. |
| Open linked AI disconnect confirmation | `OPEN_LINKED_AI_DISCONNECT_CONFIRMATION` | Validates a connected Global AI Link and stores local Me Settings disconnect confirmation warning plus read-only dry-run preview. |
| Cancel linked AI disconnect | `CANCEL_LINKED_AI_DISCONNECT` | Clears local linked-AI disconnect confirmation. |
| Confirm linked AI disconnect | `CONFIRM_LINKED_AI_DISCONNECT` | Runs guarded execution scaffold, records local dry-run-confirmed or guard error state, and does not mutate Global AI Link, provider connection, worlds, contacts, chats, groups, or memory. |
| Open contact | `OPEN_CONTACT` | Sets `CONTACT_DETAIL`, stores `selectedContactActorId`, closes overlay. |
| Update contact detail draft | `UPDATE_CONTACT_DETAIL_DRAFT` | Updates local current-world contact preference draft only. |
| Save contact detail preferences | `SAVE_CONTACT_DETAIL_PREFERENCES` | Validates current-world preference patch, persists only allowed `WorldContact` preference fields through Flow Executor, stays on `CONTACT_DETAIL`, and shows success notice. |
| Open delete friend confirmation | `OPEN_DELETE_FRIEND_CONFIRMATION` | Validates current-world contact and stores local delete confirmation warning. |
| Cancel delete friend | `CANCEL_DELETE_FRIEND` | Clears local delete friend confirmation. |
| Confirm delete friend | `CONFIRM_DELETE_FRIEND` | Requires matching confirmation state; Flow Executor deletes the current-world contact, private chat, and memory placeholder, then routes to `CONTACTS`. |
| Add AI friend | `CREATE_AI_FRIEND` | Explicit disabled/no-op behavior; closes overlay. |
| Create group | `CREATE_GROUP` | Explicit disabled/no-op behavior; closes overlay. |
| Create world | `OPEN_CREATE_WORLD_DRAFT` | Opens `CREATE_WORLD_DRAFT` page and initializes local draft state. |
| Open detailed edit | `OPEN_CREATE_WORLD_DETAIL_EDIT` | Opens `CREATE_WORLD_DETAIL_EDIT` scaffold and sets draft next mode to `detailed-edit`. |
| Update Create World draft text | `UPDATE_CREATE_WORLD_DRAFT` | Updates `worldName` or `worldviewText` in local draft state only. |
| Update Create World detail text | `UPDATE_CREATE_WORLD_DETAIL` | Updates detail scaffold fields in the same local draft state. |
| Update random role slot | `UPDATE_CREATE_WORLD_RANDOM_ROLE_SLOT` | Updates scaffold role name or persona/relationship notes for one random-role slot. |
| Update fixed role row | `UPDATE_CREATE_WORLD_FIXED_ROLE` | Updates placeholder role name or relationship/persona notes for a fixed-role participant. |
| Toggle random user role slot | `TOGGLE_RANDOM_ROLE_USER_SLOT` | Selects exactly one random-role slot as the user's role, or clears it when the selected slot is clicked again. |
| Select worldview source | `SELECT_WORLDVIEW_SOURCE` | Updates local draft `worldviewSourceType`. |
| Toggle Create World AI | `TOGGLE_CREATE_WORLD_AI` | Adds/removes an AI id in local draft `selectedAIModelIds`. |
| Select Create World next mode | `SELECT_CREATE_WORLD_NEXT_MODE` | Sets local draft `nextMode` to `random-role` or `detailed-edit`. |
| Select detail role mode | `SELECT_DETAIL_ROLE_MODE` | Sets detail role mode to `random-role`, `fixed-role`, or `empty-role`. |
| Confirm Create World draft | `CONFIRM_CREATE_WORLD_DRAFT` | Registry sanitizes/validates draft state; Flow Executor creates a world only for valid `random-role` with selected AI, sets transition scaffold state, then switches into it and clears draft/overlay. |
| Confirm Create World detail | `CONFIRM_CREATE_WORLD_DETAIL` | Registry sanitizes/validates draft state; Flow Executor creates a world for valid detail edit drafts with selected AI, sets transition scaffold state, then switches into it and clears draft/overlay. |
| Complete Create World transition | `COMPLETE_WORLD_CREATION_TRANSITION` | Clears local `worldCreationTransition`, keeps `currentWorldId` unchanged, and remains on `CHAT_LIST` with no active chat. |
| Cancel Create World draft | `CANCEL_CREATE_WORLD_DRAFT` | Clears local draft state and returns to `CHAT_LIST`. |
| Cancel Create World detail | `CANCEL_CREATE_WORLD_DETAIL` | Clears local draft state and returns to `CHAT_LIST`. |
| Group members | `CHAT_OPEN_GROUP_MEMBERS` | Explicit disabled/no-op behavior; closes overlay. |
| Chat settings | `CHAT_OPEN_SETTINGS` | Explicit disabled/no-op behavior; closes overlay. |
| Background settings | `CHAT_OPEN_BACKGROUND_SETTINGS` | Explicit disabled/no-op behavior; closes overlay. |

## Disabled Actions

These actions are named and routed but intentionally do not implement product behavior yet:

- `CREATE_AI_FRIEND`
- `CREATE_GROUP`
- `CHAT_OPEN_GROUP_MEMBERS`
- `CHAT_OPEN_SETTINGS`
- `CHAT_OPEN_BACKGROUND_SETTINGS`

## Composer Modes

| Composer kind | Supported modes | Default mode | Current binding |
| --- | --- | --- | --- |
| `normal` | `text`, `voice-button` | `text` | Chat composer renders `text` by default. |
| `ovo` | `world-button`, `text` | `world-button` | ovO chat composer renders `world-button` by default; keyboard action toggles it to `text`; world button opens ovO world menu. |

## Current Temporary Fallbacks

- Unknown `activeView` resolves to `{ route: "CHAT_LIST", fallbackApplied: true, issue }`.
- The unknown `activeView` fallback is owned by ViewRouter/Behavior Registry route resolution.
- `renderShellPage(...)` consumes the resolved route object and does not own unknown-route fallback.
- `SUBMIT_MESSAGE`, `SWITCH_WORLD`, `SAVE_WORLD_EDITOR`, `SAVE_CONTACT_DETAIL_PREFERENCES`, `CONFIRM_DELETE_FRIEND`, `ADD_WORLD_MEMBER`, and `CONFIRM_REMOVE_WORLD_MEMBER` are currently handled by Flow Executor.
- `CONFIRM_CREATE_WORLD_DRAFT` is handled by Flow Executor only for valid `random-role` creation.
- `CONFIRM_CREATE_WORLD_DETAIL` is handled by Flow Executor for valid detailed edit creation.
- Emoji and file picker panel items remain decorative after the overlay opens.
- ovO world-button menu hierarchy is bound, World Editor can save custom world metadata and world-level role/member metadata, Add Member can create custom-world contact/chat/memory placeholder data, confirmed Remove Member can delete custom-world contact/private chat/memory placeholder data, Contacts Detail can save current-world contact preferences and execute confirmed current-world Delete Friend, and Me Settings can open/cancel linked-AI disconnect confirmation. Actual global disconnect mutation, future group member removal, initial member messages after member add, and real memory engine integration are not implemented yet.
- Create World confirmation creates worlds for Random Role draft and valid Detailed Edit scaffold submissions, but real random role generation, document parsing, AI initial messages, and auto group creation are not implemented yet.
- Detailed Edit currently exposes scaffold fields only; Random Role role slots are collected as metadata and no real random assignment or detailed validation is implemented.
- Create World loading/welcome transition is immediate scaffold state with an explicit completion action; no real animation timing or generated identity exists yet.

## Remaining Behavior Questions

- Should unknown `activeView` eventually fail loudly in tests instead of falling back to Chat list?
- Should more runtime effects move into Flow Executor as explicit flows?
- What exact actions should ovO overlay expose for world edit?
- What storage path should persist valid `WorldEditorPatch` once real world editing behavior is in scope?
- What additional validation should Create World Detailed Edit require after real role generation exists?
- What should the normal `voice-button` mode do before real voice sending exists?
- What are the concrete product flows for the disabled creation/settings actions?

## Maintenance Rule

After any behavior implementation task, update this document with:

- added actions
- removed actions
- renamed actions
- changed execution ownership
- newly disabled or implemented actions
- unresolved behavior questions that were answered
