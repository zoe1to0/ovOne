# ovOne Decision Log

## 2026-07-03: Group rules save implemented

Decision: Group rules can now be saved as selected group chat metadata.

Rules:

- `SAVE_GROUP_RULES` validates `GroupRulesPatch` and runs through Flow Executor.
- The runtime shell writes only `WorldChatSession.groupRules.rulesText` for the selected group chat.
- Empty rules are allowed and mean no extra group-level rules.
- Saving group rules stays on `CHAT_SETTINGS` and shows `已保存`.
- Saving group rules must not mutate private chats, other group chats, other worlds, messages/history, group membership, group files, group memory, contact preferences, world metadata/role metadata, Global AI data, provider connections, weather/time permission, AI prompts, or AI behavior.
- Group rules are stored only; runtime enforcement and prompt injection remain future work.

## 2026-07-03: Group rules contract scaffold added

Decision: Group Rules now has a pure contract and local Chat Settings scaffold for text-based group rules.

Rules:

- Group rules belong only to one group chat in the current world.
- `GroupRulesPatch` may only contain `worldId`, `groupChatId`, and `rulesText`.
- Empty `rulesText` is valid and means no extra group-level rules beyond world/contact settings.
- Private chats, other group chats, other worlds, Reality/global settings, group members/files/messages/history/memory, contact preferences, world metadata, Global AI data, provider connections, and actual AI prompt behavior are outside this contract.
- `UPDATE_GROUP_RULES_DRAFT` updates only local Chat Settings draft state.
- At this decision point, `SAVE_GROUP_RULES` remained scaffold/no-op; this is superseded by the later Group rules save implementation above.

## 2026-07-03: v0.7 chat settings core milestone

Decision: `v0.7-chat-settings-core` marks the Chat Settings core milestone.

Scope:

- Chat Settings / Group Detail route/page scaffold.
- Private chat settings page.
- Group chat settings page.
- Group members, group rules, and group files scaffolds.
- Upload background image scaffold.
- Chat background color save.
- My bubble color save.
- Opposite side bubble color save.
- Per-chat appearance save scoped by `worldId + chatId`.
- No mutation to messages/history, group membership, group rules/files, contact preferences, world metadata/role metadata, Global AI data, provider connections, or weather/time permission.

## 2026-07-03: Chat settings appearance save implemented

Decision: `SAVE_CHAT_SETTINGS` now persists allowed per-chat appearance metadata through Flow Executor and the shell runtime boundary.

Rules:

- The save path validates `ChatSettingsPatch` before runtime mutation.
- Only the selected `WorldChatSession.appearance` can be updated.
- The mutation is scoped to `worldId + chatId`.
- Empty appearance fields remain valid and mean default appearance.
- Saving a private chat does not affect other private chats; saving a group chat does not affect other group chats; saving in one world does not affect another world.
- Save success stays on `CHAT_SETTINGS` and shows `已保存`.
- Background image upload remains scaffold/no-op; saving `backgroundImageRef` only stores an existing draft/reference value.
- The save path must not mutate messages/history, group membership, group rules/files, contact preferences, world metadata, world role metadata, Global AI data, provider connections, or weather/time permission.

## 2026-07-03: Chat settings save contract added

Decision: Chat Settings now has a pure save contract for future per-chat appearance persistence.

Rules:

- Allowed future patch fields are `worldId`, `chatId`, `backgroundImageRef`, `backgroundColor`, `myBubbleColor`, and `otherBubbleColor`.
- The patch must target a chat that exists in the selected/current world.
- Empty appearance fields are allowed and mean default appearance.
- The contract forbids chat messages/history, group membership, group rules, group files, contact/world/global/provider settings, and weather/time permission mutation.
- At this decision point, `SAVE_CHAT_SETTINGS` validated the contract but remained scaffold/no-op; this is superseded by the later Chat settings appearance save implementation above.

## 2026-07-03: Chat settings page scaffold added

Decision: Chat `...` settings now opens a full `CHAT_SETTINGS` route/page for private and group chats.

Rules:

- Private chat settings show only current chat appearance scaffolds.
- Group chat settings show group members, add/remove member scaffolds, group rules scaffold, group files scaffold, and current chat appearance scaffolds.
- Background image upload, group add/remove member, group rules, and group files remain scaffold/no-op behavior only.
- At this scaffold stage, color settings save did not persist; this is superseded by the later Chat settings appearance save implementation above.
- Chat settings must not mutate group membership, chat messages/history, group rules/files, or chat identity.

## 2026-07-03: v0.6 create group core milestone

Decision: `v0.6-create-group-core` marks the Create Group core milestone.

Scope:

- Create Group draft route.
- Current-world-only member selection.
- At least one AI member required.
- Blank group names default to `群聊`.
- Current-world group chat creation.
- Placeholder group memory metadata.
- Auto-enter newly created group chat.
- Chat List group title without member count.
- Chat View header with member count.
- No group rules, group files, post-creation member management, or initial AI messages yet.

## 2026-07-03: Group chat title display aligned

Decision: Group chat display now separates chat-list title from chat-view header title.

Rules:

- Empty Create Group names default to `群聊`.
- Chat List shows only the group name and never appends member count.
- Chat View header shows `群名称（x）`.
- The member count includes the user plus selected AI members.

## 2026-07-03: Create Group core scaffold added

Decision: Create Group now creates a current-world group chat from selected current-world AI contacts.

Rules:

- `+ -> 创建群聊` opens `CREATE_GROUP_DRAFT`.
- Candidate members come only from the current world's AI contacts.
- At least one AI member is required.
- Valid confirmation creates a current-world `WorldGroup`, empty group `WorldChat`, and placeholder group memory metadata.
- After creation, the app enters the new group chat with `activeView = CHAT_VIEW` and `activeChatId` set to the new group chat id.
- Group creation is allowed in Reality and custom worlds and must not affect other worlds.
- Group creation does not generate initial AI messages, does not support member management after creation, does not add group rules/files, and does not implement a real memory engine.

