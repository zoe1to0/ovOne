import { AiAdapter } from "../ai-adapter/index.js";
import { App } from "../app/index.js";
import type { AppRuntime } from "../app/index.js";
import { MinimalUiShell } from "../minimal-ui-shell/index.js";
import type { MinimalProductShellRuntime, MinimalProductShellView } from "../minimal-ui-shell/index.js";
import { queueForWorldState } from "../patch-queue/index.js";
import type { WorldSnapshot } from "../world-domain/index.js";
import type {
  EndToEndFailure,
  EndToEndFlowName,
  EndToEndFlowResult,
  EndToEndFlowValidationOptions,
  EndToEndFlowValidationReport,
  EndToEndLayer
} from "./types.js";

type FlowCheck = () => readonly EndToEndFailure[];

export const EndToEndFlowValidationSuite = Object.freeze({
  runEndToEndFlowValidation,
  formatEndToEndFlowReport
});

export function runEndToEndFlowValidation(
  options: EndToEndFlowValidationOptions = {}
): EndToEndFlowValidationReport {
  const results: EndToEndFlowResult[] = [
    runFlow("WorldCreationChatSnapshotFlow", validateWorldCreationChatSnapshotFlow),
    runFlow("WorldSwitchingConsistencyFlow", validateWorldSwitchingConsistencyFlow),
    runFlow("ContactModeBehaviorFlow", validateContactModeBehaviorFlow),
    runFlow("InputPanelKernelSnapshotFlow", validateInputPanelKernelSnapshotFlow)
  ];

  const report = Object.freeze({
    passed: results.every((result) => result.passed),
    results: Object.freeze(results)
  });

  if (options.print ?? true) {
    (options.logger ?? console.log)(formatEndToEndFlowReport(report));
  }

  return report;
}

export function formatEndToEndFlowReport(report: EndToEndFlowValidationReport): string {
  const lines = [
    `EndToEndFlowValidationSuite: ${report.passed ? "passed" : "failed"}`,
    ...report.results.map((result) =>
      `${result.flow}: ${result.passed ? "passed" : `failed (${result.failures.length})`}`
    )
  ];

  const failures = report.results.flatMap((result) => result.failures);
  if (failures.length === 0) {
    return lines.join("\n");
  }

  return [
    ...lines,
    ...failures.map((item) =>
      [
        "---",
        `flow=${item.flow}`,
        `layer=${item.layer}`,
        `firstDivergenceEvent=${item.firstDivergenceEvent}`,
        `diffTrace=${item.diffTrace}`,
        ...(item.expected ? [`expected=${item.expected}`] : []),
        ...(item.actual ? [`actual=${item.actual}`] : [])
      ].join("\n")
    )
  ].join("\n");
}

function runFlow(flow: EndToEndFlowName, check: FlowCheck): EndToEndFlowResult {
  const failures = check();
  return Object.freeze({
    flow,
    passed: failures.length === 0,
    failures: Object.freeze(failures)
  });
}

function validateWorldCreationChatSnapshotFlow(): readonly EndToEndFailure[] {
  const { app, shell } = createRuntime();
  const failures: EndToEndFailure[] = [];
  const initial = shell.view();

  expect(
    failures,
    initial.product.world.worldMeta.id === initial.product.snapshot.worldMeta.id,
    "WorldCreationChatSnapshotFlow",
    "Snapshot",
    "App.init",
    "WorldView and active WorldSnapshot should point to the same world.",
    initial.product.snapshot.worldMeta.id,
    initial.product.world.worldMeta.id
  );
  expect(
    failures,
    initial.product.chat.chatId === initial.product.inputPanel.targetChatId,
    "WorldCreationChatSnapshotFlow",
    "UI",
    "App.init",
    "InputPanel target chat should match ChatView active chat.",
    String(initial.product.chat.chatId),
    String(initial.product.inputPanel.targetChatId)
  );

  const beforePatchCount = patchCount(app, initial.activeWorldId);
  const after = shell.sendMessage("world creation flow");
  const afterPatchCount = patchCount(app, after.activeWorldId);
  const activeChat = after.product.snapshot.chatState.chats.get(after.product.chat.chatId!);

  expect(
    failures,
    afterPatchCount === beforePatchCount + 1,
    "WorldCreationChatSnapshotFlow",
    "Kernel",
    "sendMessage:world creation flow",
    "Sending a message should emit exactly one kernel patch.",
    String(beforePatchCount + 1),
    String(afterPatchCount)
  );
  expect(
    failures,
    activeChat?.messages.at(-1)?.text === "world creation flow",
    "WorldCreationChatSnapshotFlow",
    "World",
    "sendMessage:world creation flow",
    "WorldDomain snapshot should contain submitted message.",
    "world creation flow",
    String(activeChat?.messages.at(-1)?.text)
  );
  expectUiConsistency(failures, app, after, "WorldCreationChatSnapshotFlow", "sendMessage:world creation flow");

  return failures;
}

