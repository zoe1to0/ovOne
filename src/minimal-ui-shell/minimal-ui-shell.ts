import type { AppRuntime } from "../app/index.js";
import { toChatEventId, toMessageId, transition } from "../chat-kernel/index.js";
import type { ChatId, MessageId } from "../chat-kernel/index.js";
import type { WorldId, WorldSnapshot } from "../world-domain/index.js";
import { renderMinimalProductView } from "./views.js";
import type {
  MinimalProductScreen,
  MinimalProductShellRuntime,
  MinimalProductShellView
} from "./types.js";

export const MinimalUiShell = Object.freeze({
  init
});

function init(app: AppRuntime): MinimalProductShellRuntime {
  const worldIds = Object.freeze([app.defaultState.world.id, app.realityState.world.id]);
  let activeWorldId: WorldId = app.defaultState.world.id;
  let screen: MinimalProductScreen = "chat";
  let entryWorldId: WorldId | null = activeWorldId;
  let sequence = 0;

  const snapshot = (): WorldSnapshot => app.worldDomain.generateSnapshot(activeWorldId);

  const view = (): MinimalProductShellView => {
    const activeSnapshot = snapshot();
    return Object.freeze({
      screen,
      activeWorldId,
      availableWorlds: worldIds.map((worldId) => {
        const worldSnapshot = app.worldDomain.generateSnapshot(worldId);
        return Object.freeze({
          worldId,
          title: worldSnapshot.worldMeta.title,
          type: worldSnapshot.worldMeta.type
        });
      }),
      product: renderMinimalProductView(activeSnapshot, {
        showEntryMoment: entryWorldId === activeWorldId
      })
    });
  };

  const openScreen = (nextScreen: MinimalProductScreen): MinimalProductShellView => {
    screen = nextScreen;
    return view();
  };

  const switchWorld = (worldId: WorldId): MinimalProductShellView => {
    app.worldDomain.getWorldState(worldId);
    activeWorldId = worldId;
    entryWorldId = null;
    screen = "chat";
    return view();
  };

  const sendMessage = (text: string): MinimalProductShellView => {
    const trimmed = text.trim();
    if (!trimmed) {
      return view();
    }

    const state = app.worldDomain.getWorldState(activeWorldId);
    const chatId = state.chat.activeChatId;
    if (!chatId) {
      throw new Error(`MinimalUiShell: world "${activeWorldId}" does not have an active chat.`);
    }

    sequence += 1;
    entryWorldId = null;
    const timestamp = 10000 + sequence;
    const nextState = transition(state, {
      id: toChatEventId(`event:minimal-ui:message:${activeWorldId}:${sequence}`),
      type: "message.submitted",
      worldId: activeWorldId,
      timestamp,
      payload: {
        chatId: chatId as ChatId,
        messageId: toMessageId(`message:minimal-ui:${activeWorldId}:${sequence}`) as MessageId,
        authorActorId: state.world.ownerActorId,
        text: trimmed,
        createdAt: timestamp
      }
    });
    app.worldDomain.commitState(nextState);
    screen = "chat";
    return view();
  };

  return Object.freeze({
    openScreen,
    switchWorld,
    sendMessage,
    snapshot,
    view
  });
}