## 2026-07-03: v0.5.1 settings disconnect execution safety milestone

Decision: `v0.5.1-settings-disconnect-execution-safety` marks the Settings disconnect execution safety milestone.

Scope:

- Linked AI disconnect contract.
- Deterministic cleanup plan.
- Read-only disconnect preview.
- Guarded confirmation.
- Execution snapshot and rollback plan.
- Preflight operation order.
- Disabled atomic executor.
- `execute` mode remains rejected.
- No `GlobalAILink`, provider connection, world, contact, chat, memory, group membership, group chat, or group message mutation is enabled.

## 2026-07-03: Disabled Linked AI disconnect atomic executor added

Decision: Linked AI disconnect now has a disabled atomic executor scaffold for future execution simulation, but real disconnect remains unavailable.

Rules:

- The atomic executor scaffold lives in `src/domain/linked-ai-disconnect-atomic-executor.ts`.
- Mode `disabled` returns disabled with no operations and no mutation.
- Mode `simulate` walks preflight operations and records rollback steps without mutating runtime data.
- Mode `execute` is rejected/unavailable.
- Simulation preserves group history, keeps group membership removal deferred, keeps provider connection mutation deferred, and must not mutate `GlobalAILink`, provider connections, worlds, contacts, chats, memory, or groups.

## 2026-07-03: Linked AI disconnect execution preflight added

Decision: Future real Linked AI disconnect now has a deterministic preflight operation order, but real execution remains disabled.

Rules:

- The preflight contract lives in `src/domain/linked-ai-disconnect-preflight.ts`.
- Preflight validates command, snapshot, rollback plan, and future operation ordering before any future mutation can run.
- Future operation order is validate command, create snapshot, create rollback plan, mark selected Global AI Link disconnecting, remove selected-AI world contacts, remove selected-AI private chats, remove selected-AI memory scopes, preserve group history, defer selected-AI group membership removal, and defer provider connection mutation.
- Preflight is read-only and performs no runtime mutation.
- Guarded Linked AI disconnect confirmation validates preflight readiness but remains dry-run only.

## 2026-07-03: Linked AI disconnect execution snapshot contract added

Decision: Real Linked AI disconnect remains disabled, but future execution now has a read-only execution snapshot and rollback contract.

Rules:

- The snapshot contract lives in `src/domain/linked-ai-disconnect-execution-snapshot.ts`.
- `LinkedAIDisconnectExecutionSnapshot` captures only the selected linked AI's target `GlobalAILink`, affected worlds, world contacts, private chats, memory scope ids, and future group-membership removal records.
- Snapshots explicitly preserve worlds, other AI, group chats, group messages, provider connection, weather/time permission, and user profile.
- Group records are membership-only and must preserve group chats, group messages, and removed AI historical group messages.
- `LinkedAIDisconnectRollbackPlan` documents future restoration requirements but does not execute rollback.
- Guarded Linked AI disconnect confirmation remains dry-run only and performs no runtime mutation.

## 2026-07-03: Guarded Linked AI disconnect execution scaffold added

Decision: `CONFIRM_LINKED_AI_DISCONNECT` now routes through a guarded execution scaffold before any future real disconnect execution can exist.

Rules:

- The guarded executor lives in `src/domain/linked-ai-disconnect-guarded-executor.ts`.
- It requires a valid connected linked AI command, matching confirmation state, generated preview/cleanup plan, and passing execution contract.
- Guard failures record local scaffold error state only.
- Guard success records local `dry-run-confirmed` status and `断开流程已确认，实际断开暂未开放`.
- Guard success still performs no runtime mutation.
- `GlobalAILink`, provider connections, worlds, contacts, chats, memory, groups, group memberships, group chats, and group messages remain unchanged.

## 2026-07-03: v0.5 settings disconnect contract milestone

Decision: `v0.5-settings-disconnect-contract` marks the Settings disconnect contract milestone.

Scope:

- Me Settings Linked AI disconnect contract.
- Deterministic cleanup plan.
- Execution contract with future mutation boundaries.
- Read-only disconnect preview / dry-run.
- Group history preservation rules.
- Confirm remains scaffold/no-op.
- No runtime disconnect mutation is implemented yet.

## 2026-07-03: Linked AI disconnect preview dry-run added

Decision: Me Settings Linked AI disconnect now opens a deterministic read-only preview before any future global disconnect execution.

Rules:

- The preview is derived from `LinkedAIDisconnectCleanupPlan` and `LinkedAIDisconnectExecutionPlan`.
- It lists affected worlds and the selected AI's private contacts, private chats, and memory scopes that would be removed later.
- It surfaces future group-membership removal as non-destructive planned behavior.
- Group chats, group history, group messages, and removed AI historical group messages must remain.
- The preview states that global disconnect is different from deleting one friend in the current world.
- Confirm remains scaffold/no-op and must not mutate Global AI Links, provider connections, worlds, contacts, chats, memory, or groups.

## 2026-07-03: Group history preservation clarified for AI removal

Decision: AI removal paths preserve group chats and group history; future group handling may remove only the affected AI's group membership.

Rules:

- Applies to World Editor Remove Member, Contacts Detail Delete Friend, and Me Settings Linked AI Disconnect cleanup planning.
- Private chat cleanup is allowed for the removed AI in the affected scope.
- Private memory scope cleanup is allowed for the removed AI in the affected scope.
- Future group handling may remove only the affected AI's group membership.
- Group chats must remain, other group members must remain, group history must remain, and the removed AI's historical group messages must remain visible.
- Group content may be deleted only when the user explicitly dissolves the group.
- Linked AI disconnect cleanup plan terminology uses `groupMemberRemovalStatus`.
- Group member removal remains future work and must not execute in the current scaffold.

## 2026-07-01: Linked AI disconnect execution contract scaffold added

Decision: Global linked-AI disconnect now has an execution contract that defines the future mutation boundary without executing disconnect.

Rules:

