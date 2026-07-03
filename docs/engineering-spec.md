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
  -> optional shell operation for SUBMIT_MESSAGE / SWITCH_WORLD / Create World confirmation / SAVE_WORLD_EDITOR / SAVE_CONTACT_DETAIL_PREFERENCES / CONFIRM_DELETE_FRIEND / ADD_WORLD_MEMBER / CONFIRM_REMOVE_WORLD_MEMBER
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
- Create World service: `src/minimal-ui-shell/create-world-service.ts`.
- Composer mode state machine: `src/platform/composer-mode.ts`.
- World-scoped data model foundation: `src/domain/world-model.ts`.
- Read-only world scope resolver: `src/domain/world-scope-resolver.ts`.
- World Bootstrap Planner scaffold: `src/domain/world-bootstrap-planner.ts`.
- Runtime bootstrap used by UI: `createOnboardedProductRuntime({ storage: createBrowserWorldStorage() }).shell`.
- Initial UI state:
  - `splashVisible: true`
  - `activeView: "CHAT_LIST"`
  - `currentWorldId: initialView.product.snapshot.worldMeta.id`
  - `activeChatId: null`
  - `overlay: null`
  - `selectedContactActorId: null`
  - `selectedWorldIdForEditing: null`
  - `composerMode: resolveDefaultComposerMode("normal")`
  - `inputDraft: ""`
  - `settingsOpen: false`
  - `createWorldDraft: null`
  - `worldEditorDraft: null`
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
- ovO header dispatches `OPEN_OVO_CHAT`, opens `CHAT_VIEW`, and uses stable `activeChatId = "ovo"`.
- ovO ChatView uses the same chat page structure as other chats, but its composer kind is `ovo`.
- ovO composer defaults to `world-button`, displays `📍 {currentWorldName}`, opens the first-level ovO world menu, and can toggle to text mode through `TOGGLE_COMPOSER_MODE`.
- First-level ovO world menu contains sibling options `OPEN_WORLD_SWITCHER` and `OPEN_WORLD_EDITOR_SELECTOR`.
- World switcher lists `state.view.availableWorlds`, marks the current world, and dispatches `SWITCH_WORLD`.
- World editor selector lists `state.view.availableWorlds`, marks the current world, marks Reality as locked, and dispatches `OPEN_WORLD_EDITOR`.
- `OPEN_WORLD_EDITOR` routes to the page-like `WORLD_EDITOR` scaffold, stores `selectedWorldIdForEditing`, initializes local `worldEditorDraft`, and does not switch worlds.
- World Editor shows world name, worldview/world setting, role/member scaffold, add AI member scaffold, and a Reality lock note when editing Reality.
- World Editor role/member scaffold is custom-world only and initializes local draft fields for a user role row plus current world AI member rows.
- World Editor role/member draft fields are `userRole.roleName`, `userRole.personaNotes`, `memberRoles[].worldRoleName`, and `memberRoles[].worldPersonaNotes`.
- World Editor role/member draft updates are local until `SAVE_WORLD_EDITOR`; valid custom-world saves persist the allowed role/member fields as world-level metadata.
- World Editor role/member save contract lives in `src/domain/world-role-editor-contract.ts`.
- `WorldRoleEditorPatch` permits only world-level role setup fields: user `roleName` / `personaNotes` and AI member `worldRoleName` / `worldPersonaNotes`.
- `validateWorldRoleEditorPatch(...)` rejects Reality and rejects contact preferences, weather/time permissions, global AI settings, provider connection mutation, chat mutation, and memory mutation.
- `SAVE_WORLD_EDITOR` calls `shell.saveWorldMetadata(...)` for name/worldview and `shell.saveWorldRoleMetadata(...)` for role/member metadata.
- User role metadata is stored in `metadata.worldView.worldEditorUserRole`; AI member role metadata is stored only on the matching world-scoped `WorldContact.worldRoleName` and `WorldContact.worldPersonaNotes` fields.
- World Editor owns only world-level setup: world name, worldview/world setting, user role name/identity notes in this world, and AI world role name/persona relationship/background in this world.
- World Editor must not expose contact-level communication controls such as nickname/user remark, answer mode, chat tone, or emoji permission.
- Contacts Detail owns contact-level communication preferences: remark/nickname, `你认为他是怎样的人？`, answer mode, chat tone/how the contact speaks to the user, and emoji permission.
- Contacts Detail preference/delete contract lives in `src/domain/contact-detail-contract.ts`.
- `ContactDetailPreferencePatch` permits only `worldId`, `worldContactId`, `remark`, `perceivedPersonaNotes`, `answerMode`, `chatTone`, and `emojiPermission`.
- `SAVE_CONTACT_DETAIL_PREFERENCES` persists only the allowed current-world `WorldContact` preference fields through `shell.saveContactDetailPreferences(...)`.
- `DeleteFriendCommand` permits only `worldId` and `worldContactId`; confirmed Delete Friend requires matching confirmation state and runs through `shell.deleteFriend(...)`.
- Confirmed Delete Friend deletes only the current world's `WorldContact`, private `WorldChat`, and `WorldMemoryScope` placeholder, then routes to `CONTACTS` and clears active contact/chat selection.
- Confirmed Delete Friend preserves `currentWorldId` and must not mutate other worlds, group chats, world metadata, world role/background metadata, `GlobalAIModel`, `GlobalAILink`, provider connections, weather/time permission, or Me Settings disconnect state.
- AI removal through World Editor Remove Member, Contacts Detail Delete Friend, or future Linked AI disconnect may later remove only that AI's group membership.
- Group chats, other group members, group history, and the AI's historical group messages must remain unless the user explicitly dissolves the group.
- Contact Detail preference save must not mutate world name, worldview, world roles, weather/time permission, `GlobalAIModel`, `GlobalAILink`, `ProviderConnection`, chats, memory, or other worlds.
- Me Settings Linked AI disconnect contract lives in `src/domain/linked-ai-disconnect-contract.ts`.
- Linked AI disconnect is global and separate from Contacts Detail Delete Friend.
- Me Settings disconnect confirmation validates an existing connected Global AI Link and shows `断开后，该 AI 将从 ovOne 的已接入 AI 中移除。各世界中的相关联系人、聊天与记忆处理将在断开流程中统一执行。`.
- `CONFIRM_LINKED_AI_DISCONNECT` is scaffold/no-op in this milestone and must not mutate `GlobalAIModel`, `GlobalAILink`, provider connections, Reality/custom worlds, contacts, chats, or memory.
- Linked AI disconnect cleanup planning lives in `src/domain/linked-ai-disconnect-cleanup-plan.ts`.
- `createLinkedAIDisconnectCleanupPlan(...)` produces a deterministic read-only plan for every world containing the linked AI model.
- Cleanup plan items include `worldId`, `worldTitle`, `worldContactIds`, `privateChatIds`, `memoryScopeIds`, and `groupMemberRemovalStatus`.
- Cleanup plans keep `providerConnectionAction = "not-executed-yet"`, `globalLinkAction = "not-executed-yet"`, and `status = "planned"`.
- Cleanup planning does not mutate Global AI Links, provider connections, worlds, contacts, chats, memory, or groups.
- Linked AI disconnect preview lives in `src/domain/linked-ai-disconnect-preview.ts`.
- `buildLinkedAIDisconnectPreview(...)` derives a deterministic read-only preview from `LinkedAIDisconnectCleanupPlan` and `LinkedAIDisconnectExecutionPlan`.
- Opening disconnect confirmation stores the preview in local `linkedAIDisconnectConfirmation.preview` only; this is UI state and does not execute disconnect.
- The preview displays affected worlds, selected-AI private contacts/chats/memory scopes, future group-membership removal status, group-history preservation notes, and the distinction from current-world Delete Friend.
- Guarded Linked AI disconnect execution scaffold lives in `src/domain/linked-ai-disconnect-guarded-executor.ts`.
- `guardLinkedAIDisconnectExecution(...)` validates the connected linked AI command, matching confirmation state, generated preview, cleanup plan, and execution contract before any future execution can proceed.
- Guard failures update only local confirmation error state; valid guard confirmation marks local status as `dry-run-confirmed` and shows `断开流程已确认，实际断开暂未开放`.
- Linked AI disconnect execution contract lives in `src/domain/linked-ai-disconnect-execution-contract.ts`.
- `LinkedAIDisconnectExecutionPlan` is derived from the existing command plus cleanup plan and remains `status = "planned"`.
- The execution contract allows only future selected Global AI Link status/removal flag changes, selected AI world-contact cleanup, selected AI private-chat cleanup, selected AI memory-scope cleanup, selected AI group-membership removal later, and future provider connection status handling.
- The execution contract forbids world deletion, other-AI mutation, unrelated contact/chat/memory mutation, World Editor metadata mutation, unrelated Contacts Detail preference mutation, group-chat deletion, group-message deletion, weather/time permission mutation, user profile mutation, `GlobalAIModel` mutation, and immediate provider mutation.
- `CONFIRM_LINKED_AI_DISCONNECT` routes through the guarded executor scaffold but remains no-runtime-mutation; it does not run through Flow Executor yet.
- Blank `你认为他是怎样的人？` may default from world role/worldview in custom worlds; in Reality it starts from an unfamiliar/new friend relationship.
- Me Settings owns global product-authorized context access such as weather/time.
- Weather/time access is not per-contact; after user authorization, connected AI models can read it by default until the user revokes it in Me -> Settings.
- Individual AI contacts cannot separately disable weather/time access.
- `SAVE_WORLD_EDITOR` validates the local draft through `WorldEditorPatch` and `WorldRoleEditorPatch` contracts, then Flow Executor calls `shell.saveWorldMetadata(...)` and `shell.saveWorldRoleMetadata(...)` for custom worlds.
- Valid custom world saves update only world metadata name/title and worldview; the app remains on `WORLD_EDITOR`.
- World Editor save contract permits only `worldId`, `name`, and `worldview` fields for custom worlds.
- World Editor metadata save contract forbids mutation to `WorldContact`, `WorldChat`, `WorldMemory`, `GlobalAIModel`, `GlobalAILink`, and Reality name/worldview; the separate role save contract permits only `WorldContact.worldRoleName` and `WorldContact.worldPersonaNotes` updates for custom-world AI members.
- Empty custom world names show `请输入世界名称`.
- Cleared custom worldview shows `清空世界观会使该世界更接近空白世界`.
- Changed custom worldview shows `大幅修改世界观可能影响该世界内角色表现和后续体验`.
- Reality name/worldview fields are locked and Reality save is disabled.
- World Editor add-member contract lives in `src/domain/world-member-contract.ts`.
- `WorldAddMemberCommand` contains `worldId` and `globalAILinkId`.
- `resolveAddMemberCandidates(...)` returns connected Global AI Links that are not already represented in the selected custom world.
- `canAddMemberToWorld(...)` rejects Reality.
- `ADD_WORLD_MEMBER` validates through the add-member contract and Flow Executor calls `shell.addWorldMember(...)` for valid custom worlds.
- Add-member execution creates only a new world-scoped `WorldContact`, private `WorldChat`, and isolated `WorldMemoryScope` placeholder metadata for the selected custom world.
- Add-member execution does not switch `currentWorldId`, does not mutate Reality, does not mutate other worlds, does not mutate existing contacts/chats/memory, does not mutate `GlobalAIModel` or `GlobalAILink`, does not create group chats, and does not trigger initial messages.
- World Editor remove-member contract lives in `src/domain/world-member-remove-contract.ts`.
- `WorldRemoveMemberCommand` contains `worldId` and `actorId`.
- `canRemoveMemberFromWorld(...)` rejects Reality.
- Remove-member opens a confirmation state first; confirmed removal runs through Flow Executor and `shell.removeWorldMember(...)`.
- Confirmed remove-member deletes only the selected custom world's `WorldContact`, private `WorldChat`, and isolated memory placeholder metadata for that member.
- Confirmed remove-member does not mutate Reality, other worlds, groups, `GlobalAIModel`, `GlobalAILink`, or provider connections.
- Remove-member confirmation warning text is `删除后，该 AI 在此世界的聊天与记忆将被清除，但不会断开全局接入。`.
- Add menu Create World dispatches `OPEN_CREATE_WORLD_DRAFT` and routes to the page-like `CREATE_WORLD_DRAFT` view.
- Create World draft state lives in `SemanticMobileState.createWorldDraft` until confirmation.
- Create World validation state lives in `createWorldDraft.validationError`, `createWorldDraft.fieldErrors`, and `createWorldDraft.noticeMessage`.
- Create World draft view is a staged vertical flow: world name, worldview text area with attached source controls, small official quick-world chips, AI selection, and next mode.
- `OPEN_CREATE_WORLD_DETAIL_EDIT` routes to `CREATE_WORLD_DETAIL_EDIT`, a scaffold route for reviewing/editing world name, worldview text, and role assignment mode.
- `CONFIRM_CREATE_WORLD_DRAFT` with `nextMode = "random-role"`, a non-empty world name, and at least one selected AI runs through Flow Executor and `shell.createWorldFromDraft(...)`.
- Minimal random-role creation creates a custom world from selected AI ids, appends it to `availableWorlds`, switches to the new world, lands on `CHAT_LIST`, clears active chat/contact/overlay/settings state, and clears the draft.
- `CONFIRM_CREATE_WORLD_DRAFT` with `nextMode = "detailed-edit"` or a missing world name does not create a world yet and keeps the draft open.
- `CONFIRM_CREATE_WORLD_DETAIL` with a non-empty world name and at least one selected AI runs through Flow Executor and `shell.createWorldFromDraft(...)`.
- `CONFIRM_CREATE_WORLD_DRAFT` and `CONFIRM_CREATE_WORLD_DETAIL` both pass through the same validation/sanitization gate before runtime creation.
- Missing world name shows `请输入世界名称`; missing AI selection shows `请选择至少一个 AI 朋友`; document import source controls show `文档导入暂未开放` without changing source state.
- Fixed Role incomplete rows and Random Role empty slots do not block creation; they show helper text only.
- Successful Create World confirmation sets local `worldCreationTransition` scaffold state with loading and welcome text, then lands on the new world's `CHAT_LIST`.
- `COMPLETE_WORLD_CREATION_TRANSITION` clears local `worldCreationTransition`, keeps `currentWorldId` unchanged, and remains on `CHAT_LIST` with no active chat.
- Create World welcome text is resolved by `src/platform/world-creation-transition.ts` from the draft identity scaffold only; it does not call an LLM or generate real roles.
- Empty Role, Blank World, and project-document worlds use no-identity welcome text; worldview/official/text worlds use explicit user role names when present or safe placeholder `新世界中的你`.
- Detailed Edit supports role modes `random-role`, `fixed-role`, and `empty-role`; role content remains placeholder metadata.
- Detailed Edit Random Role mode creates scaffold role slots equal to user plus selected AI count.
- Random Role slots store `roleName` and `personaNotes`; `selectedUserRoleSlotId` optionally marks one slot as the user's role and can be cleared for fully random future assignment.
- Invalid `selectedUserRoleSlotId` values are cleared before create-world runtime effects execute.
- Empty Role creation records role assignment as `none`.
- Blank-world creation keeps selected AI original display names and stores role assignment as `none`.
- Non-blank source creation stores role assignment as `placeholder`; no real role generation is performed.
- Create World service calls World Bootstrap Planner during custom world creation and stores the deterministic `bootstrapPlan` in world metadata.
- `bootstrapPlan` contains private initial message and group plan metadata; it does not call an LLM, create memory, or create group chats.
- Non-empty role worlds create one scaffold initial private message per selected AI contact using explicit placeholder text.
- Created scaffold initial private message plans are marked `stub-generated`.
- Bootstrap execution statuses are `planned`, `stub-generated`, `generated`, `skipped`, and `failed`; current runtime uses only `planned` and `stub-generated`.
- Empty Role worlds create zero active initial private messages and zero groups.
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
- `selectedWorldIdForEditing`
- `composerMode`
- `inputDraft`
- `settingsOpen`
- `createWorldDraft`
- `worldEditorDraft`
  - nested `userRole` and `memberRoles` local role/member scaffold fields
