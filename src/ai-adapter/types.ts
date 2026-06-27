import type { OutputMode, WorldContact, WorldSnapshot } from "../world-domain/index.js";

export type AiAdapterInput = Readonly<{
  readonly snapshot: WorldSnapshot;
  readonly actorId: string;
  readonly prompt: string;
}>;

export type AiModelRequest = Readonly<{
  readonly actor: WorldContact;
  readonly outputMode: OutputMode;
  readonly prompt: string;
  readonly formattingInstruction: string;
}>;

export type AiAdapterInstance = Readonly<{
  readonly prepareModelRequest: (input: AiAdapterInput) => AiModelRequest;
}>;