- The execution contract lives in `src/domain/linked-ai-disconnect-execution-contract.ts`.
- `LinkedAIDisconnectExecutionPlan` is derived from the existing disconnect command plus `LinkedAIDisconnectCleanupPlan`.
- Execution plans remain `planned`; `CONFIRM_LINKED_AI_DISCONNECT` still performs no runtime cleanup.
- Future allowed mutations are limited to the selected Global AI Link status/removal flag, selected AI world contacts, selected AI private chats, selected AI world memory scopes, selected AI group membership later, and future provider connection status if explicitly supported.
- The contract forbids world deletion, other-AI mutation, unrelated contact/chat/memory mutation, World Editor metadata mutation, unrelated Contacts Detail preference mutation, group-chat deletion, group-message deletion, weather/time permission mutation, user profile mutation, `GlobalAIModel` mutation, and immediate provider mutation.
- Unsupported group-member removal must surface as a warning and must not be silently executed.
- Reconnect is a separate future lifecycle and remains out of scope.

## 2026-06-30: Linked AI disconnect cleanup plan scaffold added

Decision: Global linked-AI disconnect now has a deterministic read-only cleanup plan scaffold before real disconnect execution.

Rules:

- The cleanup planner lives in `src/domain/linked-ai-disconnect-cleanup-plan.ts`.
- `LinkedAIDisconnectCleanupPlan` targets one Global AI Link/model and records affected worlds.
- Each affected world item records world contact ids, private chat ids, memory scope ids, and group member removal status.
- Provider connection and Global AI Link actions remain `not-executed-yet`; plan status remains `planned`.
- Cleanup planning must not mutate runtime state, Global AI Links, provider connections, worlds, contacts, chats, memory, or groups.
- Worlds without the linked AI are excluded, and other AI are excluded.
- Future group member removal is recorded as `not-supported-yet` when needed; real group membership mutation remains future work.

## 2026-06-30: Me Settings Linked AI disconnect contract scaffold added

Decision: Me Settings now owns a linked-AI global disconnect contract and confirmation scaffold without runtime disconnect mutation.

Rules:

- Delete Friend and Disconnect Linked AI are separate actions.
- Contacts Detail Delete Friend remains current-world-only and does not affect the Global AI Link.
- Linked AI disconnect can only be initiated from Me -> Settings -> Linked AI.
- The linked-AI list is derived from Global AI Links, not world contacts.
- Disconnect opens strong confirmation text: `断开后，该 AI 将从 ovOne 的已接入 AI 中移除。各世界中的相关联系人、聊天与记忆处理将在断开流程中统一执行。`
- Confirming disconnect is scaffold/no-op in this milestone.
- The scaffold must not delete `GlobalAIModel`, `GlobalAILink`, provider connections, world contacts, chats, memory, Reality, or custom worlds.
- Weather/time-style global context permission remains Me Settings responsibility and is not contact-level.

## 2026-06-30: v0.4-contacts-detail-core milestone tagged

Decision: `v0.4-contacts-detail-core` marks the completed Contacts Detail Core milestone.

Rules:

- The milestone includes the Contacts Detail preference contract.
- The milestone includes Contacts Detail preference save execution.
- The milestone includes Delete Friend confirmation and confirmed Delete Friend execution.
- Confirmed Delete Friend performs current-world-only contact, private chat, and memory placeholder cleanup.
- Reality Delete Friend does not disconnect the Global AI Link or provider connection.
- World Editor responsibility boundaries remain preserved.
- No new runtime behavior is introduced by this tag record.

## 2026-06-30: Contacts Detail Delete Friend execution implemented

Decision: Confirmed Contacts Detail Delete Friend now performs controlled current-world deletion.

Rules:

- Delete Friend requires existing Contacts Detail confirmation state.
- Confirmed Delete Friend deletes only the current world's `WorldContact`, private `WorldChat`, and `WorldMemoryScope` placeholder for that AI.
- Reality Delete Friend removes only the Reality contact/chat/memory placeholder and preserves the global AI link/provider connection.
- Custom-world Delete Friend does not mutate Reality or other custom worlds.
- Delete Friend routes safely to `CONTACTS`, clears `activeChatId`, clears `selectedContactActorId`, and preserves `currentWorldId`.
- Delete Friend does not mutate group chats, world metadata, world role/background metadata, `GlobalAIModel`, `GlobalAILink`, `ProviderConnection`, weather/time permission, or Me Settings disconnect state.

## 2026-06-29: Contacts Detail preference save implemented

Decision: `SAVE_CONTACT_DETAIL_PREFERENCES` now persists allowed current-world contact preference fields through a controlled runtime boundary.

Rules:

- Contacts Detail saves only `WorldContact.remark`, `WorldContact.perceivedPersonaNotes`, `WorldContact.answerMode`, `WorldContact.chatTone`, and `WorldContact.emojiPermission`.
- Preference save is scoped to `worldId` plus `worldContactId`; saving one world does not affect Reality or other custom worlds.
- Empty `perceivedPersonaNotes` is valid and remains available for later fallback behavior.
- Preference save must not mutate world name, worldview, world role/background metadata, chats, memory, `GlobalAIModel`, `GlobalAILink`, `ProviderConnection`, weather/time permission, or other worlds.
- At this decision point Delete Friend remained scaffold/no-op; this is superseded by the later Contacts Detail Delete Friend execution decision above.

## 2026-06-29: Contacts Detail preference and Delete Friend contract scaffold added

Decision: Contacts Detail now has a current-world preference/delete contract and local UI scaffold without persistence or deletion mutation.

Rules:

- Contacts Detail owns contact-level current-world fields: remark/nickname, `你认为他是怎样的人？`, answer mode, chat tone, emoji permission, and Delete Friend.
- `ContactDetailPreferencePatch` allows only `worldId`, `worldContactId`, `remark`, `perceivedPersonaNotes`, `answerMode`, `chatTone`, and `emojiPermission`.
- Contacts Detail rejects World Editor fields, weather/time permission, `GlobalAIModel`, `GlobalAILink`, `ProviderConnection`, chat mutation, memory mutation, and other-world mutation.
- Delete Friend validates only the current-world contact and opens confirmation before future deletion.
- Delete Friend confirmation text is `删除后，该 AI 在当前世界的聊天与记忆将被清除，但不会断开全局接入。`
- Confirm Delete Friend is scaffold/no-op in this milestone and does not delete contacts, chats, memory, global links, or provider connections.
- True global disconnect remains owned by Me -> Settings -> Linked AI.

