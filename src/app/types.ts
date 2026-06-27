import type {
  ChatKernelEvent
} from "../chat-kernel/index.js";
import type { Renderer, UiRenderModel } from "../ui/index.js";
import type { WorldDomain, WorldSnapshot, WorldState } from "../world-domain/index.js";
import type { WorldLifecycleControllerInstance } from "../world-lifecycle/index.js";

export type AppRuntime = Readonly<{
  readonly worldDomain: WorldDomain;
  readonly lifecycle: WorldLifecycleControllerInstance;
  readonly renderer: Renderer;
  readonly realityState: WorldState;
  readonly defaultState: WorldState;
  readonly initialSnapshot: WorldSnapshot;
  readonly initialView: UiRenderModel;
  readonly getState: () => WorldState;
  readonly snapshot: () => WorldSnapshot;
  readonly view: () => UiRenderModel;
  readonly dispatch: (event: ChatKernelEvent) => UiRenderModel;
}>;

export type AppInitOptions = Readonly<{
  readonly ownerActorId?: string;
  readonly assistantActorId?: string;
  readonly defaultWorldKey?: string;
  readonly defaultWorldTitle?: string;
  readonly realityChatTitle?: string;
  readonly defaultChatTitle?: string;
}>;
