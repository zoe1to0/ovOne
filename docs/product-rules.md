# ovOne Product Rules

## Core Product Rules

- ovOne is a world-based AI chat platform.
- The app has three first-level pages: Chats, Contacts, Me.
- Chats and Contacts are world-scoped.
- Me is global and never changes with world switching.
- Reality is the default world.
- Reality cannot be deleted.
- Reality worldview cannot be modified.
- Reality has stronger model-name visibility rules than custom worlds.
- Custom worlds are fully isolated from Reality and from each other.
- World switching always lands on that world's Chats list.
- It does not restore the previous active chat or previous active view.
- Global AI Link is app-level.
- World Contact is world-level.
- Chat is world-level.
- Memory is world-level.
- The same base AI model can appear in multiple worlds, but each world owns an independent contact/chat/memory instance.
- Deleting an AI contact in one world deletes only that world's contact/chat/memory for that AI.
- Deleting a contact does not disconnect the AI model globally.
- Deleting an AI friend in Reality deletes only that AI model's Reality contact/chat/memory.
- If the Global AI Link still exists, the user can add that AI back through the `+` entry without reconnecting provider credentials.
- Re-adding the same AI model to that world creates a new clean instance.
- Disconnecting a linked AI model only happens in Me -> Settings -> Linked AI.
- Newly linked AI models do not automatically appear in custom worlds.
- To add a newly linked AI to an existing custom world, the user must use ovO -> Edit World -> Add Member.
- ovO is a global system character/control layer.
- ovO cannot be customized.
- ovO is the entry for world switching and world editing.
- Add/create actions include add AI friend, create group, create world.
- Current known engineering issue: Create World supports minimal Random Role direct creation and a Detailed Edit scaffold route with role-slot metadata, but real random role generation, real generated/fixed role behavior, document parsing, real AI initial messages, and auto group creation are not implemented yet.
- Current bootstrap scaffold: non-empty role worlds create placeholder initial private messages per selected AI; Empty Role worlds create zero active initial messages and zero groups. No real text generation or group creation is implemented yet.
- Current welcome transition scaffold: after successful world creation, loading text is `{worldName} 载入中…`; Empty Role, Blank World, and project-document worlds use no-identity welcome text, while identity worlds use explicit user role names or scaffold placeholder `新世界中的你`.
- Current World Editor: ovO -> Edit World can open a route/page for existing worlds; Reality name/worldview remain locked, custom world name/worldview can be saved, Add Member can add an existing linked AI to a custom world, and confirmed Remove Member can remove an AI from a custom world.
- World Editor save contract: custom world save may only target `worldId`, `name`, and `worldview`; contact/chat/memory/global AI link mutations are forbidden.
- World Editor Add Member: custom world add-member candidates come from existing Global AI Links and exclude AI already in the selected world.
- World Editor Add Member creates only a new world-scoped `WorldContact`, private `WorldChat`, and isolated `WorldMemoryScope` placeholder metadata for that custom world.
- World Editor Add Member does not affect Reality, other worlds, existing world data, group membership, provider connections, Global AI Links, or initial messages.
- Reality cannot use World Editor to add members.
- World Editor Remove Member applies only to custom worlds and requires confirmation before deletion.
- Remove Member confirmation must say: `删除后，该 AI 在此世界的聊天与记忆将被清除，但不会断开全局接入。`
- Confirmed Remove Member clears only that AI's WorldContact, private WorldChat, and WorldMemoryScope placeholder in that custom world.
- Remove Member must not disconnect Global AI Link, mutate Reality, mutate other worlds, mutate provider connections, or recover old world memory after re-add.
- World Editor owns world-level setup only: world name, worldview/world setting, user role name/identity notes in this world, and AI world role name/persona relationship/background in this world.
- World Editor role/member scaffold can show a user role row and current world AI member role rows for custom worlds.
- World Editor role/member fields can be saved as world-level role metadata for custom worlds.
- User role metadata is world-level metadata; AI member role metadata is stored only on that world's `WorldContact.worldRoleName` and `WorldContact.worldPersonaNotes`.
- World Editor role/member save contract may only allow user `roleName` / `personaNotes` and AI member `worldRoleName` / `worldPersonaNotes`.
- World Editor must not own or expose contact-level communication preferences.
- Contacts Detail owns contact-level communication preferences: remark/nickname, "你认为他是怎样的人？", answer mode, chat tone/how the contact speaks to the user, and emoji permission.
- If "你认为他是怎样的人？" is blank in a custom world, its default may derive from the world role/worldview; if blank in Reality, it starts from an unfamiliar/new friend relationship.
- Contacts Detail Delete Friend applies only to the current world and must not disconnect the Global AI Link or provider connection.
- Contacts Detail Delete Friend later may delete only the current world's `WorldContact`, private `WorldChat`, and `WorldMemoryScope`; the current scaffold opens confirmation only and performs no deletion.
- Delete Friend confirmation must say: `删除后，该 AI 在当前世界的聊天与记忆将被清除，但不会断开全局接入。`
- Me Settings owns global product-authorized context access such as weather/time.
- Weather/time access is not configured per contact; after user authorization, connected AI models can read it by default until the user revokes it in Me -> Settings.
- Individual AI contacts cannot separately disable weather/time access.
- Custom world name cannot be empty; custom worldview can be cleared with warning.
- Reality cannot be renamed and Reality worldview cannot be modified.

## Data Ownership Rules

- `GlobalAILink` is global.
- `WorldContact` is per-world.
- `Chat` is per-world.
- `Memory` is per-world.
- Me is global.
- World switching lands on the active world's Chats list.

## Current Terminology

- `GlobalAIModel` describes an app-level base model identity.
- `GlobalAILink` describes the user's app-level connection to a base AI model.
- `World` describes an isolated data scope.
- `WorldContact` describes a per-world contact instance backed by a base AI model.
- `WorldChat` describes a per-world chat instance.
- `WorldMemoryScope` describes a per-world memory namespace placeholder.
- `WorldScopedSnapshot` is the current foundation read model for resolving world-specific contacts/chats without exposing world UI.