- `worldCreationTransition`
- `splashVisible`
- `view`

## Current View States

- `CHAT_LIST`
- `CHAT_VIEW`
- `CONTACTS`
- `CONTACT_DETAIL`
- `ME`
- `CREATE_WORLD_DRAFT`
- `CREATE_WORLD_DETAIL_EDIT`
- `WORLD_EDITOR`

Unknown view values resolve to `CHAT_LIST` inside ViewRouter. This is a temporary fallback, not final invariant behavior.

## Current Overlay States

- `add-menu`
- `chat-menu`
- `ovo-control`
- `ovo-world-menu`
- `world-switcher`
- `world-editor-selector`
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
- `OPEN_OVO_CHAT`
- `NAV_BACK`
- `OPEN_ADD_MENU`
- `OPEN_CHAT_MENU`
- `OPEN_OVO_CONTROL`
- `OPEN_OVO_WORLD_MENU`
- `OPEN_WORLD_SWITCHER`
- `OPEN_WORLD_EDITOR_SELECTOR`
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
- `OPEN_EMOJI_PICKER`
- `OPEN_FILE_PICKER`
- `CLOSE_OVERLAY`
- `TOGGLE_COMPOSER_MODE`
- `SET_COMPOSER_MODE`
- `TEXT_INPUT`
- `SUBMIT_MESSAGE`
- `OPEN_SETTINGS`
- `CLOSE_SETTINGS`
- `OPEN_LINKED_AI_DISCONNECT_CONFIRMATION`
- `CANCEL_LINKED_AI_DISCONNECT`
- `CONFIRM_LINKED_AI_DISCONNECT`
- `OPEN_CONTACT`
- `CREATE_AI_FRIEND`
- `CREATE_GROUP`
- `CHAT_OPEN_GROUP_MEMBERS`
- `CHAT_OPEN_SETTINGS`
- `CHAT_OPEN_BACKGROUND_SETTINGS`