## 2026-06-29: v0.3-world-editor-core milestone tagged

Decision: `v0.3-world-editor-core` marks the completed World Editor Core milestone.

Rules:

- The milestone includes the World Editor route/page scaffold.
- The milestone includes Reality lock behavior.
- The milestone includes custom world metadata save for world name/worldview.
- The milestone includes Add Member execution.
- The milestone includes Remove Member execution.
- The milestone includes user world-level role metadata save.
- The milestone includes AI member `worldRoleName` / `worldPersonaNotes` save.
- Contacts Detail responsibility boundaries remain preserved.
- Chat, memory, global AI link, and provider mutation remain outside World Editor except for the explicitly defined member lifecycle boundaries.

## 2026-06-29: World Editor role/member metadata save implemented

Decision: `SAVE_WORLD_EDITOR` now persists allowed world-level role/member metadata for custom worlds through a controlled runtime boundary.

Rules:

- Valid custom-world saves still persist name/worldview metadata.
- Valid custom-world saves also persist `WorldRoleEditorPatch` data through `shell.saveWorldRoleMetadata(...)`.
- User role metadata is stored under `metadata.worldView.worldEditorUserRole`; AI member role metadata is stored on the matching world-scoped `WorldContact` fields `worldRoleName` and `worldPersonaNotes`.
- Reality rejects role/member metadata saves.
- Contacts Detail fields remain outside World Editor: remark/nickname, `你认为他是怎样的人？`, answer mode, chat tone, and emoji permission.
- Me Settings fields remain outside World Editor: global weather/time permission.
- Role metadata saving does not mutate contact preference fields, chats, memory, `GlobalAIModel`, `GlobalAILink`, or provider connections; it may update only `WorldContact.worldRoleName` and `WorldContact.worldPersonaNotes` for custom-world AI members.

## 2026-06-29: World Editor role/member save contract defined

Decision: Future World Editor role/member saving is governed by a pure custom-world-only contract before runtime mutation is implemented. This contract is now executed by the later role/member metadata save implementation above.

Rules:

- `WorldRoleEditorPatch` allows only user role `roleName` / `personaNotes` and AI member `worldRoleName` / `worldPersonaNotes`.
- Empty role fields are allowed and mean future fallback to world/create defaults.
- Reality rejects role/member save patches.
- World Editor role/member save contract forbids contact nickname/remark, `你认为他是怎样的人？`, answer mode, chat tone, emoji permission, weather/time permission, global AI link/model settings, provider connection mutation, chat mutation, and memory mutation.
- At this decision point, `SAVE_WORLD_EDITOR` continued to save only custom world name/worldview metadata; this was superseded by the role/member metadata save implementation above.

## 2026-06-29: Product responsibility boundaries clarified

Decision: World Editor, Contacts Detail, and Me Settings have separate product ownership boundaries.

Rules:

- World Editor owns only world-level setup: world name, worldview/world setting, user role name/identity notes in this world, and AI world role name/persona relationship/background in this world.
- World Editor must not own contact-level communication preferences.
- Contacts Detail owns contact-level preferences: remark/nickname, `你认为他是怎样的人？`, answer mode, chat tone/how the contact speaks to the user, and emoji permission.
- If `你认为他是怎样的人？` is blank in a custom world, its default may derive from world role/worldview; if blank in Reality, it starts from an unfamiliar/new friend relationship.
- Me Settings owns global product-authorized context access such as weather/time.
- Weather/time access is not configured per contact; after authorization, connected AI models can read it by default until the user revokes access in Me -> Settings.
- Individual AI contacts cannot separately disable weather/time access.

## 2026-06-29: World Editor role/member scaffold added

Decision: World Editor now exposes custom-world role/member draft fields as a scaffold for future world-level role/background setup. The draft-only save limitation from this decision was superseded by the later role/member metadata save implementation above.

Rules:

- World Editor role/member scaffold applies only to custom worlds; Reality remains locked.
- The scaffold includes a user role row and current world AI member role rows.
- At this decision point, draft fields were local only and were not persisted by `SAVE_WORLD_EDITOR`; this was superseded by the role/member metadata save implementation above.
- At this decision point, `SAVE_WORLD_EDITOR` mutated only custom world name/worldview metadata; this was superseded by the role/member metadata save implementation above.
- World Editor must not expose contact-level communication preferences such as nickname/user remark, answer mode, chat tone, or emoji permission.
- Contacts detail remains the owner for contact-level communication preferences.

## 2026-06-29: World Editor Remove Member execution implemented

Decision: Confirmed World Editor Remove Member now performs controlled custom-world deletion.

Rules:
- Remove Member remains custom-world only; Reality rejects remove-member through World Editor.
- Remove requires existing confirmation state before runtime execution.
- Confirmed removal deletes only the selected world's `WorldContact`, private `WorldChat`, and `WorldMemoryScope` placeholder metadata for that member.
- Remove Member does not mutate Reality, other worlds, group chats, `GlobalAIModel`, `GlobalAILink`, or provider connections.
- Re-adding the same AI later must create a brand-new world-scoped contact/chat/memory instance; old world memory is not recoverable.
- Group-member removal, initial messages after member add/remove, and real memory engine cleanup remain out of scope.

## 2026-06-29: World Editor Remove Member contract scaffold added

Decision: World Editor Remove Member is defined as a custom-world-only contract with confirmation UI before real deletion is implemented.

Rules:

