import type { AppRuntime } from "../app/index.js";
import { toChatEventId, toChatId, transition } from "../chat-kernel/index.js";
import type { ChatId } from "../chat-kernel/index.js";
import { validateWorldAddMemberCommand } from "../domain/index.js";
import type { GlobalAILink, GlobalAIModel, WorldAddMemberCommand } from "../domain/index.js";
import type { WorldSnapshot, WorldState } from "../world-domain/index.js";
import { toWorldId } from "../world-domain/index.js";

export const WORLD_MEMBER_ADD_SUCCESS_MESSAGE = "已添加";

export type AddWorldMemberInput = Readonly<{
  readonly app: AppRuntime;
  readonly command: WorldAddMemberCommand;
}>;

export function addWorldMember(input: AddWorldMemberInput): WorldState {
  const state = input.app.worldDomain.getWorldState(input.command.worldId);
  const realitySnapshot = input.app.worldDomain.generateSnapshot(toWorldId("reality"));
  const contractInput = createContractInput(state, realitySnapshot);
  const validation = validateWorldAddMemberCommand(input.command, contractInput);
  if (!validation.valid || !validation.command) {
    throw new Error(validation.error ?? "WorldMemberService: invalid add-member command.");
  }

  const link = contractInput.globalAILinks.find((item) => item.linkId === validation.command!.globalAILinkId)!;
  const model = contractInput.globalAIModels.find((item) => item.modelId === link.modelId);
  const displayName = model?.displayName ?? link.modelId;
  const timestampBase = 12000 + state.contacts.length * 10;

  input.app.worldDomain.applyStructuralPatch({
    type: "ai.contact.added",
    worldId: input.command.worldId,
    timestamp: timestampBase,
    contact: {
      actorId: link.modelId,
      displayName,
      kind: "assistant"
    }
  });

  let nextState = input.app.worldDomain.getWorldState(input.command.worldId);
  nextState = transition(nextState, {
    id: toChatEventId(`event:world-member:${input.command.worldId}:chat:${link.modelId}`),
    type: "chat.started",
    worldId: input.command.worldId,
    timestamp: timestampBase + 1,
    payload: {
      chatId: toChatId(`chat:${input.command.worldId}:${link.modelId}`) as ChatId,
      title: displayName
    }
  });
  input.app.worldDomain.commitState(nextState);

  const existingMemoryScopes = memberMemoryScopesFromSettings(nextState.metadata.settings);
  input.app.worldDomain.applyStructuralPatch({
    type: "world.settings.adjusted",
    worldId: input.command.worldId,
    timestamp: timestampBase + 2,
    settings: {
      memberMemoryScopes: {
        ...existingMemoryScopes,
        [link.modelId]: {
          worldId: input.command.worldId,
          actorId: link.modelId,
          namespace: `world:${input.command.worldId}:contact:${link.modelId}`,
          status: "placeholder"
        }
      }
    }
  });

  return input.app.worldDomain.getWorldState(input.command.worldId);
}

function createContractInput(state: WorldState, realitySnapshot: WorldSnapshot) {
  return {
    world: {
      type: state.world.type
    },
    contacts: state.contacts
      .filter((contact) => contact.kind === "assistant" && contact.actorId !== state.world.assistantActorId)
      .map((contact) => ({ baseModelId: contact.actorId })),
    globalAIModels: linkedAIModels(realitySnapshot),
    globalAILinks: linkedAILinks(realitySnapshot)
  };
}

function linkedAIModels(realitySnapshot: WorldSnapshot): readonly GlobalAIModel[] {
  return Object.freeze(realitySnapshot.contacts
    .filter((contact) => contact.kind === "assistant" && contact.actorId !== realitySnapshot.worldMeta.assistantActorId)
    .map((contact) => Object.freeze({
      modelId: contact.actorId,
      displayName: contact.displayName
    })));
}

function linkedAILinks(realitySnapshot: WorldSnapshot): readonly GlobalAILink[] {
  return Object.freeze(linkedAIModels(realitySnapshot).map((model, index) => Object.freeze({
    linkId: `link:${model.modelId}`,
    modelId: model.modelId,
    connectedAt: index + 1,
    status: "connected" as const
  })));
}

function memberMemoryScopesFromSettings(settings: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  const value = settings.memberMemoryScopes;
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : {};
}