## Current Action Behavior

| Action | Current behavior |
| --- | --- |
| `NAV_OPEN_CHAT_LIST` | Sets `CHAT_LIST`, clears active chat/contact, closes overlay and settings. |
| `NAV_OPEN_CONTACTS` | Sets `CONTACTS`, clears active chat/contact, closes overlay and settings. |
| `NAV_OPEN_ME` | Sets `ME`, clears active chat/contact, closes overlay. |
| `SWITCH_WORLD` | Sets `currentWorldId`, lands on `CHAT_LIST`, clears active chat/contact, closes overlay/settings, and Flow Executor refreshes the shell view. |
| `OPEN_CHAT` | Sets `activeChatId`, sets `activeView` to `CHAT_VIEW`, resets to normal text composer, closes overlay. |
| `NAV_BACK` | From `CONTACT_DETAIL` returns to `CONTACTS`; otherwise returns to `CHAT_LIST` and clears active chat. |
| `OPEN_OVO_CHAT` | Sets `activeChatId = "ovo"`, opens `CHAT_VIEW`, resets to ovO `world-button` composer, closes overlay/settings. |
| `OPEN_OVO_WORLD_MENU` | Opens first-level ovO world menu with Switch World and Edit World as sibling options. |
| `OPEN_WORLD_SWITCHER` | Opens world switcher list. |
| `OPEN_WORLD_EDITOR_SELECTOR` | Opens world editor selector list and marks Reality locked. |
| `OPEN_WORLD_EDITOR` | Opens `WORLD_EDITOR` page scaffold, stores `selectedWorldIdForEditing`, initializes local `worldEditorDraft`, and closes overlay without switching worlds. |
| `OPEN_OVO_CONTROL` | Existing scaffold action that forces `CHAT_LIST`, clears active chat, opens first-level ovO world menu; not the direct ovO click path. |
| `OPEN_ADD_MENU` | Opens `add-menu` overlay. |
| `OPEN_CHAT_MENU` | Opens `chat-menu` overlay. |
| `OPEN_EMOJI_PICKER` | Opens `emoji-picker` overlay. |
| `OPEN_FILE_PICKER` | Opens `file-picker` overlay. |
| `CLOSE_OVERLAY` | Clears overlay. |
| `TOGGLE_COMPOSER_MODE` | Rotates the current composer mode for the requested composer kind. |
| `SET_COMPOSER_MODE` | Sets the requested composer mode only when valid for the requested composer kind. |
| `TEXT_INPUT` | Updates `inputDraft` only and does not call render. |
| `SUBMIT_MESSAGE` | Behavior Registry trims text, clears draft/overlay, and Flow Executor calls `shell.sendMessage(text)`. |
| `OPEN_SETTINGS` | Sets `settingsOpen`, closes overlay. |
| `CLOSE_SETTINGS` | Clears `settingsOpen`, closes overlay. |
| `OPEN_LINKED_AI_DISCONNECT_CONFIRMATION` | Validates a connected Global AI Link and stores local Me Settings disconnect confirmation warning plus read-only dry-run preview. |
| `CANCEL_LINKED_AI_DISCONNECT` | Clears local linked-AI disconnect confirmation state. |
| `CONFIRM_LINKED_AI_DISCONNECT` | Routes through guarded disconnect execution scaffold, records local `dry-run-confirmed` or guard error state, and does not mutate `GlobalAIModel`, `GlobalAILink`, provider connections, worlds, contacts, chats, groups, or memory. |
| `OPEN_CONTACT` | Sets `CONTACT_DETAIL`, stores `selectedContactActorId`, closes overlay. |
| `UPDATE_CONTACT_DETAIL_DRAFT` | Updates local current-world contact preference draft only. |
| `SAVE_CONTACT_DETAIL_PREFERENCES` | Validates local preference draft through `ContactDetailPreferencePatch`; Flow Executor persists only current-world `WorldContact` preference fields and stays on `CONTACT_DETAIL`. |
| `OPEN_DELETE_FRIEND_CONFIRMATION` | Validates a current-world contact and stores local Delete Friend confirmation. |
| `CANCEL_DELETE_FRIEND` | Clears local Delete Friend confirmation. |
| `CONFIRM_DELETE_FRIEND` | Requires matching confirmation state; Flow Executor deletes the current-world contact, private chat, and memory placeholder through `shell.deleteFriend(...)`, then routes to `CONTACTS`. |
| `CREATE_AI_FRIEND` | Explicit disabled/no-op behavior; closes overlay. |
| `CREATE_GROUP` | Explicit disabled/no-op behavior; closes overlay. |
| `OPEN_CREATE_WORLD_DRAFT` | Opens `CREATE_WORLD_DRAFT` page and initializes local draft state. |
| `OPEN_CREATE_WORLD_DETAIL_EDIT` | Sets draft next mode to `detailed-edit` and opens `CREATE_WORLD_DETAIL_EDIT` scaffold page. |
| `UPDATE_CREATE_WORLD_DRAFT` | Updates local draft `worldName` or `worldviewText`. |
| `UPDATE_CREATE_WORLD_DETAIL` | Updates detail scaffold fields in the same local draft. |
| `UPDATE_CREATE_WORLD_RANDOM_ROLE_SLOT` | Updates scaffold role name or persona/relationship notes for one random-role slot. |
| `UPDATE_CREATE_WORLD_FIXED_ROLE` | Updates placeholder fixed role row fields. |
| `TOGGLE_RANDOM_ROLE_USER_SLOT` | Selects exactly one random-role slot as the user's role, or clears the selection when clicked again. |
| `SELECT_WORLDVIEW_SOURCE` | Updates local draft worldview source type. |
| `TOGGLE_CREATE_WORLD_AI` | Adds/removes an AI id in local draft selected AI list. |
| `SELECT_CREATE_WORLD_NEXT_MODE` | Updates local draft next mode. |
| `SELECT_DETAIL_ROLE_MODE` | Updates detail scaffold role assignment mode. |
| `CONFIRM_CREATE_WORLD_DRAFT` | Registry validates/sanitizes draft state; Flow Executor creates a world only for `random-role` with a non-empty name and selected AI, sets transition scaffold state, then clears draft/overlay and lands on `CHAT_LIST`. |
| `CONFIRM_CREATE_WORLD_DETAIL` | Registry validates/sanitizes draft state; Flow Executor creates a world for valid detail edit drafts with selected AI, sets transition scaffold state, then clears draft/overlay and lands on `CHAT_LIST`. |
| `CANCEL_CREATE_WORLD_DRAFT` | Clears local draft and returns to `CHAT_LIST`. |
| `CANCEL_CREATE_WORLD_DETAIL` | Clears local draft and returns to `CHAT_LIST`. |
| `COMPLETE_WORLD_CREATION_TRANSITION` | Clears local `worldCreationTransition`, keeps the current world unchanged, and remains on `CHAT_LIST` with no active chat. |
| `UPDATE_WORLD_EDITOR_DRAFT` | Updates local World Editor draft fields for custom worlds only; does not mutate world data. |
| `UPDATE_WORLD_EDITOR_USER_ROLE_DRAFT` | Updates local custom-world user role scaffold fields only; does not mutate world data or contact preferences. |
| `UPDATE_WORLD_EDITOR_MEMBER_ROLE_DRAFT` | Updates local custom-world AI member role scaffold fields before save; does not mutate `WorldContact`, chats, memory, or contact preferences during draft editing. |
| `SAVE_WORLD_EDITOR` | Validates local World Editor draft with the save contracts; valid custom worlds save name/worldview through `shell.saveWorldMetadata(...)` and role/member metadata through `shell.saveWorldRoleMetadata(...)`. |
| `ADD_WORLD_MEMBER` | Validates the selected linked AI against the add-member contract; Flow Executor creates the custom-world contact/chat/memory placeholder through `shell.addWorldMember(...)` and leaves the editor open. |
| `OPEN_REMOVE_WORLD_MEMBER_CONFIRMATION` | Validates the selected existing custom-world AI member and stores local confirmation state with deletion warning text. |
| `CANCEL_REMOVE_WORLD_MEMBER` | Clears local remove-member confirmation state. |
| `CONFIRM_REMOVE_WORLD_MEMBER` | Requires matching confirmation state; Flow Executor removes the selected custom-world contact/private chat/memory placeholder and clears confirmation. |
| `CANCEL_WORLD_EDITOR` | Clears local World Editor state and returns safely to `CHAT_LIST`. |
| `CHAT_OPEN_GROUP_MEMBERS` | Explicit disabled/no-op behavior; closes overlay. |
| `CHAT_OPEN_SETTINGS` | Explicit disabled/no-op behavior; closes overlay. |
| `CHAT_OPEN_BACKGROUND_SETTINGS` | Explicit disabled/no-op behavior; closes overlay. |