- Remove Member applies only to custom worlds; Reality rejects remove-member through World Editor.
- `WorldRemoveMemberCommand` contains `worldId` and `actorId`.
- Remove Member confirmation must show: `删除后，该 AI 在此世界的聊天与记忆将被清除，但不会断开全局接入。`
- At this contract-scaffold decision point, confirming removal performed no deletion; this was superseded by the later Remove Member execution decision above.
- Future deletion may remove only that AI's `WorldContact`, private `WorldChat`, and `WorldMemoryScope` in the selected custom world.
- Future deletion must not affect Reality, other worlds, `GlobalAIModel`, `GlobalAILink`, provider connections, or group chats in this scaffold phase.
- Re-adding the same AI later should create a brand-new world-scoped contact/chat/memory instance; old world memory cannot be recovered.

## 2026-06-29: World Editor Add Member execution scaffold implemented

Decision: World Editor Add Member now performs a controlled custom-world mutation for existing linked AI models.

Rules:

- Add Member remains custom-world only; Reality rejects add-member through World Editor.
- Candidate AI must come from existing connected Global AI Links and must not already be present in the selected custom world.
- Successful Add Member creates only a new world-scoped `WorldContact`, private `WorldChat`, and isolated `WorldMemoryScope` placeholder metadata for the selected custom world.
- Add Member does not switch `currentWorldId`, including when editing a non-current world.
- Add Member does not mutate Reality, other worlds, existing contacts/chats/memory, `GlobalAIModel`, `GlobalAILink`, group chats, provider connections, or initial messages.
- Future initial message after adding a member should use bootstrap-like logic, but remains out of scope.

## 2026-06-28: World Editor add-member contract scaffold added

Decision: World Editor add-member behavior is defined as a contract and read-only UI scaffold before real mutation is implemented.

Rules:

- Add Member inside World Editor applies only to custom worlds.
- Reality cannot add members through World Editor.
- Add-member candidates come from existing connected Global AI Links.
- Candidate resolution excludes AI models already represented in the selected custom world.
- Future add-member mutation may create only a new `WorldContact`, `WorldChat`, and `WorldMemoryScope` for that custom world.
- Future add-member mutation must not inherit memory from Reality or any other world.
- Future add-member mutation must not affect Reality, other worlds, existing contacts/chats/memory, `GlobalAIModel`, `GlobalAILink`, group chats, or provider connections.
- Initial message after adding a member is desired later via bootstrap-like logic, but remains out of scope.
- At this decision point, the UI showed disabled scaffold controls only and performed no mutation; this is superseded by the Add Member execution scaffold decision above.

## 2026-06-28: World Editor metadata save implemented

Decision: `SAVE_WORLD_EDITOR` now persists custom world metadata through the runtime boundary.

Rules:

- Valid custom world saves update only world name/title and worldview metadata.
- Save execution flows through `UI -> BehaviorRegistry validation -> FlowExecutor -> shell.saveWorldMetadata(...) -> WorldDomain`.
- Saving keeps the app on `WORLD_EDITOR`.
- Saving the current world refreshes current world labels.
- Saving a non-current world updates `availableWorlds` without switching `currentWorldId`.
- Reality name/worldview remain locked and cannot be mutated.
- Contacts, roles, members, chats, memory, `GlobalAIModel`, and `GlobalAILink` remain outside World Editor save scope.

## 2026-06-28: World Editor save contract defined

Decision: World Editor save behavior is governed by a pure save contract. At this decision point mutation was not implemented; this was later superseded by the metadata save implementation above.

Rules:

- Custom worlds may edit only `worldId`, `name`, and `worldview` patch fields.
- Custom world name cannot be empty.
- Custom worldview can be cleared, but the UI warns: `清空世界观会使该世界更接近空白世界`.
- Substantial worldview edits warn: `大幅修改世界观可能影响该世界内角色表现和后续体验`.
- Reality name and worldview cannot be edited.
- The contract explicitly forbids mutation to `WorldContact`, `WorldChat`, `WorldMemory`, `GlobalAIModel`, `GlobalAILink`, and Reality name/worldview.
- At this decision point, `SAVE_WORLD_EDITOR` validated local draft state but performed no world mutation; this is superseded by metadata save implementation.

## 2026-06-28: World Editor page scaffold added

Decision: Selecting a world from the ovO editor selector now opens a route/page-like World Editor scaffold.

Rules:

- `OPEN_WORLD_EDITOR(worldId)` opens `WORLD_EDITOR` and stores `selectedWorldIdForEditing`.
- World Editor uses local `worldEditorDraft` state only.
- Opening World Editor does not switch `currentWorldId`.
- Reality can be opened in World Editor but shows locked worldview state.
- Custom worlds show editable-looking world name and worldview fields.
- At this scaffold stage, `SAVE_WORLD_EDITOR` showed `保存暂未开放` and performed no world mutation; this is superseded by metadata save implementation.
- At this scaffold decision point, role/member editing, add member, memory mutation, and real saving were unimplemented; later decisions superseded add/remove member execution, metadata saving, and local role/member draft scaffolding.

## 2026-06-28: v0.2.1-create-world-lifecycle milestone tagged

Decision: `v0.2.1-create-world-lifecycle` marks the Create World lifecycle milestone after v0.2 Create World Core.

Rules:

- The milestone includes v0.2 Create World Core.
- The milestone includes Create World validation UX.
- The milestone includes explicit `worldCreationTransition` lifecycle handling.
- The milestone includes `COMPLETE_WORLD_CREATION_TRANSITION`.
- The milestone preserves stable landing in the new world's `CHAT_LIST` after transition completion.
- No new product behavior is introduced by this tag record.

## 2026-06-28: Create World transition lifecycle made explicit

Decision: The local Create World loading/welcome scaffold now has an explicit completion action.

Rules:

- `COMPLETE_WORLD_CREATION_TRANSITION` clears `worldCreationTransition`.
- Completing the transition keeps `currentWorldId` unchanged.
- Completing the transition keeps the app on `CHAT_LIST` with no active chat.
- The transition remains scaffold UI only; no real animation timing, LLM call, memory engine, group chat creation, or Create World core behavior change is introduced.

## 2026-06-28: Create World validation UX improved

