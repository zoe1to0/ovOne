import type { AppRuntime } from "../app/index.js";
import { toChatEventId, toMessageId, transition } from "../chat-kernel/index.js";
import type { ChatId, MessageId } from "../chat-kernel/index.js";
import { toWorldId } from "../world-domain/index.js";
import type { WorldId, WorldSnapshot } from "../world-domain/index.js";
import { renderMinimalProductView } from "./views.js";
import type {
  CreateWorldDraftInput,
  MinimalProductScreen,
  MinimalProductShellRuntime,
  MinimalProductShellView
} from "./types.js";
import type { WorldAddMemberCommand, WorldEditorPatch, WorldRemoveMemberCommand } from "../domain/index.js";
import { createWorldFromDraft } from "./create-world-service.js";
import { addWorldMember } from "./world-member-service.js";
import { removeWorldMember } from "./world-member-remove-service.js";

export const MinimalUiShell = Object.freeze({
  init
});

function init(app: AppRuntime, options: Readonly<{ readonly worldIds?: readonly WorldId[] }> = {}): MinimalProductShellRuntime {
  const worldIds: WorldId[] = uniqueWorldIds([
    app.defaultState.world.id,
    app.realityState.world.id,
    ...(options.worldIds ?? [])
  ]);
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
          type: worldSnapshot.worldMeta.type,
          worldView: worldSnapshot.runtimeState.metadata.worldView,
          memberActorIds: worldSnapshot.contacts
            .filter((contact) => contact.kind === "assistant" && contact.actorId !== worldSnapshot.worldMeta.assistantActorId)
            .map((contact) => contact.actorId)
        });
      }),
      linkedAIModels: linkedAIModels(app.worldDomain.generateSnapshot(toWorldId("reality"))),
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

  const createWorld = (draft: CreateWorldDraftInput): MinimalProductShellView => {
    const created = createWorldFromDraft({
      app,
      existingWorldIds: worldIds,
      sourceSnapshot: snapshot(),
      draft
    });
    worldIds.push(created.worldId);
    activeWorldId = created.worldId;
    entryWorldId = null;
    screen = "chat";
    return view();
  };

  const saveWorldMetadata = (patch: WorldEditorPatch): MinimalProductShellView => {
    app.worldDomain.applyWorldEditorPatch(patch);
    screen = "chat";
    return view();
  };

  const addMember = (command: WorldAddMemberCommand): MinimalProductShellView => {
    addWorldMember({ app, command });
    screen = "chat";
    return view();
  };

  const removeMember = (command: WorldRemoveMemberCommand): MinimalProductShellView => {
    removeWorldMember({ app, command });
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
    createWorldFromDraft: createWorld,
    saveWorldMetadata,
    addWorldMember: addMember,
    removeWorldMember: removeMember,
    sendMessage,
    snapshot,
    view
  });
}

function linkedAIModels(realitySnapshot: WorldSnapshot): readonly Readonly<{
  readonly globalAILinkId: string;
  readonly globalAIModelId: string;
  readonly actorId: string;
  readonly displayName: string;
}>[] {
  return Object.freeze(realitySnapshot.contacts
    .filter((contact) => contact.kind === "assistant" && contact.actorId !== realitySnapshot.worldMeta.assistantActorId)
    .map((contact) => Object.freeze({
      globalAILinkId: `link:${contact.actorId}`,
      globalAIModelId: contact.actorId,
      actorId: contact.actorId,
      displayName: contact.displayName
    })));
}

function uniqueWorldIds(worldIds: readonly WorldId[]): WorldId[] {
  return [...new Set(worldIds)];
}