## Current Router Behavior

`ViewRouter` delegates route resolution to Behavior Registry:

```text
resolve(activeView) -> {
  route: "CHAT_LIST" | "CHAT_VIEW" | "CONTACTS" | "CONTACT_DETAIL" | "ME" | "CREATE_WORLD_DRAFT" | "CREATE_WORLD_DETAIL_EDIT" | "WORLD_EDITOR",
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
| `CONTACT_DETAIL` | `createContactDetailView(snapshot, state, controller)` |
| `ME` | `createMeView(snapshot, state.settingsOpen, controller)` |
| `CREATE_WORLD_DRAFT` | `createCreateWorldDraftView(snapshot, state, controller)` |
| `CREATE_WORLD_DETAIL_EDIT` | `createCreateWorldDetailEditView(snapshot, state, controller)` |
| `WORLD_EDITOR` | `createWorldEditorView(snapshot, state, controller)` |

## Current Flow Executor Behavior

`FlowExecutor` owns runtime effects after Behavior Registry has applied local UI state transitions.

| Action | Runtime effect |
| --- | --- |
| `SUBMIT_MESSAGE` with non-empty trimmed text | Calls `shell.sendMessage(text)`, updates `state.view`, syncs `activeChatId`, and sets `activeView` to `CHAT_VIEW`. |
| `SUBMIT_MESSAGE` with empty trimmed text | No runtime effect. |
| `SWITCH_WORLD` | Calls `shell.switchWorld(worldId)`, updates `state.view`, and syncs `currentWorldId` from the resulting snapshot. |
| `CONFIRM_CREATE_WORLD_DRAFT` with `nextMode = "random-role"`, non-empty name, and selected AI | Calls `shell.createWorldFromDraft(draft)`, updates `state.view`, syncs `currentWorldId`, sets `worldCreationTransition`, lands on `CHAT_LIST`, clears active chat/contact/overlay/settings state, and clears `createWorldDraft`. |
| `CONFIRM_CREATE_WORLD_DRAFT` with `nextMode = "detailed-edit"` or missing name | No runtime effect. |
| `CONFIRM_CREATE_WORLD_DETAIL` with non-empty name, selected AI, and `nextMode = "detailed-edit"` | Calls `shell.createWorldFromDraft(draft)`, updates `state.view`, syncs `currentWorldId`, sets `worldCreationTransition`, lands on `CHAT_LIST`, clears active chat/contact/overlay/settings state, and clears `createWorldDraft`. |
| `CONFIRM_CREATE_WORLD_DETAIL` with missing name | No runtime effect. |
| `SAVE_WORLD_EDITOR` with valid custom-world draft | Calls `shell.saveWorldMetadata(...)` and `shell.saveWorldRoleMetadata(...)`, updates `state.view`, keeps `currentWorldId` unchanged, keeps `activeView = WORLD_EDITOR`, clears active chat/contact/overlay/settings state, and shows save success. |
| `ADD_WORLD_MEMBER` with a valid custom-world linked AI candidate | Calls `shell.addWorldMember(command)`, updates `state.view`, keeps `currentWorldId` unchanged, keeps `activeView = WORLD_EDITOR`, clears active chat/contact/overlay/settings state, and shows `已添加`. |
| `ADD_WORLD_MEMBER` with Reality, unlinked AI, or existing world member | No world mutation; shows validation notice in the World Editor draft. |
| `CONFIRM_REMOVE_WORLD_MEMBER` with matching confirmation state | Calls `shell.removeWorldMember(command)`, updates `state.view`, keeps `currentWorldId` unchanged, clears confirmation, shows `已删除`, and if the deleted chat was active lands on `CHAT_LIST` with `activeChatId = null`. |
| `CONFIRM_REMOVE_WORLD_MEMBER` without matching confirmation state | No runtime effect; remove requires explicit confirmation state. |
| Disabled explicit actions | No runtime effect. |
| All other actions | No runtime effect. |

## Current View Derivation

View helpers still derive presentation data from `WorldSnapshot`:

- `createComposer(snapshot, state, controller)` resolves `normal` or `ovo` composer kind from `activeChatId`.
- `isOvoChatId(state.activeChatId)` treats stable `activeChatId = "ovo"` as the ovO special chat route.
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
  -> optional runtime effect handling for SUBMIT_MESSAGE / SWITCH_WORLD / Create World confirmation / SAVE_WORLD_EDITOR / SAVE_CONTACT_DETAIL_PREFERENCES / CONFIRM_DELETE_FRIEND / ADD_WORLD_MEMBER / CONFIRM_REMOVE_WORLD_MEMBER
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
- Create World draft edit actions mutate only local `createWorldDraft` state.
- Random-role Create World draft confirmation, valid Detailed Edit confirmation, and valid custom-world Add Member are the world actions with Flow Executor runtime effects.
- Create World transition is currently immediate scaffold state with an explicit completion action; no real animation timing or generated role identity exists yet.

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
- ovO world-button menu hierarchy is bound, but real world editing is not implemented yet.
- Normal `voice-button` mode is a foundation mode only and does not send real voice.
- `renderShellPage` still owns the known route-to-view factory switch, but unknown-route fallback now lives in ViewRouter.
- Unknown `activeView` falls back to `CHAT_LIST` in ViewRouter.
- Minimal random-role Create World and Detailed Edit scaffold confirmation create and switch into a custom world, but real role generation, document parsing, AI initial messages, and auto group creation are not implemented.
- ovO world menu supports read-only world switching and editor selection scaffold, but no create/edit world flow is implemented yet.
- No real memory engine or AI provider integration exists behind the world-scoped model foundation.
- View helpers contain business/presentation derivation.
- Chat/contact mapping uses heuristic inference.
- `CONTACT_DETAIL` renders current-world preference/delete content; preference save is implemented for current-world `WorldContact` fields, and confirmed Delete Friend deletes only current-world contact/private chat/memory placeholder data.
- `settingsOpen` is hidden sub-navigation inside Me.
- ovO panel has read-only world switching but no world edit control flow yet.
- Emoji picker and file picker panel items do not dispatch follow-up controller actions.
- `SUBMIT_MESSAGE`, `SWITCH_WORLD`, `CONFIRM_CREATE_WORLD_DRAFT`, `CONFIRM_CREATE_WORLD_DETAIL`, `SAVE_WORLD_EDITOR`, `SAVE_CONTACT_DETAIL_PREFERENCES`, `CONFIRM_DELETE_FRIEND`, and `ADD_WORLD_MEMBER` are the UI actions with Flow Executor runtime effects.
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