Decision: Existing Create World validation now exposes clearer inline feedback without changing create-world core logic.

Rules:

- Missing world name shows `请输入世界名称` near the world name field.
- Missing selected AI shows `请选择至少一个 AI 朋友` near the AI selection section.
- Document import controls show `文档导入暂未开放` and do not switch into fake imported source state.
- Fixed Role incomplete rows show helper text only and do not block creation.
- Random Role empty slots show helper text only and do not block creation.
- Validation keeps the current create route and preserves draft state.
- No real role generation, loading animation, LLM call, memory engine, or create-world core logic change is included.

## 2026-06-28: v0.2-create-world-core milestone tagged

Decision: `v0.2-create-world-core` marks the completed Create World Core milestone.

Rules:

- The milestone includes the Create World Draft route/page.
- The milestone includes the Detailed Edit scaffold.
- The milestone includes Random Role, Fixed Role, and Empty Role scaffold behavior.
- The milestone includes Create World validation.
- The milestone includes world-scoped creation.
- The milestone includes Bootstrap Planner.
- The milestone includes initial message stubs.
- The milestone includes the welcome transition scaffold.
- No new product behavior is introduced by this tag record.

## 2026-06-28: Create World welcome transition scaffold added

Decision: Successful Create World confirmation now sets local loading/welcome transition scaffold state before showing the new world's chat list.

Rules:

- No real animation timing, LLM call, generated role identity, memory write, or group chat creation is implemented.
- Loading text is `{worldName} 载入中…`.
- Empty Role, Blank World, and project-document worlds do not imply user identity and use `欢迎来到 {worldName}。`.
- Identity worlds use `你是 {roleName}，今天是你来到 {worldName} 的第一天。`.
- Explicit detail scaffold user role names are used when present.
- If identity exists but no generated role name exists yet, the scaffold placeholder is `新世界中的你`.
- After successful creation, the app still lands on the new world's `CHAT_LIST`.
- Reality remains unchanged.

## 2026-06-28: Bootstrap execution status model formalized

Decision: Bootstrap plan items now use a formal execution status model before real LLM generation is introduced.

Rules:

- Valid bootstrap execution statuses are `planned`, `stub-generated`, `generated`, `skipped`, and `failed`.
- `planned` means the planner created the item and it has not executed yet.
- `stub-generated` means the current scaffold executor created an explicit placeholder message.
- `generated` is reserved for future real AI generation and is not used by current stub execution.
- `skipped` and `failed` are valid future terminal states but are not produced by the current create-world runtime.
- Empty Role worlds continue to create zero executable private message plans.
- No visible UI behavior, LLM call, memory write, or group chat creation was added.

## 2026-06-28: Bootstrap initial message stubs added

Decision: Create World now turns planned private bootstrap messages into scaffold chat messages.

Rules:

- Non-empty role worlds create one scaffold initial private message per selected AI private chat.
- Scaffold initial message text is explicit placeholder content and must not be treated as final generated AI output.
- Empty Role worlds create zero active initial private messages.
- Bootstrap private message plans that produce scaffold messages are marked `stub-generated`.
- Reality chats/messages remain unchanged by custom world bootstrap execution.
- No LLM call, real prompt generation, memory write, loading animation, or group chat creation is implemented.

## 2026-06-28: World Bootstrap Planner scaffold added

Decision: Create World now produces a deterministic bootstrap plan after custom world creation.

Rules:

- `src/domain/world-bootstrap-planner.ts` owns bootstrap planning.
- The planner returns `WorldBootstrapPlan` with `privateMessages`, `groups`, `roleMode`, and `sourceType`.
- Non-empty role worlds plan one private initial message per selected AI contact.
- Empty Role worlds plan zero private initial messages and zero groups.
- Group plans are capped at two and are never created just because many AI are selected.
- The create-world service stores the plan in world metadata for bootstrap execution.
- The planner does not call an LLM, generate final message text, create memory, or create group chats.

## 2026-06-27: Create World validation hardened

Decision: Existing Create World confirmation now uses an explicit validation and sanitization gate before runtime creation.

Rules:

- Missing world name sets local `createWorldDraft.validationError = "请输入世界名称"`.
- Missing world name does not create a world and keeps the user on the current create route.
- Registry confirm actions sanitize random role slots and clear invalid `selectedUserRoleSlotId` values.
- Flow Executor repeats validation/sanitization before calling the create-world service.
- Successful create behavior is unchanged.
- Broader validation, real role generation, loading animation, AI initial messages, and auto group creation remain out of scope.

## 2026-06-27: Random Role detail scaffold corrected

Decision: Detailed Edit Random Role mode now collects explicit role slots instead of the earlier flat notes scaffold.

This supersedes the earlier flat placeholder behavior.

Rules:

- Random Role detail mode generates scaffold role slots equal to user plus selected AI count.
- Each random-role slot stores `roleName` and `personaNotes`.
- `selectedUserRoleSlotId` may mark exactly one slot as the user's role.
- Selecting the already selected user role slot clears the selection, allowing all participants to be randomly assigned later.
- Slot data is scaffold metadata only and does not perform real random role assignment.
- Confirming a valid Detailed Edit draft still creates a custom world through the existing create-world service and switches to the new world `CHAT_LIST`.
- Fixed Role and Empty Role behavior remain unchanged.
- Real random role generation, AI initial messages, auto group creation, and detailed validation remain out of scope.

## 2026-06-27: Create World Detailed Edit scaffold fields added

Decision: Create World Detailed Edit is now an actionable scaffold route instead of a placeholder-only route.

This supersedes earlier notes that described Detailed Edit as non-creating placeholder behavior. The later Random Role detail scaffold decision supersedes the early flat Random Role placeholder listed here.

Rules:

