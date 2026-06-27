import type { AppRuntime } from "../app/index.js";
import type { AppShellRuntime, AppShellView } from "../app-shell/index.js";
import type { ChatKernelEvent } from "../chat-kernel/index.js";

export type BrowserAppMount = Readonly<{
  readonly dispatch: (event: ChatKernelEvent) => void;
  readonly render: (view?: AppShellView) => void;
  readonly unmount: () => void;
}>;

export class LegacyUiMountDisabledError extends Error {
  constructor(mountName: string) {
    super(`${mountName} is disabled. Use mountChatShell as the single UI entry point.`);
    this.name = "LegacyUiMountDisabledError";
  }
}

/** @deprecated Legacy browser UI root is disabled. Use mountChatShell. */
export function mountApp(_app: AppRuntime, _root: HTMLElement = document.body): BrowserAppMount {
  throw new LegacyUiMountDisabledError("mountApp");
}

/** @deprecated Legacy browser UI root is disabled. Use mountChatShell. */
export function mountAppShell(_shell: AppShellRuntime, _root: HTMLElement = document.body): BrowserAppMount {
  throw new LegacyUiMountDisabledError("mountAppShell");
}