function validateWorldSwitchingConsistencyFlow(): readonly EndToEndFailure[] {
  const { app, shell } = createRuntime();
  const failures: EndToEndFailure[] = [];
  const defaultWorldId = shell.view().activeWorldId;
  const realityWorldId = shell.view().availableWorlds.find((world) => world.worldId !== defaultWorldId)!.worldId;

  shell.sendMessage("default message");
  const reality = shell.switchWorld(realityWorldId);
  shell.sendMessage("reality message");
  const backToDefault = shell.switchWorld(defaultWorldId);

  expect(
    failures,
    !messageTexts(reality.product.snapshot).includes("default message"),
    "WorldSwitchingConsistencyFlow",
    "World",
    "switchWorld:reality",
    "Default world message must not leak into reality world.",
    "no default message",
    messageTexts(reality.product.snapshot).join(",")
  );
  expect(
    failures,
    !messageTexts(backToDefault.product.snapshot).includes("reality message"),
    "WorldSwitchingConsistencyFlow",
    "World",
    "switchWorld:default",
    "Reality world message must not leak into default world.",
    "no reality message",
    messageTexts(backToDefault.product.snapshot).join(",")
  );
  expectUiConsistency(failures, app, backToDefault, "WorldSwitchingConsistencyFlow", "switchWorld:default");

  return failures;
}

function validateContactModeBehaviorFlow(): readonly EndToEndFailure[] {
  const { shell } = createRuntime();
  const failures: EndToEndFailure[] = [];
  const adapter = AiAdapter.create();
  const defaultView = shell.view();
  const defaultMode = adapter.prepareModelRequest({
    snapshot: defaultView.product.snapshot,
    actorId: defaultView.product.snapshot.worldMeta.assistantActorId,
    prompt: "mode"
  }).outputMode;

  const realityWorldId = defaultView.availableWorlds.find((world) => world.worldId !== defaultView.activeWorldId)!.worldId;
  const realityView = shell.switchWorld(realityWorldId);
  const realityMode = adapter.prepareModelRequest({
    snapshot: realityView.product.snapshot,
    actorId: realityView.product.snapshot.worldMeta.assistantActorId,
    prompt: "mode"
  }).outputMode;

  expect(
    failures,
    defaultMode === "Dialogue",
    "ContactModeBehaviorFlow",
    "UI",
    "mode:default",
    "Custom world assistant should expose Dialogue mode.",
    "Dialogue",
    defaultMode
  );
  expect(
    failures,
    realityMode === "QA",
    "ContactModeBehaviorFlow",
    "UI",
    "mode:reality",
    "Reality assistant should expose QA mode.",
    "QA",
    realityMode
  );

  return failures;
}