- `CREATE_WORLD_DETAIL_EDIT` renders world name and worldview text inputs from the same `createWorldDraft` state.
- Detail edit role modes are `random-role`, `fixed-role`, and `empty-role`.
- Random Role detail mode now uses explicit role slots.
- Fixed Role detail mode exposes placeholder role rows for the user and selected AI friends.
- Empty Role detail mode explains that no active initial reaction is triggered.
- `UPDATE_CREATE_WORLD_DETAIL`, `UPDATE_CREATE_WORLD_FIXED_ROLE`, and `SELECT_DETAIL_ROLE_MODE` mutate local draft state only.
- `CONFIRM_CREATE_WORLD_DETAIL` creates a custom world only when the world name is non-empty.
- Detailed Edit confirmation uses the existing shell create-world boundary and then switches to the new world `CHAT_LIST`.
- Empty Role stores role assignment as `none`.
- Random Role and Fixed Role store placeholder role assignment metadata only; no real role generation is implemented.
- Document parsing, AI initial messages, auto group creation, and real detailed role behavior remain out of scope.

## 2026-06-27: Create World draft becomes page route

Decision: Create World draft navigation now uses explicit page routes instead of an overlay panel.

Rules:

- `+ -> 创建世界` dispatches `OPEN_CREATE_WORLD_DRAFT`.
- `OPEN_CREATE_WORLD_DRAFT` initializes draft state and routes to `CREATE_WORLD_DRAFT`.
- The draft page is a staged vertical flow with world name, worldview area, attached source controls, official quick-world chips, AI selection, and next mode.
- Official quick-world options are chips, not large cards.
- Detailed Edit dispatches `OPEN_CREATE_WORLD_DETAIL_EDIT`.
- `OPEN_CREATE_WORLD_DETAIL_EDIT` routes to `CREATE_WORLD_DETAIL_EDIT`, a placeholder scaffold page.
- Detailed Edit does not create a world and does not bounce back to the draft start.
- Random Role confirmation preserves the existing create/switch/land-on-CHAT_LIST behavior.
- No real detailed edit fields, loading animation, random role generation, document parsing, AI initial messages, or auto group creation are included.

## 2026-06-27: Minimal Random Role Create World flow added

Decision: Create World confirmation now creates a custom world only for valid Random Role drafts.

Rules:

- `CONFIRM_CREATE_WORLD_DRAFT` remains a Behavior Registry state action and does not mutate WorldDomain directly.
- Flow Executor owns the random-role creation runtime effect.
- The shell exposes `createWorldFromDraft(draft)` as the runtime boundary for controlled world creation.
- Creation commits a new custom `WorldState` through WorldDomain, appends the world to `availableWorlds`, switches into it, and lands on `CHAT_LIST`.
- Successful creation clears `activeChatId`, `selectedContactActorId`, overlay/settings state, and `createWorldDraft`.
- Selected AI ids become independent world-scoped contacts and chats in the new world.
- Reality remains unchanged.
- Blank-world creation keeps original selected AI display names and stores role assignment as `none`.
- Non-blank source creation stores role assignment as `placeholder`; no real role generation is implemented.
- `nextMode = "detailed-edit"` does not create a world yet.
- Missing world name does not create a world yet.
- Document parsing, AI initial messages, auto group creation, and detailed edit remain out of scope.

## 2026-06-27: Create World draft scaffold added

Decision: Create World now opens a local draft scaffold instead of being a disabled/no-op menu action.

Rules:

- `+ -> Create World` dispatches `OPEN_CREATE_WORLD_DRAFT`.
- Create World draft state is stored in `SemanticMobileState.createWorldDraft`.
- Draft fields are `worldName`, `worldviewSourceType`, `worldviewText`, `selectedAIModelIds`, and `nextMode`.
- `UPDATE_CREATE_WORLD_DRAFT` updates draft text fields.
- `SELECT_WORLDVIEW_SOURCE` updates the worldview source option.
- `TOGGLE_CREATE_WORLD_AI` updates selected AI ids in draft state.
- `SELECT_CREATE_WORLD_NEXT_MODE` updates the future next mode.
- `CONFIRM_CREATE_WORLD_DRAFT` was initially scaffolded without creation; it is now implemented only for valid Random Role drafts in the later Minimal Random Role Create World decision.
- `CANCEL_CREATE_WORLD_DRAFT` initially cleared the local draft and closed the overlay; the current routed flow clears the draft and returns to `CHAT_LIST`.
- No world creation, world switching, role generation, detailed edit page, memory editing, AI initial messages, group creation, or world data model change is included in this decision.

## 2026-06-27: ovO world-button menu hierarchy added

Decision: The ovO chat world-button now opens a first-level world menu before world switching or edit selection.

Rules:

- Clicking `📍 {currentWorldName}` dispatches `OPEN_OVO_WORLD_MENU`.
- First-level ovO world menu shows Switch World and Edit World as sibling options.
- Switch World dispatches `OPEN_WORLD_SWITCHER`.
- World switcher lists existing worlds, marks the current world, and selecting a world dispatches `SWITCH_WORLD`.
- Edit World dispatches `OPEN_WORLD_EDITOR_SELECTOR`.
- World editor selector lists existing worlds, marks the current world, and marks Reality as locked.
- At this decision point, selecting a world to edit dispatched disabled scaffold action `OPEN_WORLD_EDITOR`; this was superseded by the later World Editor page scaffold decision.
- No create world flow, real edit world page, memory editing, or world data model change is included in this decision.

## 2026-06-27: ovO opens as chat with world-button composer

Decision: ovO is now entered as a special chat route before world switch/edit menu behavior is implemented.

Rules:

- Clicking ovO dispatches `OPEN_OVO_CHAT`, not direct world-control overlay opening.
- `OPEN_OVO_CHAT` sets `activeView = CHAT_VIEW` and stable `activeChatId = "ovo"`.
- ovO chat uses the same ChatView structure as normal chats.
- ovO chat composer kind is `ovo`.
- ovO chat composer defaults to `world-button`.
- ovO `world-button` displays `📍 {currentWorldName}` and does not open a world menu yet.
- The left keyboard action toggles ovO composer to text mode through `TOGGLE_COMPOSER_MODE`.
- Normal chats continue to open with the normal text composer.
- No world switch/edit menu, create world flow, world editor UI, or world data model change is included in this decision.

