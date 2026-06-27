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
- Re-adding the same AI model to that world creates a new clean instance.
- Disconnecting a linked AI model only happens in Me -> Settings -> Linked AI.
- Newly linked AI models do not automatically appear in custom worlds.
- To add a newly linked AI to an existing custom world, the user must use ovO -> Edit World -> Add Member.
- ovO is a global system character/control layer.
- ovO cannot be customized.
- ovO is the entry for world switching and world editing.
- Add/create actions include add AI friend, create group, create world.
- Current known engineering issue: Create World supports minimal Random Role direct creation and a Detailed Edit placeholder route, but real random role generation, detailed edit fields, document parsing, AI initial messages, and auto group creation are not implemented yet.

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
