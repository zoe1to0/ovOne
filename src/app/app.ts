import {
  createInitialChatState,
  toChatEventId,
  toChatId,
  transition
} from "../chat-kernel/index.js";
import type {
  ChatKernelEvent,
  ChatSession
} from "../chat-kernel/index.js";
import { createRenderer } from "../ui/index.js";
import type { Renderer, UiRenderModel } from "../ui/index.js";
import { WorldDomain, toWorldId } from "../world-domain/index.js";
import type { WorldState } from "../world-domain/index.js";
import { WorldLifecycleController } from "../world-lifecycle/index.js";
import type { AppInitOptions, AppRuntime } from "./types.js";

const DEFAULT_OWNER_ACTOR_ID = "user";
const DEFAULT_ASSISTANT_ACTOR_ID = "ovone";
const DEFAULT_WORLD_KEY = "default";
const DEFAULT_WORLD_TITLE = "Default World";

export const App = Object.freeze({
  init
});

function init(options: AppInitOptions = {}): AppRuntime {
  const ownerActorId = options.ownerActorId ?? DEFAULT_OWNER_ACTOR_ID;
  const assistantActorId = options.assistantActorId ?? DEFAULT_ASSISTANT_ACTOR_ID;
  const defaultWorldKey = options.defaultWorldKey ?? DEFAULT_WORLD_KEY;
  const defaultWorldTitle = options.defaultWorldTitle ?? DEFAULT_WORLD_TITLE;

  const worldDomain = WorldDomain.create({
    reality: {
      ownerActorId,
      assistantActorId
    },
    customWorlds: [
      {
        key: defaultWorldKey,
        definition: {
          title: defaultWorldTitle,
          ownerActorId,
          assistantActorId,
          actors: [
            { actorId: ownerActorId, displayName: "You", kind: "human" },
            { actorId: assistantActorId, displayName: "ovOne", kind: "assistant" }
          ]
        }
      }
    ]
  });

  const renderer = createRenderer();
  const lifecycle = WorldLifecycleController.create({ worldDomain });
  const realityState = startWorldChat(
    createInitialChatState(worldDomain.getWorldState(toWorldId("reality"))),
    options.realityChatTitle
  );
  const defaultState = startWorldChat(
    createInitialChatState(worldDomain.getWorldState(toWorldId(`custom:${defaultWorldKey}`))),
    options.defaultChatTitle
  );
  worldDomain.commitState(realityState);
  worldDomain.commitState(defaultState);
  let state = defaultState;

  const initialSnapshot = worldDomain.generateSnapshot(state.world.id);
  const initialView = renderer.render(initialSnapshot);

  return Object.freeze({
    worldDomain,
    lifecycle,
    renderer,
    realityState,
    defaultState,
    initialSnapshot,
    initialView,
    getState: () => state,
    snapshot: () => worldDomain.generateSnapshot(state.world.id),
    view: () => renderer.render(worldDomain.generateSnapshot(state.world.id)),
    dispatch: (event: ChatKernelEvent) => {
      const uiEvent = renderer.dispatch(event);
      state = worldDomain.getWorldState(state.world.id);
      assertEventBelongsToWorldState(worldDomain, state, uiEvent);
      state = transition(state, uiEvent);
      worldDomain.commitState(state);
      return renderer.render(worldDomain.generateSnapshot(state.world.id));
    }
  });
}

function startWorldChat(state: WorldState, titleOverride?: string): WorldState {
  return transition(state, {
    id: toChatEventId(`event:chat-started:${state.world.id}`),
    type: "chat.started",
    worldId: state.world.id,
    timestamp: 0,
    payload: {
      chatId: toChatId(`chat:${state.world.id}`),
      title: titleOverride ?? state.world.title
    }
  });
}

function assertEventBelongsToWorldState(
  worldDomain: WorldDomain,
  state: WorldState,
  event: ChatKernelEvent
): void {
  switch (event.type) {
    case "chat.started":
      worldDomain.getWorldState(event.worldId);
      if (event.worldId !== state.world.id) {
        throw new Error("App: chat start event belongs to a different WorldState.");
      }
      return;

    case "chat.selected":
      getChat(state, event.payload.chatId);
      return;

    case "message.submitted":
      getChat(state, event.payload.chatId);
      if (!state.contacts.some((contact) => contact.actorId === event.payload.authorActorId)) {
        throw new Error("App: event actor does not match WorldState contacts.");
      }
      return;
  }
}

function getChat(state: WorldState, chatId: ChatKernelEvent["payload"]["chatId"]): ChatSession {
  const chat = state.chat.chats.get(chatId) as ChatSession | undefined;
  if (!chat) {
    throw new Error(`App: unknown chat "${chatId}".`);
  }
  return chat;
}
