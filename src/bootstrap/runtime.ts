import { AiAdapter } from "../ai-adapter/index.js";
import { App } from "../app/index.js";
import { AppShell } from "../app-shell/index.js";
import { LegacyUiMountDisabledError } from "../platform/browser-adapter.js";
import type { BrowserBootstrap, OvOneRuntime } from "./types.js";

export function createOvOneRuntime(): OvOneRuntime {
  const app = App.init();
  const shell = AppShell.init(app);
  const aiAdapter = AiAdapter.create();

  return Object.freeze({
    app,
    shell,
    aiAdapter,
    snapshot: app.snapshot(),
    view: shell.view()
  });
}

export function mountOvOneRuntime(root: HTMLElement = document.body): BrowserBootstrap {
  void root;
  throw new LegacyUiMountDisabledError("mountOvOneRuntime");
}

export function summarizeRuntime(runtime: OvOneRuntime = createOvOneRuntime()): string {
  const snapshot = runtime.snapshot;
  const chatCount = snapshot.chatState.chats.size;
  const contactCount = snapshot.contacts.length;

  return [
    "ovOne v2 runtime ready",
    `world=${snapshot.worldMeta.title}`,
    `lifecycle=${snapshot.worldMeta.lifecycle}`,
    `contacts=${contactCount}`,
    `chats=${chatCount}`,
    `screen=${runtime.view.screen}`
  ].join("\n");
}