## 2026-06-27: Composer mode state machine foundation added

Decision: ovOne now has a reusable composer mode state machine before ovO chat/world-button behavior is implemented.

Rules:

- No ovO chat flow was implemented.
- No world menu, create world, edit world, or world editor UI was implemented.
- No real voice sending was implemented.
- `normal` composer supports `text` and `voice-button`.
- `ovo` composer supports `world-button` and `text`.
- ovO default composer mode resolves to `world-button` for future binding.
- Current ChatView remains normal/text by default.
- `TOGGLE_COMPOSER_MODE` and `SET_COMPOSER_MODE` are explicit local UI state actions.
- World switching behavior is unchanged.

## 2026-06-27: ovO overlay binds read-only world switching

Decision: ovO control overlay now exposes existing worlds for read-only context switching.

Rules:

- No create world flow was implemented.
- No edit world flow or world editor UI was implemented.
- ovO overlay lists `state.view.availableWorlds`.
- The current world is visually marked.
- Selecting a world dispatches `SWITCH_WORLD`.
- Behavior Registry keeps owning the local `SWITCH_WORLD` state transition.
- Flow Executor owns the `shell.switchWorld(worldId)` runtime effect and refreshes `state.view`.
- World switching lands on `CHAT_LIST` and clears active chat/contact/overlay/settings state.
- Chats and Contacts then render from the selected world's snapshot/context.
- Me remains global.

## 2026-06-27: World-scoped data model foundation added

Decision: ovOne now has a typed world-scoped data model foundation and read-only resolver layer.

Rules:

- No product rules changed.
- `src/domain/world-model.ts` defines `GlobalAIModel`, `GlobalAILink`, `World`, `WorldContact`, `WorldChat`, `WorldMemoryScope`, and `WorldScopedSnapshot`.
- `src/domain/world-scope-resolver.ts` resolves current world, world contacts, and world chats without mutating runtime state.
- `SemanticMobileState` now stores `currentWorldId`.
- Chats and Contacts read through the current world resolver.
- Me remains global and does not read through the world resolver.
- `SWITCH_WORLD` is an explicit action scaffold that lands on `CHAT_LIST` and clears active chat/contact state.
- No create world UI, real memory engine, real AI provider integration, or world persistence migration is included in this decision.

## 2026-06-27: Flow Executor handles submit-message runtime effect

Decision: ovOne now separates UI state transitions from runtime side effects for `SUBMIT_MESSAGE`.

Rules:

- No product rules changed.
- Behavior Registry remains UI state-transition only.
- Flow Executor owns runtime effects.
- For now, Flow Executor handles only `SUBMIT_MESSAGE`.
- `SUBMIT_MESSAGE` preserves existing behavior by calling `shell.sendMessage(text)`, syncing `state.view`, `activeChatId`, and `activeView`.
- `TEXT_INPUT` remains renderless.
- Disabled explicit actions remain no-op and do not execute runtime effects.

## 2026-06-27: ViewRouter owns activeView fallback

Decision: Unknown `activeView` fallback now belongs to ViewRouter route resolution, not `renderShellPage`.

Rules:

- No product rules changed.
- `ViewRouter.resolve(...)` returns `{ route, fallbackApplied, issue? }`.
- Known routes resolve with `fallbackApplied: false`.
- Unknown routes resolve to `CHAT_LIST` with `fallbackApplied: true`.
- `renderShellPage(...)` consumes the resolved route object and only maps known routes to view factories.
- Unknown routes must not render Me.

## 2026-06-27: Behavior Registry scaffold implemented

Decision: ovOne now routes mobile ChatShell UI actions through a Behavior Registry scaffold.

Rules:

- No product rules changed.
- `src/platform/behavior-registry.ts` owns UI action -> local UI state transitions.
- `InteractionController` remains the dispatcher and executes only explicit actions.
- `OPEN_CHAT` is one action that sets `activeChatId` and `activeView = CHAT_VIEW`.
- Overlays use explicit open/close actions, not toggle actions.
- Unknown `activeView` falls back to `CHAT_LIST` as temporary fallback behavior.
- Generic `MENU_ACTION` is removed from the active mobile UI action model.
- Former menu intents are explicit disabled/no-op actions until product behavior is implemented.
- Runtime effects and autosave remain outside Behavior Registry scope.

## 2026-06-27: Behavior Specification phase begins

Decision: ovOne enters the Behavior Specification phase before behavior refactoring.

Rules:

- `docs/behavior-spec.md` defines the target Behavior Registry contract.
- Every UI event must map to exactly one explicit action in the target model.
- Generic `MENU_ACTION` is forbidden in the target model and must be replaced by explicit actions.
- Views must dispatch actions only; Behavior Registry owns action execution in the target model.
- No product feature implementation is included in this decision.
- Product rules remain unchanged.

## 2026-06-27: v0.1 freeze review accepts documented foundation state

Decision: ovOne v0.1 is accepted as a documented foundation baseline for the next Behavior Registry phase.

Rules:

- No product rules changed in the freeze review.
- `v0.1` and `v0.1-foundation` are baseline markers for the audited foundation state.
- Behavior Registry work must start from the documented current implementation, not from assumed final architecture.
- Existing gaps such as placeholder `MENU_ACTION`, identity-only `ViewRouter`, heuristic chat/contact mapping, and unbound decorative controls remain known issues.

## 2026-06-27: v0.1 engineering baseline is tagged from audited implementation state

Decision: `v0.1` marks the first GitHub-backed engineering baseline.

Rules:

- The source of truth for current implementation state is `docs/engineering-spec.md`.
- The production browser UI entry is `src/main.ts -> mountChatShell(document.body)`.
- `src/platform/index.ts` exports only `mountChatShell` for production UI mounting.
- Legacy UI mounts remain present only as disabled compatibility stubs that throw.
- Known UI/runtime gaps remain documented in `docs/known-issues.md` and are not considered implemented behavior.

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
