import {
  createLinkedAIDisconnectCleanupPlan,
  type LinkedAIDisconnectCleanupPlan,
  type LinkedAIDisconnectGroupMemberRemovalStatus
} from "./linked-ai-disconnect-cleanup-plan.js";
import {
  createLinkedAIDisconnectExecutionPlan,
  type LinkedAIDisconnectExecutionPlan
} from "./linked-ai-disconnect-execution-contract.js";
import type { LinkedAIDisconnectCommand } from "./linked-ai-disconnect-contract.js";
import type { WorldScopedSnapshot } from "./world-model.js";

export const LINKED_AI_DISCONNECT_GROUP_HISTORY_NOTE =
  "\u7fa4\u804a\u548c\u7fa4\u5386\u53f2\u4f1a\u4fdd\u7559\uff0c\u5df2\u79fb\u9664 AI \u7684\u5386\u53f2\u7fa4\u6d88\u606f\u4ecd\u53ef\u89c1\u3002";
export const LINKED_AI_DISCONNECT_SCOPE_NOTE =
  "\u8fd9\u4e0d\u540c\u4e8e\u53ea\u5220\u9664\u67d0\u4e00\u4e2a\u4e16\u754c\u91cc\u7684\u597d\u53cb\uff1b\u65ad\u5f00\u63a5\u5165\u4f1a\u5f71\u54cd\u8be5 AI \u51fa\u73b0\u8fc7\u7684\u6240\u6709\u4e16\u754c\u3002";
export const LINKED_AI_DISCONNECT_GROUP_MEMBERSHIP_NOTE =
  "\u540e\u7eed\u65ad\u5f00\u6d41\u7a0b\u53ea\u4f1a\u79fb\u9664\u8be5 AI \u7684\u7fa4\u6210\u5458\u8eab\u4efd\uff0c\u4e0d\u4f1a\u5220\u9664\u7fa4\u804a\u6216\u7fa4\u6d88\u606f\u3002";

export type LinkedAIDisconnectPreviewWorld = Readonly<{
  readonly worldId: string;
  readonly worldTitle: string;
  readonly privateContactIds: readonly string[];
  readonly privateChatIds: readonly string[];
  readonly memoryScopeIds: readonly string[];
  readonly groupMemberRemovalStatus: LinkedAIDisconnectGroupMemberRemovalStatus;
  readonly groupMembershipLabel: string;
}>;

export type LinkedAIDisconnectPreviewViewModel = Readonly<{
  readonly globalAILinkId: string;
  readonly globalAIModelId: string;
  readonly affectedWorlds: readonly LinkedAIDisconnectPreviewWorld[];
  readonly notes: readonly string[];
  readonly cleanupPlan: LinkedAIDisconnectCleanupPlan;
  readonly executionPlan: LinkedAIDisconnectExecutionPlan;
  readonly readOnly: true;
}>;

export function buildLinkedAIDisconnectPreview(
  command: LinkedAIDisconnectCommand,
  snapshot: WorldScopedSnapshot
): LinkedAIDisconnectPreviewViewModel {
  const cleanupPlan = createLinkedAIDisconnectCleanupPlan(command, snapshot);
  const executionPlan = createLinkedAIDisconnectExecutionPlan(command, snapshot);
  return Object.freeze({
    globalAILinkId: command.globalAILinkId,
    globalAIModelId: cleanupPlan.globalAIModelId,
    affectedWorlds: Object.freeze(cleanupPlan.affectedWorlds.map((world) => Object.freeze({
      worldId: world.worldId,
      worldTitle: world.worldTitle,
      privateContactIds: Object.freeze([...world.worldContactIds]),
      privateChatIds: Object.freeze([...world.privateChatIds]),
      memoryScopeIds: Object.freeze([...world.memoryScopeIds]),
      groupMemberRemovalStatus: world.groupMemberRemovalStatus,
      groupMembershipLabel: groupMembershipLabel(world.groupMemberRemovalStatus)
    }))),
    notes: Object.freeze([
      LINKED_AI_DISCONNECT_SCOPE_NOTE,
      LINKED_AI_DISCONNECT_GROUP_MEMBERSHIP_NOTE,
      LINKED_AI_DISCONNECT_GROUP_HISTORY_NOTE,
      ...executionPlan.warnings
    ]),
    cleanupPlan,
    executionPlan,
    readOnly: true
  });
}

function groupMembershipLabel(status: LinkedAIDisconnectGroupMemberRemovalStatus): string {
  return status === "not-supported-yet"
    ? "\u5c06\u6765\u4ec5\u79fb\u9664\u7fa4\u6210\u5458\u8eab\u4efd"
    : "\u65e0\u9700\u79fb\u9664\u7fa4\u6210\u5458\u8eab\u4efd";
}
