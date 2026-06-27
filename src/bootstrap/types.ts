import type { AiAdapterInstance } from "../ai-adapter/index.js";
import type { AppRuntime } from "../app/index.js";
import type { AppShellRuntime, AppShellView } from "../app-shell/index.js";
import type { BrowserAppMount } from "../platform/browser-adapter.js";
import type { WorldSnapshot } from "../world-domain/index.js";

export type OvOneRuntime = Readonly<{
  readonly app: AppRuntime;
  readonly shell: AppShellRuntime;
  readonly aiAdapter: AiAdapterInstance;
  readonly snapshot: WorldSnapshot;
  readonly view: AppShellView;
}>;

export type BrowserBootstrap = Readonly<{
  readonly runtime: OvOneRuntime;
  readonly mount: BrowserAppMount;
}>;
