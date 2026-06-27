import type { MinimalProductShellRuntime, MinimalProductShellView } from "../minimal-ui-shell/index.js";
import { LegacyUiMountDisabledError } from "./browser-adapter.js";

export type MinimalUiMount = Readonly<{
  readonly render: (view?: MinimalProductShellView) => void;
  readonly unmount: () => void;
}>;

/** @deprecated Legacy minimal UI root is disabled. Use mountChatShell. */
export function mountMinimalUiShell(
  _shell?: MinimalProductShellRuntime,
  _root: HTMLElement = document.body
): MinimalUiMount {
  throw new LegacyUiMountDisabledError("mountMinimalUiShell");
}