function validateInputPanelKernelSnapshotFlow(): readonly EndToEndFailure[] {
  const { app, shell } = createRuntime();
  const failures: EndToEndFailure[] = [];
  const first = shell.view();
  const repeatedA = runDeterministicInputFlow();
  const repeatedB = runDeterministicInputFlow();

  expect(
    failures,
    first.product.inputPanel.canSubmit,
    "InputPanelKernelSnapshotFlow",
    "UI",
    "InputPanel:initial",
    "InputPanel should be ready when active chat exists.",
    "true",
    String(first.product.inputPanel.canSubmit)
  );

  const before = patchCount(app, first.activeWorldId);
  const after = shell.sendMessage("input pipeline");
  const patches = queueForWorldState(app.worldDomain.getWorldState(after.activeWorldId)).patches.slice(before);

  expect(
    failures,
    patches.length === 1 && patches[0]?.source === "kernel",
    "InputPanelKernelSnapshotFlow",
    "Kernel",
    "InputPanel:submit",
    "InputPanel submit should propagate to one kernel patch.",
    "1 kernel patch",
    `${patches.length} ${patches[0]?.source ?? "none"} patch`
  );
  expect(
    failures,
    after.product.chat.messages.at(-1)?.text === after.product.snapshot.chatState.chats.get(after.product.chat.chatId!)?.messages.at(-1)?.text,
    "InputPanelKernelSnapshotFlow",
    "Snapshot",
    "Snapshot:after-submit",
    "ChatView should reflect the same last message as WorldSnapshot.",
    String(after.product.snapshot.chatState.chats.get(after.product.chat.chatId!)?.messages.at(-1)?.text),
    String(after.product.chat.messages.at(-1)?.text)
  );
  expect(
    failures,
    stableSerialize(repeatedA) === stableSerialize(repeatedB),
    "InputPanelKernelSnapshotFlow",
    "Snapshot",
    "Deterministic:repeat-submit",
    "Repeated input flow should produce deterministic snapshot output.",
    stableSerialize(repeatedA),
    stableSerialize(repeatedB)
  );

  return failures;
}

function runDeterministicInputFlow(): unknown {
  const { shell } = createRuntime();
  return toPlainSnapshot(shell.sendMessage("input pipeline").product.snapshot);
}

function expectUiConsistency(
  failures: EndToEndFailure[],
  app: AppRuntime,
  view: MinimalProductShellView,
  flow: EndToEndFlowName,
  event: string
): void {
  const rendered = app.renderer.render(view.product.snapshot);
  const chatListItem = rendered.chatList.find((item) => item.chatId === view.product.chat.chatId);
  const lastMessage = view.product.chat.messages.at(-1)?.text ?? null;

  expect(
    failures,
    rendered.chatPage?.chatId === view.product.chat.chatId,
    flow,
    "UI",
    event,
    "ChatView and snapshot renderer chat page should target the same chat.",
    String(rendered.chatPage?.chatId),
    String(view.product.chat.chatId)
  );
  expect(
    failures,
    (chatListItem?.lastMessagePreview ?? null) === lastMessage,
    flow,
    "UI",
    event,
    "ChatListView preview should match ChatView last message.",
    String(lastMessage),
    String(chatListItem?.lastMessagePreview ?? null)
  );
}

function createRuntime(): Readonly<{
  readonly app: AppRuntime;
  readonly shell: MinimalProductShellRuntime;
}> {
  const app = App.init();
  return Object.freeze({
    app,
    shell: MinimalUiShell.init(app)
  });
}

function patchCount(app: AppRuntime, worldId: MinimalProductShellView["activeWorldId"]): number {
  return queueForWorldState(app.worldDomain.getWorldState(worldId)).patches.length;
}

function messageTexts(snapshot: WorldSnapshot): readonly string[] {
  return [...snapshot.chatState.chats.values()].flatMap((chat) =>
    chat.messages.map((message) => message.text)
  );
}

function expect(
  failures: EndToEndFailure[],
  condition: boolean,
  flow: EndToEndFlowName,
  layer: EndToEndLayer,
  firstDivergenceEvent: string,
  diffTrace: string,
  expected?: string,
  actual?: string
): void {
  if (condition) {
    return;
  }
  failures.push(Object.freeze({
    flow,
    layer,
    firstDivergenceEvent,
    diffTrace,
    ...(expected === undefined ? {} : { expected }),
    ...(actual === undefined ? {} : { actual })
  }));
}

function toPlainSnapshot(snapshot: WorldSnapshot): unknown {
  return {
    worldMeta: snapshot.worldMeta,
    contacts: snapshot.contacts,
    groups: snapshot.groups,
    chatState: {
      activeChatId: snapshot.chatState.activeChatId,
      chats: [...snapshot.chatState.chats.values()]
    },
    memorySummary: snapshot.memorySummary,
    runtimeState: snapshot.runtimeState
  };
}

function stableSerialize(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, sortValue(nested)])
    );
  }
  return value;
}
