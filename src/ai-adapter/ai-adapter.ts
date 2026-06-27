import type { AiAdapterInput, AiAdapterInstance, AiModelRequest } from "./types.js";

const QA_FORMATTING =
  "Use QA mode: provide a long-form structured answer, deliver complete information, avoid sentence splitting, and optimize for knowledge, task completion, or explanation.";

const DIALOGUE_FORMATTING =
  "Use Dialogue mode: respond briefly, keep conversational flow, output sentence-based turns, allow emotional or interactive tone, and optimize for multi-turn engagement.";

export const AiAdapter = Object.freeze({
  create
});

export function create(): AiAdapterInstance {
  return Object.freeze({
    prepareModelRequest
  });
}

export function prepareModelRequest(input: AiAdapterInput): AiModelRequest {
  if (input.snapshot.worldMeta.lifecycle === "paused" || input.snapshot.worldMeta.lifecycle === "archived") {
    throw new Error(`AIAdapter: ${input.snapshot.worldMeta.lifecycle} worlds cannot prepare model requests.`);
  }

  const actor = input.snapshot.contacts.find((contact) => contact.actorId === input.actorId);
  if (!actor) {
    throw new Error(`AIAdapter: contact "${input.actorId}" is not present in WorldSnapshot.`);
  }

  return Object.freeze({
    actor,
    outputMode: actor.outputMode,
    prompt: input.prompt,
    formattingInstruction: actor.outputMode === "QA" ? QA_FORMATTING : DIALOGUE_FORMATTING
  });
}
