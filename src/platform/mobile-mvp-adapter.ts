import { createOnboardedProductRuntime } from "../onboarding/index.js";
import { createBrowserWorldStorage } from "../persistence/index.js";
import {
  GROUP_FILES_EMPTY_MESSAGE,
  GROUP_FILES_UPLOAD_UNAVAILABLE_MESSAGE,
  WORLD_EDITOR_EMPTY_WORLDVIEW_WARNING,
  WORLD_EDITOR_LARGE_WORLDVIEW_CHANGE_WARNING,
  WORLD_MEMBER_REALITY_LOCKED_MESSAGE,
  WORLD_MEMBER_REMOVE_REALITY_LOCKED_MESSAGE,
  resolveGroupAddMemberCandidates,
  resolveWorldChats,
  resolveWorldContacts
} from "../domain/index.js";
import {
  isComposerModeAllowed,
  resolveDefaultComposerMode
} from "./composer-mode.js";
import type { ComposerKind } from "./composer-mode.js";
import {
  createBehaviorRegistry,
  OVO_CHAT_ID,
  tabForView
} from "./behavior-registry.js";
import { createFlowExecutor } from "./flow-executor.js";
import type {
  InteractionAction,
  MobileMvpTab,
  MobileOverlay,
  SemanticMobileState,
  ViewRouteResolution,
  WorldEditorDraft
} from "./behavior-registry.js";
import type {
  MinimalProductShellRuntime,
  MinimalProductShellView
} from "../minimal-ui-shell/index.js";
import type {
  WorldChatMessage,
  WorldChatSession,
  WorldContact,
  WorldSnapshot
} from "../world-domain/index.js";

type InteractionController = Readonly<{
  readonly dispatch: (action: InteractionAction) => void;
}>;

export type ChatShellMount = Readonly<{
  readonly render: () => void;
  readonly unmount: () => void;
}>;

export function mountChatShell(
  shellOrRoot: MinimalProductShellRuntime | HTMLElement = document.body,
  root?: HTMLElement
): ChatShellMount {
  const shell = isShellRuntime(shellOrRoot)
    ? shellOrRoot
    : createOnboardedProductRuntime({ storage: createBrowserWorldStorage() }).shell;
  const mountRoot = isShellRuntime(shellOrRoot) ? root ?? document.body : shellOrRoot;
  const initialView = enterRealityContext(shell);
  const state: SemanticMobileState = {
    activeView: "CHAT_LIST",
    currentWorldId: initialView.product.snapshot.worldMeta.id,
    activeChatId: null,
    overlay: null,
    selectedContactActorId: null,
    selectedChatIdForSettings: null,
    selectedWorldIdForEditing: null,
    composerMode: resolveDefaultComposerMode("normal"),
    inputDraft: "",
    settingsOpen: false,
    createGroupDraft: null,
    chatSettingsDraft: null,
    createWorldDraft: null,
    worldEditorDraft: null,
    contactDetailDraft: null,
    linkedAIDisconnectConfirmation: null,
    worldCreationTransition: null,
    splashVisible: true,
    view: initialView
  };

  const render = (): void => {
    mountRoot.replaceChildren(state.splashVisible ? createSplash() : createChatShell(shell, state, render));
  };

  render();
  window.setTimeout(() => {
    state.splashVisible = false;
    state.activeView = "CHAT_LIST";
    state.view = refreshView(shell);
    state.currentWorldId = state.view.product.snapshot.worldMeta.id;
    state.activeChatId = null;
    commitStateTransition(state, render);
  }, 900);

  return Object.freeze({
    render,
    unmount: () => mountRoot.replaceChildren()
  });
}

function isShellRuntime(value: MinimalProductShellRuntime | HTMLElement): value is MinimalProductShellRuntime {
  return "view" in value && "sendMessage" in value;
}

function enterRealityContext(shell: MinimalProductShellRuntime): MinimalProductShellView {
  const current = shell.view();
  const reality = current.availableWorlds.find((world) => world.type === "reality");
  return reality ? shell.switchWorld(reality.worldId) : current;
}

function refreshView(shell: MinimalProductShellRuntime): MinimalProductShellView {
  return shell.view();
}

function createInteractionController(
  shell: MinimalProductShellRuntime,
  state: SemanticMobileState,
  render: () => void
): InteractionController {
  const registry = createBehaviorRegistry();
  const flowExecutor = createFlowExecutor();

  const dispatch = (action: InteractionAction): void => {
    const stateTransition = registry.execute(action, state);
    const flowResult = flowExecutor.run(action, { shell, state });
    if (!stateTransition.shouldRender && !flowResult.shouldRender) {
      return;
    }
    commitStateTransition(state, render);
  };

  return Object.freeze({ dispatch });
}

function commitStateTransition(state: SemanticMobileState, render: () => void): void {
  ViewRouter.resolve(state.activeView);
  render();
}

function createSplash(): HTMLElement {
  const screen = document.createElement("main");
  screen.className = "mvp-splash";

  const title = document.createElement("h1");
  title.textContent = "ovOne";

  const first = document.createElement("p");
  first.textContent = "一个 AI。";

  const second = document.createElement("p");
  second.textContent = "一个入口。";

  screen.append(title, first, second);
  return screen;
}

function createChatShell(
  shell: MinimalProductShellRuntime,
  state: SemanticMobileState,
  render: () => void
): HTMLElement {
  const routeState = ViewRouter.resolve(state.activeView);
  const controller = createInteractionController(shell, state, render);
  const snapshot = state.view.product.snapshot;
  const app = document.createElement("main");
  app.className = "mvp-shell";

  const viewport = document.createElement("section");
  viewport.className = "mvp-viewport";
  viewport.append(createShellPageFrame(routeState, renderShellPage(routeState, snapshot, state, controller)));

  app.append(
    viewport,
    createWorldCreationTransitionLayer(state, controller),
    createOverlayLayer(ViewRouter.currentOverlay(state), state, controller),
    createBottomNav(state, controller)
  );
  return app;
}

const ViewRouter = Object.freeze({
  resolve: createBehaviorRegistry().resolveView,
  currentOverlay: createBehaviorRegistry().currentOverlay
});

function renderShellPage(
  routeState: ViewRouteResolution,
  snapshot: WorldSnapshot,
  state: SemanticMobileState,
  controller: InteractionController
): HTMLElement {
  switch (routeState.route) {
    case "CHAT_LIST":
      return createChatList(snapshot, state, controller);
    case "CHAT_VIEW":
      return createChatView(snapshot, state, controller);
    case "CONTACTS":
      return createContactsView(snapshot, state, controller);
    case "CONTACT_DETAIL":
      return createContactDetailView(snapshot, state, controller);
    case "ME":
      return createMeView(snapshot, state, controller);
    case "CHAT_SETTINGS":
      return createChatSettingsView(snapshot, state, controller);
    case "CREATE_GROUP_DRAFT":
      return createCreateGroupDraftView(snapshot, state, controller);
    case "CREATE_WORLD_DRAFT":
      return createCreateWorldDraftView(snapshot, state, controller);
    case "CREATE_WORLD_DETAIL_EDIT":
      return createCreateWorldDetailEditView(snapshot, state, controller);
    case "WORLD_EDITOR":
      return createWorldEditorView(snapshot, state, controller);
  }
}

function createShellPageFrame(routeState: ViewRouteResolution, page: HTMLElement): HTMLElement {
  const frame = document.createElement("section");
  frame.className = `mvp-page mvp-page-${routeState.route.toLowerCase().replaceAll("_", "-")}`;
  frame.append(page);
  return frame;
}

function createBottomNav(state: SemanticMobileState, controller: InteractionController): HTMLElement {
  const nav = document.createElement("nav");
  nav.className = "mvp-bottom-nav";
  nav.setAttribute("aria-label", "主导航");

  for (const item of [
    { tab: "chats", label: "聊天" },
    { tab: "contacts", label: "联系人" },
    { tab: "me", label: "我的" }
  ] as const) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = tabForView(state.activeView) === item.tab ? "mvp-nav-item is-active" : "mvp-nav-item";
    button.textContent = item.label;
    bindControllerAction(button, controller, actionForTab(item.tab));
    nav.append(button);
  }

  return nav;
}

function actionForTab(tab: MobileMvpTab): InteractionAction {
  if (tab === "contacts") {
    return { type: "NAV_OPEN_CONTACTS" };
  }
  if (tab === "me") {
    return { type: "NAV_OPEN_ME" };
  }
  return { type: "NAV_OPEN_CHAT_LIST" };
}

function createChatList(
  snapshot: WorldSnapshot,
  state: SemanticMobileState,
  controller: InteractionController
): HTMLElement {
  const screen = document.createElement("section");
  screen.className = "mvp-screen mvp-chat-list-screen";

  screen.append(createHomeHeader(controller));

  const list = document.createElement("ol");
  list.className = "mvp-chat-list";

  for (const chat of chatsFromSnapshot(snapshot, state.currentWorldId)) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mvp-chat-row";
    bindControllerAction(button, controller, { type: "OPEN_CHAT", chatId: chat.id });

    button.append(
      createAvatarWithStatus(createChatAvatar(snapshot, chat), true),
      createChatListText(chatTitle(snapshot, chat), chatPreview(chat)),
      createChatMeta(snapshot, chat)
    );
    item.append(button);
    list.append(item);
  }

  screen.append(list);
  return screen;
}

function createChatView(
  snapshot: WorldSnapshot,
  state: SemanticMobileState,
  controller: InteractionController
): HTMLElement {
  const isOvoChat = isOvoChatId(state.activeChatId);
  const chat = isOvoChat ? null : chatById(snapshot, state.activeChatId ?? snapshot.chatState.activeChatId);
  const title = isOvoChat ? "ovO" : chat ? chatHeaderTitle(snapshot, chat) : "聊天";

  const screen = document.createElement("section");
  screen.className = "mvp-screen mvp-chat-view";

  const back = document.createElement("button");
  back.type = "button";
  back.className = "mvp-back-button";
  back.textContent = "聊天";
  bindControllerAction(back, controller, { type: "NAV_BACK" });

  const heading = document.createElement("div");
  heading.className = "mvp-chat-title";
  heading.append(
    createAvatarWithStatus(isOvoChat ? createOvoAvatar() : createChatAvatar(snapshot, chat), true),
    createNameBlock(title, "在线")
  );

  const menu = document.createElement("button");
  menu.type = "button";
  menu.className = "mvp-chat-menu-button";
  menu.textContent = "⋯";
  menu.setAttribute("aria-label", "更多");
  bindControllerAction(menu, controller, { type: "OPEN_CHAT_SETTINGS" });

  const header = document.createElement("header");
  header.className = "mvp-chat-page-header";
  header.append(back, heading, menu);

  const messages = document.createElement("ol");
  messages.className = "mvp-message-stream";
  for (const message of isOvoChat ? [] : (chat?.messages ?? [])) {
    messages.append(createMessageItem(snapshot, message));
  }

  screen.append(header, messages, createComposer(snapshot, state, controller));
  return screen;
}

function createComposer(
  snapshot: WorldSnapshot,
  state: SemanticMobileState,
  controller: InteractionController
): HTMLElement {
  const form = document.createElement("form");
  form.className = "mvp-composer";
  const composerKind: ComposerKind = isOvoChatId(state.activeChatId) ? "ovo" : "normal";
  const composerMode = isComposerModeAllowed(composerKind, state.composerMode)
    ? state.composerMode
    : resolveDefaultComposerMode(composerKind);

  const left = document.createElement("button");
  left.type = "button";
  left.className = "mvp-inline-action";
  if (composerKind === "ovo" && composerMode === "world-button") {
    left.textContent = "⌨";
    left.setAttribute("aria-label", "键盘");
    bindControllerAction(left, controller, { type: "TOGGLE_COMPOSER_MODE", kind: "ovo" });
  } else {
    left.textContent = "☺";
    left.setAttribute("aria-label", "表情");
    bindControllerAction(left, controller, { type: "OPEN_EMOJI_PICKER" });
  }
  form.append(left);

  if (composerMode === "text") {
    const action = document.createElement("button");
    action.type = "button";
    action.className = "mvp-inline-action";
    action.textContent = "+";
    action.title = "更多";
    action.setAttribute("aria-label", "更多");
    bindControllerAction(action, controller, { type: "OPEN_FILE_PICKER" });
    form.append(action);

    const input = document.createElement("input");
    input.name = "message";
    input.autocomplete = "off";
    input.placeholder = "输入消息";
    bindTextInput(input, controller);

    const submit = document.createElement("button");
    submit.type = "submit";
    submit.textContent = "发送";

    form.append(input, submit);
    bindComposerSubmit(form, input, controller);
  } else {
    const modeButton = document.createElement("button");
    modeButton.type = "button";
    modeButton.className = "mvp-composer-mode-button";
    modeButton.textContent = composerMode === "world-button" ? `📍 ${snapshot.worldMeta.title}` : "按住说话";
    if (composerMode === "world-button") {
      bindControllerAction(modeButton, controller, { type: "OPEN_OVO_WORLD_MENU" });
    } else {
      modeButton.disabled = true;
    }
    form.append(modeButton);
  }

  return form;
}

function createContactsView(
  snapshot: WorldSnapshot,
  state: SemanticMobileState,
  controller: InteractionController
): HTMLElement {
  const screen = document.createElement("section");
  screen.className = "mvp-screen";
  screen.append(createScreenHeader("联系人", null), createOvoIndicator(snapshot));

  const list = document.createElement("ol");
  list.className = "mvp-contact-list";

  for (const contact of contactsFromSnapshot(snapshot, state.currentWorldId)) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mvp-contact-row";
    button.append(createContactAvatar(contact), createRelationshipText(snapshot, contact));
    bindControllerAction(button, controller, { type: "OPEN_CONTACT", actorId: contact.actorId });
    item.append(button);
    list.append(item);
  }

  screen.append(list);
  return screen;
}

function createMeView(
  snapshot: WorldSnapshot,
  state: SemanticMobileState,
  controller: InteractionController
): HTMLElement {
  const screen = document.createElement("section");
  screen.className = "mvp-screen";
  screen.append(createScreenHeader("我的", null));

  if (state.settingsOpen) {
    screen.append(createSettingsView(state, controller));
    return screen;
  }

  screen.append(createProfileHeader(), createFeatureMenu(snapshot, controller));
  return screen;
}

function createSettingsView(state: SemanticMobileState, controller: InteractionController): HTMLElement {
  const panel = document.createElement("section");
  panel.className = "mvp-settings-panel";

  const back = document.createElement("button");
  back.type = "button";
  back.className = "mvp-back-button";
  back.textContent = "我的";
  bindControllerAction(back, controller, { type: "CLOSE_SETTINGS" });

  const heading = document.createElement("h2");
  heading.textContent = "已连接 AI";

  const disconnectNote = document.createElement("p");
  disconnectNote.className = "mvp-rule-note";
  disconnectNote.textContent = "在这里断开 AI，会从账号中移除该连接。";

  const list = document.createElement("ol");
  list.className = "mvp-connected-list";
  for (const linkedAI of state.view.linkedAIModels ?? []) {
    const item = document.createElement("li");
    const name = document.createElement("span");
    name.textContent = linkedAI.displayName;
    const disconnect = document.createElement("button");
    disconnect.type = "button";
    disconnect.textContent = "断开连接";
    bindControllerAction(disconnect, controller, {
      type: "OPEN_LINKED_AI_DISCONNECT_CONFIRMATION",
      globalAILinkId: linkedAI.globalAILinkId,
      displayName: linkedAI.displayName
    });
    item.append(name, disconnect);
    list.append(item);
  }
  if (state.linkedAIDisconnectConfirmation) {
    const confirmationItem = document.createElement("li");
    const confirmation = document.createElement("section");
    confirmation.className = "mvp-danger-section";
    confirmation.append(
      createDraftNote(state.linkedAIDisconnectConfirmation.warning),
      createLinkedAIDisconnectPreview(state),
      state.linkedAIDisconnectConfirmation.errorMessage
        ? createDraftNote(state.linkedAIDisconnectConfirmation.errorMessage)
        : document.createTextNode(""),
      state.linkedAIDisconnectConfirmation.noticeMessage
        ? createDraftNote(state.linkedAIDisconnectConfirmation.noticeMessage)
        : document.createTextNode(""),
      createMenuButton("取消", controller, { type: "CANCEL_LINKED_AI_DISCONNECT" }),
      createMenuButton("确认断开", controller, {
        type: "CONFIRM_LINKED_AI_DISCONNECT",
        globalAILinkId: state.linkedAIDisconnectConfirmation.globalAILinkId
      })
    );
    confirmationItem.append(confirmation);
    list.append(confirmationItem);
  }

  const language = document.createElement("section");
  language.className = "mvp-language-panel";

  const languageTitle = document.createElement("h2");
  languageTitle.textContent = "语言设置";

  const languageValue = document.createElement("p");
  languageValue.textContent = "简体中文";

  language.append(languageTitle, languageValue);
  panel.append(back, heading, disconnectNote, list, language);
  return panel;
}

function createLinkedAIDisconnectPreview(state: SemanticMobileState): HTMLElement {
  const preview = document.createElement("section");
  preview.className = "mvp-disconnect-preview";
  const model = state.linkedAIDisconnectConfirmation?.preview ?? null;
  if (!model) {
    preview.append(createDraftNote("断开影响范围预览暂不可用"));
    return preview;
  }

  const title = document.createElement("h3");
  title.textContent = "断开影响预览";
  preview.append(title);

  const worlds = document.createElement("ol");
  worlds.className = "mvp-disconnect-world-list";
  for (const world of model.affectedWorlds) {
    const item = document.createElement("li");
    item.append(
      createDraftNote(world.worldTitle),
      createDraftNote(`联系人：${world.privateContactIds.join("、") || "无"}`),
      createDraftNote(`私聊：${world.privateChatIds.join("、") || "无"}`),
      createDraftNote(`记忆：${world.memoryScopeIds.join("、") || "无"}`),
      createDraftNote(`群成员：${world.groupMembershipLabel}`)
    );
    worlds.append(item);
  }
  preview.append(worlds);

  for (const note of model.notes) {
    preview.append(createDraftNote(note));
  }
  return preview;
}

function createProfileHeader(): HTMLElement {
  const header = document.createElement("section");
  header.className = "mvp-profile-header";

  const avatar = document.createElement("button");
  avatar.type = "button";
  avatar.className = "mvp-profile-avatar";
  avatar.textContent = "你";
  avatar.setAttribute("aria-label", "编辑头像");

  const account = document.createElement("div");
  account.className = "mvp-profile-account";

  const userId = document.createElement("button");
  userId.type = "button";
  userId.className = "mvp-profile-user-id";
  userId.textContent = "用户 ID：one-0001";
  userId.setAttribute("aria-label", "编辑用户 ID");

  const binding = document.createElement("button");
  binding.type = "button";
  binding.className = "mvp-profile-binding";
  binding.textContent = "ovO 账号：已绑定";
  binding.setAttribute("aria-label", "编辑账号绑定");

  account.append(userId, binding);
  header.append(avatar, account);
  return header;
}

function createFeatureMenu(snapshot: WorldSnapshot, controller: InteractionController): HTMLElement {
  const menu = document.createElement("section");
  menu.className = "mvp-feature-menu";
  menu.append(
    createFeatureRow("收藏", assistantContacts(snapshot).filter((contact) => !isOvoContact(snapshot, contact)).map(contactDisplayName).join("、") || "暂无"),
    createFeatureRow("胶囊", "即将开放"),
    createFeatureRow("聊天容量", "最多 25 个聊天"),
    createFeatureRow("会员", "未开通"),
    createSettingsRow(controller)
  );
  return menu;
}

function createFeatureRow(label: string, value: string): HTMLElement {
  const row = document.createElement("div");
  row.className = "mvp-feature-row";
  const name = document.createElement("span");
  name.textContent = label;
  const detail = document.createElement("strong");
  detail.textContent = value;
  row.append(name, detail);
  return row;
}

function createSettingsRow(controller: InteractionController): HTMLElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "mvp-feature-row mvp-feature-button";
  const name = document.createElement("span");
  name.textContent = "设置";
  const detail = document.createElement("strong");
  detail.textContent = "账号与语言";
  button.append(name, detail);
  bindControllerAction(button, controller, { type: "OPEN_SETTINGS" });
  return button;
}

function createOvoIndicator(snapshot: WorldSnapshot): HTMLElement {
  const indicator = document.createElement("section");
  indicator.className = "mvp-ovo-indicator";

  const dot = document.createElement("span");
  dot.className = "mvp-presence-dot is-online";
  dot.setAttribute("aria-label", "在线");

  const label = document.createElement("strong");
  label.textContent = "ovO";

  indicator.append(dot, label);
  if (snapshot.worldMeta.lifecycle !== "active") {
    const state = document.createElement("span");
    state.textContent = "安静";
    indicator.append(state);
  }
  return indicator;
}

function createHomeHeader(controller: InteractionController): HTMLElement {
  const header = document.createElement("header");
  header.className = "mvp-home-header";

  const brand = document.createElement("button");
  brand.type = "button";
  brand.className = "mvp-home-brand";
  brand.setAttribute("aria-label", "ovO");
  bindControllerAction(brand, controller, { type: "OPEN_OVO_CHAT" });

  const title = document.createElement("h1");
  title.textContent = "ovO";

  const dot = document.createElement("span");
  dot.className = "mvp-notification-dot";
  dot.setAttribute("aria-label", "有新动态");

  brand.append(title, dot);

  const add = document.createElement("button");
  add.type = "button";
  add.className = "mvp-add-button";
  add.textContent = "+";
  add.setAttribute("aria-label", "添加");
  bindControllerAction(add, controller, { type: "OPEN_ADD_MENU" });

  header.append(brand, add);
  return header;
}

function createOverlayLayer(
  overlayState: MobileOverlay,
  state: SemanticMobileState,
  controller: InteractionController
): HTMLElement {
  const layer = document.createElement("section");
  layer.className = "mvp-overlay-layer";
  layer.setAttribute("aria-label", "浮层");

  const overlay = createOverlayContent(overlayState, state, controller);
  if (overlay) {
    layer.append(overlay);
  }
  return layer;
}

function createWorldCreationTransitionLayer(
  state: SemanticMobileState,
  controller: InteractionController
): HTMLElement {
  const layer = document.createElement("section");
  layer.className = "mvp-world-creation-transition-layer";
  layer.setAttribute("aria-label", "世界载入");
  const transition = state.worldCreationTransition;
  if (!transition || transition.phase === "done") {
    return layer;
  }

  const panel = document.createElement("section");
  panel.className = "mvp-world-creation-transition";

  const loading = document.createElement("p");
  loading.textContent = transition.loadingText;

  const welcome = document.createElement("strong");
  welcome.textContent = transition.welcomeText;

  const continueButton = document.createElement("button");
  continueButton.type = "button";
  continueButton.textContent = "继续";
  bindControllerAction(continueButton, controller, { type: "COMPLETE_WORLD_CREATION_TRANSITION" });

  panel.append(loading, welcome, continueButton);
  layer.append(panel);
  return layer;
}

function createOverlayContent(
  overlayState: MobileOverlay,
  state: SemanticMobileState,
  controller: InteractionController
): HTMLElement | null {
  if (overlayState === "add-menu") {
    return createAddMenu(controller);
  }
  if (overlayState === "chat-menu") {
    return createChatMenu(controller);
  }
  if (overlayState === "ovo-control") {
    return createOvoWorldMenu(controller);
  }
  if (overlayState === "ovo-world-menu") {
    return createOvoWorldMenu(controller);
  }
  if (overlayState === "world-switcher") {
    return createWorldSwitcherPanel(state, controller);
  }
  if (overlayState === "world-editor-selector") {
    return createWorldEditorSelectorPanel(state, controller);
  }
  if (overlayState === "emoji-picker") {
    return createEmojiPicker();
  }
  if (overlayState === "file-picker") {
    return createFilePicker();
  }
  return null;
}

function createAddMenu(controller: InteractionController): HTMLElement {
  const menu = document.createElement("section");
  menu.className = "mvp-overlay-panel mvp-add-menu";
  menu.append(
    createMenuButton("添加 AI 好友", controller, { type: "CREATE_AI_FRIEND" }),
    createMenuButton("创建群聊", controller, { type: "OPEN_CREATE_GROUP_DRAFT" }),
    createMenuButton("创建世界", controller, { type: "OPEN_CREATE_WORLD_DRAFT" })
  );
  return menu;
}

function createCreateGroupDraftView(
  snapshot: WorldSnapshot,
  state: SemanticMobileState,
  controller: InteractionController
): HTMLElement {
  const draft = state.createGroupDraft ?? {
    groupName: "",
    selectedWorldContactIds: [],
    validationError: null,
    fieldErrors: {
      selectedMembers: null
    },
    noticeMessage: null
  };
  const screen = document.createElement("section");
  screen.className = "mvp-screen mvp-create-group-draft";

  const back = document.createElement("button");
  back.type = "button";
  back.className = "mvp-back-button";
  back.textContent = "聊天";
  bindControllerAction(back, controller, { type: "NAV_BACK" });

  const name = document.createElement("input");
  name.name = "groupName";
  name.placeholder = "群聊名称";
  name.value = draft.groupName;
  bindCreateGroupDraftInput(name, controller);

  const candidates = document.createElement("section");
  candidates.className = "mvp-create-world-section";
  for (const contact of contactsFromSnapshot(snapshot, state.currentWorldId)) {
    candidates.append(createDraftOption(contactDisplayName(contact), draft.selectedWorldContactIds.includes(contact.actorId), controller, {
      type: "TOGGLE_CREATE_GROUP_MEMBER",
      worldContactId: contact.actorId
    }));
  }
  if (candidates.childElementCount === 0) {
    candidates.append(createDraftNote("当前没有可加入群聊的 AI 成员"));
  }
  if (draft.fieldErrors.selectedMembers) {
    candidates.append(createValidationNote(draft.fieldErrors.selectedMembers));
  }
  if (draft.noticeMessage) {
    candidates.append(createDraftNote(draft.noticeMessage));
  }

  const actions = document.createElement("section");
  actions.className = "mvp-create-world-actions";
  actions.append(
    createMenuButton("取消", controller, { type: "CANCEL_CREATE_GROUP" }),
    createMenuButton("创建群聊", controller, { type: "CONFIRM_CREATE_GROUP" })
  );

  screen.append(
    createScreenHeader("创建群聊", back),
    createDraftStage("群聊名称", name),
    createDraftStage("选择 AI 成员", candidates),
    actions
  );
  return screen;
}

function createChatSettingsView(
  snapshot: WorldSnapshot,
  state: SemanticMobileState,
  controller: InteractionController
): HTMLElement {
  const chat = chatById(snapshot, state.selectedChatIdForSettings ?? state.activeChatId);
  const group = chat ? snapshot.groups.find((candidate) => candidate.id === chat.id) ?? null : null;
  const draft = state.chatSettingsDraft ?? {
    chatId: chat?.id ?? "",
    groupRulesText: "",
    groupFileName: "",
    groupFileType: "",
    groupFileSize: "",
    backgroundImagePlaceholder: "",
    backgroundColor: "#ffffff",
    myBubbleColor: "#dcecff",
    otherBubbleColor: "#f2f2f2",
    groupMemberRemoveConfirmation: null,
    noticeMessage: null
  };
  const screen = document.createElement("section");
  screen.className = "mvp-screen mvp-chat-settings";

  const back = document.createElement("button");
  back.type = "button";
  back.className = "mvp-back-button";
  back.textContent = "聊天";
  bindControllerAction(back, controller, { type: "CANCEL_CHAT_SETTINGS" });

  const content = document.createElement("section");
  content.className = "mvp-create-world-section";

  if (group) {
    content.append(
      createDraftStage("群成员", createGroupMembersSettings(snapshot, group, draft, controller)),
      createDraftStage("群规则", createGroupRulesSettings(draft, controller)),
      createDraftStage("群文件", createGroupFilesSettings(chat, draft, controller))
    );
  }

  content.append(createDraftStage("当前聊天设置", createChatAppearanceSettings(draft, controller)));
  if (draft.noticeMessage) {
    content.append(createDraftNote(draft.noticeMessage));
  }

  const actions = document.createElement("section");
  actions.className = "mvp-create-world-actions";
  actions.append(
    createMenuButton("取消", controller, { type: "CANCEL_CHAT_SETTINGS" }),
    createMenuButton("保存", controller, { type: "SAVE_CHAT_SETTINGS" })
  );

  screen.append(createScreenHeader(chat ? chatHeaderTitle(snapshot, chat) : "聊天设置", back), content, actions);
  return screen;
}

function createGroupMembersSettings(
  snapshot: WorldSnapshot,
  group: WorldSnapshot["groups"][number],
  draft: NonNullable<SemanticMobileState["chatSettingsDraft"]>,
  controller: InteractionController
): HTMLElement {
  const section = document.createElement("section");
  section.className = "mvp-create-world-section";
  const membersTitle = document.createElement("p");
  membersTitle.className = "mvp-create-world-note";
  membersTitle.textContent = "当前成员";
  section.append(membersTitle);
  for (const actorId of group.actorIds) {
    const contact = contactByActorId(snapshot, actorId);
    const row = document.createElement("div");
    row.className = "mvp-create-world-ai-row";
    row.append(createDraftNote(contact ? contactDisplayName(contact) : actorId));
    row.append(createMenuButton("移除", controller, { type: "OPEN_GROUP_REMOVE_MEMBER", worldContactId: actorId }));
    section.append(row);
  }
  const candidates = resolveGroupAddMemberCandidates(group.id, {
    worldId: snapshot.worldMeta.id,
    assistantActorId: snapshot.worldMeta.assistantActorId,
    contacts: snapshot.contacts,
    groups: snapshot.groups
  });
  section.append(createDraftNote("可添加成员"));
  if (candidates.length === 0) {
    section.append(createDraftNote("暂无可添加的 AI 成员"));
  }
  for (const candidate of candidates) {
    const row = document.createElement("div");
    row.className = "mvp-create-world-ai-row";
    row.append(createDraftNote(candidate.displayName));
    row.append(createMenuButton("添加", controller, { type: "CONFIRM_GROUP_ADD_MEMBER", worldContactId: candidate.worldContactId }));
    section.append(row);
  }
  if (draft.groupMemberRemoveConfirmation) {
    const confirmation = document.createElement("section");
    confirmation.className = "mvp-create-world-section";
    confirmation.append(
      createDraftNote(draft.groupMemberRemoveConfirmation.warning),
      createMenuButton("确认移除", controller, {
        type: "CONFIRM_GROUP_REMOVE_MEMBER",
        worldContactId: draft.groupMemberRemoveConfirmation.worldContactId
      }),
      createMenuButton("取消", controller, { type: "CANCEL_GROUP_MEMBER_MANAGEMENT" })
    );
    section.append(confirmation);
  }
  section.append(
    createMenuButton("添加群成员", controller, { type: "OPEN_GROUP_ADD_MEMBER" }),
    createMenuButton("移除群成员", controller, { type: "OPEN_GROUP_REMOVE_MEMBER" })
  );
  return section;
}

function createScaffoldAction(label: string, controller: InteractionController, action: InteractionAction): HTMLElement {
  const section = document.createElement("section");
  section.className = "mvp-create-world-section";
  section.append(createMenuButton(label, controller, action));
  return section;
}

function createGroupFilesSettings(
  chat: WorldChatSession | null,
  draft: NonNullable<SemanticMobileState["chatSettingsDraft"]>,
  controller: InteractionController
): HTMLElement {
  const section = document.createElement("section");
  section.className = "mvp-create-world-section";
  const files = chat?.groupFiles ?? [];
  if (files.length === 0) {
    section.append(createDraftNote(GROUP_FILES_EMPTY_MESSAGE));
  } else {
    const list = document.createElement("section");
    list.className = "mvp-create-world-section";
    for (const file of files) {
      const item = document.createElement("p");
      item.className = "mvp-create-world-note";
      item.textContent = file.fileName;
      list.append(item);
    }
    section.append(list);
  }
  section.append(
    createGroupFileField("文件名", "fileName", draft.groupFileName, controller),
    createGroupFileField("文件类型", "fileType", draft.groupFileType, controller),
    createGroupFileField("文件大小", "fileSize", draft.groupFileSize, controller),
    createMenuButton("添加群文件记录", controller, { type: "CONFIRM_GROUP_FILE_METADATA" })
  );
  return section;
}

function createGroupFileField(
  label: string,
  field: "fileName" | "fileType" | "fileSize",
  value: string,
  controller: InteractionController
): HTMLElement {
  const wrapper = document.createElement("label");
  wrapper.className = "mvp-create-world-field";
  const text = document.createElement("span");
  text.textContent = label;
  const input = document.createElement("input");
  input.type = field === "fileSize" ? "number" : "text";
  input.name = `groupFile.${field}`;
  input.value = value;
  bindGroupFileDraftInput(input, controller, field);
  wrapper.append(text, input);
  return wrapper;
}

function createGroupRulesSettings(
  draft: NonNullable<SemanticMobileState["chatSettingsDraft"]>,
  controller: InteractionController
): HTMLElement {
  const section = document.createElement("section");
  section.className = "mvp-create-world-section";
  const rules = document.createElement("textarea");
  rules.name = "groupRulesText";
  rules.placeholder = "填写群规";
  rules.value = draft.groupRulesText;
  bindGroupRulesDraftInput(rules, controller);
  section.append(
    rules,
    createDraftNote("留空表示不添加额外群级规则"),
    createMenuButton("保存群规", controller, { type: "SAVE_GROUP_RULES" })
  );
  return section;
}

function createChatAppearanceSettings(
  draft: NonNullable<SemanticMobileState["chatSettingsDraft"]>,
  controller: InteractionController
): HTMLElement {
  const section = document.createElement("section");
  section.className = "mvp-create-world-section";
  section.append(createMenuButton("上传聊天背景图片", controller, { type: "UPLOAD_CHAT_BACKGROUND_IMAGE" }));
  if (draft.backgroundImagePlaceholder) {
    section.append(createDraftNote(draft.backgroundImagePlaceholder));
  }
  section.append(
    createColorField("聊天背景颜色", draft.backgroundColor, controller, "backgroundColor"),
    createColorField("我的气泡颜色", draft.myBubbleColor, controller, "myBubbleColor"),
    createColorField("对方气泡颜色", draft.otherBubbleColor, controller, "otherBubbleColor")
  );
  return section;
}

function createColorField(
  label: string,
  value: string,
  controller: InteractionController,
  field: "backgroundColor" | "myBubbleColor" | "otherBubbleColor"
): HTMLElement {
  const wrapper = document.createElement("label");
  wrapper.className = "mvp-create-world-field";
  const text = document.createElement("span");
  text.textContent = label;
  const input = document.createElement("input");
  input.type = "color";
  input.value = value;
  bindChatSettingsDraftInput(input, controller, field);
  wrapper.append(text, input);
  return wrapper;
}

function createCreateWorldDraftView(
  snapshot: WorldSnapshot,
  state: SemanticMobileState,
  controller: InteractionController
): HTMLElement {
  const draft = state.createWorldDraft ?? {
    worldName: "",
    worldviewSourceType: "text",
    worldviewText: "",
    selectedAIModelIds: [],
    nextMode: null,
    detailRoleMode: "random-role",
    randomRoleSlots: [],
    selectedUserRoleSlotId: null,
    fixedRoles: [],
    validationError: null,
    fieldErrors: {
      worldName: null,
      selectedAI: null
    },
    noticeMessage: null
  };
  const screen = document.createElement("section");
  screen.className = "mvp-screen mvp-create-world-draft";

  const back = document.createElement("button");
  back.type = "button";
  back.className = "mvp-back-button";
  back.textContent = "聊天";
  bindControllerAction(back, controller, { type: "NAV_BACK" });

  const name = document.createElement("input");
  name.name = "worldName";
  name.placeholder = "世界名称";
  name.value = draft.worldName;
  markFieldInvalid(name, draft.fieldErrors.worldName);
  bindCreateWorldDraftInput(name, controller, "worldName");

  const worldview = document.createElement("textarea");
  worldview.name = "worldviewText";
  worldview.placeholder = "写下世界观";
  worldview.value = draft.worldviewText;
  bindCreateWorldDraftInput(worldview, controller, "worldviewText");

  const sourceControls = document.createElement("section");
  sourceControls.className = "mvp-create-world-source-controls";
  sourceControls.append(
    createDraftOption("文本世界观", draft.worldviewSourceType === "text", controller, {
      type: "SELECT_WORLDVIEW_SOURCE",
      sourceType: "text"
    }),
    createDraftOption("导入世界观文档", draft.worldviewSourceType === "worldview-document", controller, {
      type: "SELECT_WORLDVIEW_SOURCE",
      sourceType: "worldview-document"
    }),
    createDraftOption("导入项目文档", draft.worldviewSourceType === "project-document", controller, {
      type: "SELECT_WORLDVIEW_SOURCE",
      sourceType: "project-document"
    }),
    createDraftOption("空白世界", draft.worldviewSourceType === "blank", controller, {
      type: "SELECT_WORLDVIEW_SOURCE",
      sourceType: "blank"
    })
  );

  const officialChips = document.createElement("section");
  officialChips.className = "mvp-create-world-official-chips";
  officialChips.append(
    createDraftChip("魔法学院", draft.worldviewSourceType === "official", controller),
    createDraftChip("修仙世界", draft.worldviewSourceType === "official", controller)
  );

  const worldviewBlock = document.createElement("section");
  worldviewBlock.className = "mvp-create-world-worldview-block";
  worldviewBlock.append(worldview, sourceControls, officialChips);
  if (draft.noticeMessage) {
    worldviewBlock.append(createValidationNote(draft.noticeMessage));
  }

  const aiList = document.createElement("section");
  aiList.className = "mvp-create-world-section";
  for (const contact of assistantContacts(snapshot).filter((item) => !isOvoContact(snapshot, item))) {
    aiList.append(
      createDraftOption(contactDisplayName(contact), draft.selectedAIModelIds.includes(contact.actorId), controller, {
        type: "TOGGLE_CREATE_WORLD_AI",
        aiModelId: contact.actorId
      })
    );
  }
  if (aiList.childElementCount === 0) {
    aiList.append(createDraftNote("暂无可选 AI 好友"));
  }
  if (draft.fieldErrors.selectedAI) {
    aiList.append(createValidationNote(draft.fieldErrors.selectedAI));
  }

  const nextMode = document.createElement("section");
  nextMode.className = "mvp-create-world-section";
  nextMode.append(
    createDraftOption("随机角色", draft.nextMode === "random-role", controller, {
      type: "SELECT_CREATE_WORLD_NEXT_MODE",
      nextMode: "random-role"
    }),
    createDraftOption("详细编辑", draft.nextMode === "detailed-edit", controller, {
      type: "OPEN_CREATE_WORLD_DETAIL_EDIT"
    })
  );

  const actions = document.createElement("section");
  actions.className = "mvp-create-world-actions";
  actions.append(createMenuButton("取消", controller, { type: "CANCEL_CREATE_WORLD_DRAFT" }));
  if (draft.nextMode === "random-role") {
    actions.append(createMenuButton("进入世界", controller, { type: "CONFIRM_CREATE_WORLD_DRAFT" }));
  }

  screen.append(
    createScreenHeader("创建世界", back),
    createDraftStage("世界名称", draft.fieldErrors.worldName ? createFieldWithValidation(name, draft.fieldErrors.worldName) : name),
    createDraftStage("世界观", worldviewBlock),
    createDraftStage("选择 AI 好友", aiList),
    createDraftStage("下一步", nextMode),
    actions
  );
  return screen;
}

function createCreateWorldDetailEditView(
  snapshot: WorldSnapshot,
  state: SemanticMobileState,
  controller: InteractionController
): HTMLElement {
  const draft = state.createWorldDraft ?? {
    worldName: "",
    worldviewSourceType: "text",
    worldviewText: "",
    selectedAIModelIds: [],
    nextMode: "detailed-edit" as const,
    detailRoleMode: "random-role" as const,
    randomRoleSlots: [],
    selectedUserRoleSlotId: null,
    fixedRoles: [],
    validationError: null,
    fieldErrors: {
      worldName: null,
      selectedAI: null
    },
    noticeMessage: null
  };
  const screen = document.createElement("section");
  screen.className = "mvp-screen mvp-create-world-detail-edit";

  const back = document.createElement("button");
  back.type = "button";
  back.className = "mvp-back-button";
  back.textContent = "创建世界";
  bindControllerAction(back, controller, { type: "NAV_BACK" });

  const name = document.createElement("input");
  name.name = "worldName";
  name.placeholder = "世界名称";
  name.value = draft.worldName;
  markFieldInvalid(name, draft.fieldErrors.worldName);
  bindCreateWorldDetailInput(name, controller, "worldName");

  const worldview = document.createElement("textarea");
  worldview.name = "worldviewText";
  worldview.placeholder = "扩写世界观";
  worldview.value = draft.worldviewText;
  bindCreateWorldDetailInput(worldview, controller, "worldviewText");

  const worldSection = document.createElement("section");
  worldSection.className = "mvp-create-world-detail-section";
  worldSection.append(name, worldview);
  if (draft.fieldErrors.worldName) {
    worldSection.append(createValidationNote(draft.fieldErrors.worldName));
  }
  if (draft.fieldErrors.selectedAI) {
    worldSection.append(createValidationNote(draft.fieldErrors.selectedAI));
  }

  const roleModes = document.createElement("section");
  roleModes.className = "mvp-create-world-section";
  roleModes.append(
    createDraftOption("随机角色", draft.detailRoleMode === "random-role", controller, {
      type: "SELECT_DETAIL_ROLE_MODE",
      roleMode: "random-role"
    }),
    createDraftOption("固定角色", draft.detailRoleMode === "fixed-role", controller, {
      type: "SELECT_DETAIL_ROLE_MODE",
      roleMode: "fixed-role"
    }),
    createDraftOption("空角色", draft.detailRoleMode === "empty-role", controller, {
      type: "SELECT_DETAIL_ROLE_MODE",
      roleMode: "empty-role"
    })
  );

  const roleSetup = createDetailRoleSetup(snapshot, draft, controller);

  const actions = document.createElement("section");
  actions.className = "mvp-create-world-actions";
  actions.append(
    createMenuButton("取消", controller, { type: "CANCEL_CREATE_WORLD_DETAIL" }),
    createMenuButton("进入世界", controller, { type: "CONFIRM_CREATE_WORLD_DETAIL" })
  );

  screen.append(
    createScreenHeader("详细编辑", back),
    createDraftStage("世界", worldSection),
    createDraftStage("角色分配", roleModes),
    roleSetup,
    actions
  );
  return screen;
}

function createWorldEditorView(
  snapshot: WorldSnapshot,
  state: SemanticMobileState,
  controller: InteractionController
): HTMLElement {
  const draft = state.worldEditorDraft ?? createWorldEditorFallbackDraft(snapshot, state);
  const isReality = draft.locked;
  const screen = document.createElement("section");
  screen.className = "mvp-screen mvp-world-editor";

  const back = document.createElement("button");
  back.type = "button";
  back.className = "mvp-back-button";
  back.textContent = "聊天";
  bindControllerAction(back, controller, { type: "CANCEL_WORLD_EDITOR" });

  const name = document.createElement("input");
  name.name = "worldEditorName";
  name.placeholder = "世界名称";
  name.value = draft.worldName;
  name.disabled = isReality;
  markFieldInvalid(name, draft.fieldErrors.worldName);
  bindWorldEditorInput(name, controller, "worldName");

  const worldview = document.createElement("textarea");
  worldview.name = "worldEditorWorldview";
  worldview.placeholder = "世界观 / 世界设定";
  worldview.value = draft.worldviewText;
  worldview.disabled = isReality;
  bindWorldEditorInput(worldview, controller, "worldviewText");

  const worldSection = document.createElement("section");
  worldSection.className = "mvp-world-editor-section";
  worldSection.append(name, worldview);
  if (isReality) {
    worldSection.append(createValidationNote("现实世界世界观不可修改"));
  }
  if (draft.fieldErrors.worldName) {
    worldSection.append(createValidationNote(draft.fieldErrors.worldName));
  }
  for (const warning of draft.warnings) {
    worldSection.append(createDraftNote(warning));
  }
  if (!isReality && !draft.warnings.includes(WORLD_EDITOR_LARGE_WORLDVIEW_CHANGE_WARNING)) {
    worldSection.append(createDraftNote(WORLD_EDITOR_LARGE_WORLDVIEW_CHANGE_WARNING));
  }
  if (!isReality && !draft.worldviewText.trim() && !draft.warnings.includes(WORLD_EDITOR_EMPTY_WORLDVIEW_WARNING)) {
    worldSection.append(createDraftNote(WORLD_EDITOR_EMPTY_WORLDVIEW_WARNING));
  }

  const roleSection = document.createElement("section");
  roleSection.className = "mvp-world-editor-section";
  roleSection.append(createWorldEditorRoleMemberScaffold(state, draft, controller));
  roleSection.append(createWorldEditorRemoveMemberScaffold(state, draft, controller));

  const memberSection = document.createElement("section");
  memberSection.className = "mvp-world-editor-section";
  memberSection.append(createWorldEditorAddMemberScaffold(state, draft, controller));

  const actions = document.createElement("section");
  actions.className = "mvp-world-editor-actions";
  const saveButton = createMenuButton("保存", controller, { type: "SAVE_WORLD_EDITOR" });
  if (isReality) {
    saveButton.setAttribute("disabled", "true");
  }
  actions.append(createMenuButton("取消", controller, { type: "CANCEL_WORLD_EDITOR" }), saveButton);
  if (draft.noticeMessage) {
    actions.append(createValidationNote(draft.noticeMessage));
  }

  screen.append(
    createScreenHeader("编辑世界", back),
    createDraftStage("世界名称", name),
    createDraftStage("世界观 / 世界设定", worldSection),
    createDraftStage("角色 / 成员", roleSection),
    createDraftStage("添加 AI 成员", memberSection),
    actions
  );
  return screen;
}

function createWorldEditorRoleMemberScaffold(
  state: SemanticMobileState,
  draft: WorldEditorDraft,
  controller: InteractionController
): HTMLElement {
  const section = document.createElement("section");
  section.className = "mvp-world-editor-role-member";
  if (draft.locked) {
    section.append(createDraftNote("现实世界不支持角色 / 成员设定编辑"));
    return section;
  }

  const userRole = draft.userRole ?? { roleName: "", personaNotes: "" };
  const userRow = document.createElement("section");
  userRow.className = "mvp-world-editor-role-row";
  const userTitle = document.createElement("strong");
  userTitle.textContent = "我的角色";
  const userRoleName = createWorldEditorRoleInput("roleName", "角色名", userRole.roleName);
  bindWorldEditorUserRoleInput(userRoleName, controller, "roleName");
  const userPersonaNotes = createWorldEditorRoleTextarea("personaNotes", "身份 / 人设备注", userRole.personaNotes);
  bindWorldEditorUserRoleInput(userPersonaNotes, controller, "personaNotes");
  userRow.append(userTitle, userRoleName, userPersonaNotes);
  section.append(userRow);

  const memberRoles = draft.memberRoles ?? [];
  if (memberRoles.length === 0) {
    section.append(createDraftNote("当前世界暂无 AI 成员角色设定"));
  }
  for (const role of memberRoles) {
    const row = document.createElement("section");
    row.className = "mvp-world-editor-member-role-row";
    const title = document.createElement("strong");
    title.textContent = linkedAiDisplayName(state, role.worldContactId);
    const roleName = createWorldEditorRoleInput("worldRoleName", "世界角色名", role.worldRoleName);
    bindWorldEditorMemberRoleInput(roleName, controller, role.worldContactId, "worldRoleName");
    const personaNotes = createWorldEditorRoleTextarea("worldPersonaNotes", "此世界中的关系 / 背景", role.worldPersonaNotes);
    bindWorldEditorMemberRoleInput(personaNotes, controller, role.worldContactId, "worldPersonaNotes");
    row.append(title, roleName, personaNotes);
    section.append(row);
  }
  section.append(createDraftNote("角色设定将在保存时更新"));
  return section;
}

function createWorldEditorAddMemberScaffold(
  state: SemanticMobileState,
  draft: WorldEditorDraft,
  controller: InteractionController
): HTMLElement {
  const section = document.createElement("section");
  section.className = "mvp-world-editor-add-member";
  if (draft.locked) {
    section.append(createDraftNote(WORLD_MEMBER_REALITY_LOCKED_MESSAGE));
    return section;
  }

  const selectedWorld = state.view.availableWorlds.find((world) => world.worldId === draft.worldId);
  const existingActorIds = new Set(selectedWorld?.memberActorIds ?? []);
  const candidates = (state.view.linkedAIModels ?? []).filter((candidate) => !existingActorIds.has(candidate.actorId));
  if (candidates.length === 0) {
    section.append(createDraftNote("暂无可添加 AI 成员"));
    return section;
  }

  for (const candidate of candidates) {
    const button = createMenuButton(`添加 ${candidate.displayName}`, controller, {
      type: "ADD_WORLD_MEMBER",
      worldId: draft.worldId,
      globalAILinkId: candidate.globalAILinkId
    });
    section.append(button);
  }
  section.append(createDraftNote("添加后只会创建当前世界内的联系人、私聊和独立记忆占位。"));
  return section;
}

function createWorldEditorRemoveMemberScaffold(
  state: SemanticMobileState,
  draft: WorldEditorDraft,
  controller: InteractionController
): HTMLElement {
  const section = document.createElement("section");
  section.className = "mvp-world-editor-remove-member";
  if (draft.locked) {
    section.append(createDraftNote(WORLD_MEMBER_REMOVE_REALITY_LOCKED_MESSAGE));
    return section;
  }

  const selectedWorld = state.view.availableWorlds.find((world) => world.worldId === draft.worldId);
  const memberActorIds = selectedWorld?.memberActorIds ?? [];
  if (memberActorIds.length === 0) {
    section.append(createDraftNote("当前世界暂无可删除 AI 成员"));
    return section;
  }

  for (const actorId of memberActorIds) {
    const displayName = linkedAiDisplayName(state, actorId);
    const row = document.createElement("div");
    row.className = "mvp-world-editor-member-row";
    const label = document.createElement("span");
    label.textContent = displayName;
    row.append(
      label,
      createMenuButton("删除", controller, {
        type: "OPEN_REMOVE_WORLD_MEMBER_CONFIRMATION",
        worldId: draft.worldId,
        actorId,
        displayName
      })
    );
    section.append(row);
  }

  if (draft.removeMemberConfirmation) {
    const confirmation = document.createElement("section");
    confirmation.className = "mvp-world-editor-remove-confirmation";
    confirmation.append(
      createValidationNote(draft.removeMemberConfirmation.warning),
      createMenuButton("取消删除", controller, { type: "CANCEL_REMOVE_WORLD_MEMBER" }),
      createMenuButton("确认删除", controller, {
        type: "CONFIRM_REMOVE_WORLD_MEMBER",
        worldId: draft.worldId,
        actorId: draft.removeMemberConfirmation.actorId
      })
    );
    section.append(confirmation);
  }

  section.append(createDraftNote("删除成员暂未开放，确认不会删除联系人、聊天或记忆。"));
  return section;
}

function linkedAiDisplayName(state: SemanticMobileState, actorId: string): string {
  return state.view.linkedAIModels?.find((model) => model.actorId === actorId)?.displayName ?? actorId;
}

function createWorldEditorRoleInput(name: string, placeholder: string, value: string): HTMLInputElement {
  const input = document.createElement("input");
  input.name = name;
  input.placeholder = placeholder;
  input.value = value;
  return input;
}

function createWorldEditorRoleTextarea(name: string, placeholder: string, value: string): HTMLTextAreaElement {
  const textarea = document.createElement("textarea");
  textarea.name = name;
  textarea.placeholder = placeholder;
  textarea.value = value;
  return textarea;
}

function createWorldEditorFallbackDraft(
  snapshot: WorldSnapshot,
  state: SemanticMobileState
): WorldEditorDraft {
  const worldId = state.selectedWorldIdForEditing ?? snapshot.worldMeta.id;
  const selectedWorld = state.view.availableWorlds.find((world) => world.worldId === worldId);
  const isReality = selectedWorld?.type === "reality" || snapshot.worldMeta.type === "reality";
  const runtimeState = snapshot.runtimeState as {
    readonly metadata?: {
      readonly worldView?: Readonly<Record<string, unknown>>;
    };
  };
  const worldView = selectedWorld?.worldView ?? runtimeState.metadata?.worldView ?? {};
  const worldviewText = worldEditorTextFromWorldView(worldView);
  return {
    worldId,
    worldName: selectedWorld?.title ?? snapshot.worldMeta.title,
    worldviewText,
    originalWorldviewText: worldviewText,
    locked: isReality,
    fieldErrors: {
      worldName: null
    },
    warnings: [],
    noticeMessage: null,
    userRole: {
      roleName: "",
      personaNotes: ""
    },
    memberRoles: (selectedWorld?.memberActorIds ?? []).map((actorId) => ({
      worldContactId: actorId,
      worldRoleName: "",
      worldPersonaNotes: ""
    })),
    removeMemberConfirmation: null
  };
}

function createContactDetailFallbackDraft(
  snapshot: WorldSnapshot,
  state: SemanticMobileState
): NonNullable<SemanticMobileState["contactDetailDraft"]> {
  const worldContactId = state.selectedContactActorId ?? "";
  const contact = contactsFromSnapshot(snapshot).find((item) => item.actorId === worldContactId) ?? null;
  return {
    worldId: state.currentWorldId,
    worldContactId,
    remark: "",
    perceivedPersonaNotes: snapshot.worldMeta.type === "reality"
      ? ""
      : [contact?.worldRoleName, contact?.worldPersonaNotes].filter(Boolean).join(" / "),
    answerMode: "conversational",
    chatTone: "",
    emojiPermission: true,
    noticeMessage: null,
    deleteFriendConfirmation: null
  };
}

function worldEditorTextFromWorldView(worldView: Readonly<Record<string, unknown>>): string {
  return typeof worldView.text === "string" ? worldView.text : JSON.stringify(worldView);
}

const CHAT_PANEL_ACTIONS = Object.freeze([
  Object.freeze({ label: "群成员", action: Object.freeze({ type: "CHAT_OPEN_GROUP_MEMBERS" } as const) }),
  Object.freeze({ label: "聊天设置", action: Object.freeze({ type: "CHAT_OPEN_SETTINGS" } as const) }),
  Object.freeze({ label: "背景设置", action: Object.freeze({ type: "CHAT_OPEN_BACKGROUND_SETTINGS" } as const) })
]);

function createChatMenu(controller: InteractionController): HTMLElement {
  const menu = document.createElement("section");
  menu.className = "mvp-overlay-panel mvp-chat-menu";
  menu.append(...CHAT_PANEL_ACTIONS.map((item) => createMenuButton(item.label, controller, item.action)));
  return menu;
}

function createOvoWorldMenu(controller: InteractionController): HTMLElement {
  const menu = document.createElement("section");
  menu.className = "mvp-overlay-panel mvp-ovo-world-menu";
  menu.append(
    createMenuButton("切换世界", controller, { type: "OPEN_WORLD_SWITCHER" }),
    createMenuButton("编辑世界", controller, { type: "OPEN_WORLD_EDITOR_SELECTOR" })
  );
  return menu;
}

function createWorldSwitcherPanel(state: SemanticMobileState, controller: InteractionController): HTMLElement {
  const menu = document.createElement("section");
  menu.className = "mvp-overlay-panel mvp-ovo-control mvp-world-switcher";
  menu.append(createWorldList(state, controller, "switch"));
  return menu;
}

function createWorldEditorSelectorPanel(state: SemanticMobileState, controller: InteractionController): HTMLElement {
  const menu = document.createElement("section");
  menu.className = "mvp-overlay-panel mvp-ovo-control mvp-world-editor-selector";
  menu.append(createWorldList(state, controller, "edit"));
  return menu;
}

function createWorldList(
  state: SemanticMobileState,
  controller: InteractionController,
  mode: "switch" | "edit"
): HTMLElement {
  const worldList = document.createElement("section");
  worldList.className = "mvp-ovo-world-list";
  for (const world of state.view.availableWorlds) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = world.worldId === state.currentWorldId ? "mvp-ovo-world-row is-current" : "mvp-ovo-world-row";
    const currentMark = world.worldId === state.currentWorldId ? "● " : "";
    const currentText = world.worldId === state.currentWorldId ? " · 当前" : "";
    const lockedText = mode === "edit" && world.type === "reality" ? " · 已锁定" : "";
    item.textContent = `${currentMark}${world.title}${currentText}${lockedText}`;
    if (world.worldId === state.currentWorldId) {
      item.setAttribute("aria-current", "true");
    }
    bindControllerAction(
      item,
      controller,
      mode === "switch"
        ? { type: "SWITCH_WORLD", worldId: world.worldId }
        : { type: "OPEN_WORLD_EDITOR", worldId: world.worldId }
    );
    worldList.append(item);
  }
  return worldList;
}

function createContactDetailView(
  snapshot: WorldSnapshot,
  state: SemanticMobileState,
  controller: InteractionController
): HTMLElement {
  const actorId = state.selectedContactActorId;
  const contact = contactsFromSnapshot(snapshot).find((item) => item.actorId === actorId) ?? null;
  const draft = state.contactDetailDraft ?? createContactDetailFallbackDraft(snapshot, state);
  const screen = document.createElement("section");
  screen.className = "mvp-screen mvp-contact-detail";

  const back = document.createElement("button");
  back.type = "button";
  back.className = "mvp-back-button";
  back.textContent = "联系人";
  bindControllerAction(back, controller, { type: "NAV_BACK" });

  const title = document.createElement("strong");
  title.textContent = contact ? contactDisplayName(contact) : "联系人";

  const detail = document.createElement("span");
  detail.textContent = contact ? contactPersona(contact) : "暂无资料";

  const form = document.createElement("section");
  form.className = "mvp-detail-form";
  const remark = createWorldEditorRoleInput("remark", "备注 / 昵称", draft.remark);
  bindContactDetailInput(remark, controller, "remark");
  const perceived = createWorldEditorRoleTextarea("perceivedPersonaNotes", "你认为他是怎样的人？", draft.perceivedPersonaNotes);
  bindContactDetailInput(perceived, controller, "perceivedPersonaNotes");
  const answerMode = document.createElement("select");
  answerMode.name = "answerMode";
  for (const [value, label] of [["conversational", "更像聊天"], ["qa", "更像问答"]] as const) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    option.selected = draft.answerMode === value;
    answerMode.append(option);
  }
  bindContactDetailInput(answerMode, controller, "answerMode");
  const tone = createWorldEditorRoleInput("chatTone", "他 / 她如何和你说话", draft.chatTone);
  bindContactDetailInput(tone, controller, "chatTone");
  const emojiLabel = document.createElement("label");
  const emoji = document.createElement("input");
  emoji.type = "checkbox";
  emoji.checked = draft.emojiPermission;
  bindContactDetailInput(emoji, controller, "emojiPermission");
  emojiLabel.append(emoji, " 允许使用表情");
  form.append(
    createDraftStage("备注", remark),
    createDraftStage("你认为他是怎样的人？", perceived),
    createDraftStage("回答方式", answerMode),
    createDraftStage("说话方式", tone),
    createDraftStage("表情权限", emojiLabel)
  );

  const save = createMenuButton("保存偏好", controller, { type: "SAVE_CONTACT_DETAIL_PREFERENCES" });
  form.append(save);
  if (draft.noticeMessage) {
    form.append(createDraftNote(draft.noticeMessage));
  }

  const deleteSection = document.createElement("section");
  deleteSection.className = "mvp-danger-section";
  const deleteButton = createMenuButton("删除好友", controller, {
    type: "OPEN_DELETE_FRIEND_CONFIRMATION",
    worldId: draft.worldId,
    worldContactId: draft.worldContactId,
    displayName: contact ? contactDisplayName(contact) : "AI"
  });
  deleteSection.append(deleteButton);
  if (draft.deleteFriendConfirmation) {
    deleteSection.append(createDraftNote(draft.deleteFriendConfirmation.warning));
    deleteSection.append(
      createMenuButton("取消", controller, { type: "CANCEL_DELETE_FRIEND" }),
      createMenuButton("确认删除", controller, {
        type: "CONFIRM_DELETE_FRIEND",
        worldId: draft.worldId,
        worldContactId: draft.worldContactId
      })
    );
  }

  screen.append(back, title, detail, form, deleteSection);
  return screen;
}

function createEmojiPicker(): HTMLElement {
  const picker = document.createElement("section");
  picker.className = "mvp-overlay-panel mvp-emoji-picker";
  for (const emoji of ["🙂", "😂", "👍", "❤️", "✨"]) {
    picker.append(createMenuButton(emoji));
  }
  return picker;
}

function createFilePicker(): HTMLElement {
  const picker = document.createElement("section");
  picker.className = "mvp-overlay-panel mvp-file-picker";
  picker.append(createMenuButton("图片"), createMenuButton("文件"), createMenuButton("贴纸"));
  return picker;
}

function createMenuButton(
  label: string,
  controller?: InteractionController,
  action?: InteractionAction
): HTMLElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  if (controller && action) {
    bindControllerAction(button, controller, action);
  }
  return button;
}

function createDraftStage(title: string, content: HTMLElement): HTMLElement {
  const stage = document.createElement("section");
  stage.className = "mvp-create-world-stage";
  const heading = document.createElement("h2");
  heading.textContent = title;
  stage.append(heading, content);
  return stage;
}

function createDraftChip(label: string, selected: boolean, controller: InteractionController): HTMLElement {
  const chip = createDraftOption(label, selected, controller, {
    type: "SELECT_WORLDVIEW_SOURCE",
    sourceType: "official"
  });
  chip.className = selected ? "mvp-create-world-chip is-selected" : "mvp-create-world-chip";
  return chip;
}

function createDraftOption(
  label: string,
  selected: boolean,
  controller: InteractionController,
  action: InteractionAction
): HTMLElement {
  const button = createMenuButton(selected ? `● ${label}` : label, controller, action);
  button.className = selected ? "is-selected" : "";
  return button;
}

function createDraftNote(text: string): HTMLElement {
  const note = document.createElement("p");
  note.className = "mvp-rule-note";
  note.textContent = text;
  return note;
}

function createValidationNote(text: string): HTMLElement {
  const note = createDraftNote(text);
  note.classList.add("mvp-create-world-validation");
  return note;
}

function createFieldWithValidation(field: HTMLElement, message: string): HTMLElement {
  const wrapper = document.createElement("section");
  wrapper.className = "mvp-create-world-field";
  wrapper.append(field, createValidationNote(message));
  return wrapper;
}

function markFieldInvalid(field: HTMLInputElement | HTMLTextAreaElement, message: string | null): void {
  if (!message) {
    return;
  }
  field.classList.add("is-invalid");
  field.setAttribute("aria-invalid", "true");
  field.autofocus = true;
}

function createDetailRoleSetup(
  snapshot: WorldSnapshot,
  draft: NonNullable<SemanticMobileState["createWorldDraft"]>,
  controller: InteractionController
): HTMLElement {
  if (draft.detailRoleMode === "fixed-role") {
    return createFixedRoleSetup(snapshot, draft, controller);
  }
  if (draft.detailRoleMode === "empty-role") {
    return createDraftStage("空角色", createDraftNote("不设定角色，进入世界后不会触发主动初始反应。"));
  }

  const setup = document.createElement("section");
  setup.className = "mvp-create-world-random-roles";
  for (const [index, slot] of randomRoleSlotsForDraft(draft).entries()) {
    setup.append(createRandomRoleSlotRow(slot, index, draft.selectedUserRoleSlotId, controller));
  }
  setup.append(createDraftNote("未填写的角色将由系统随机补全"));
  return createDraftStage("随机角色设置", setup);
}

function randomRoleSlotsForDraft(draft: NonNullable<SemanticMobileState["createWorldDraft"]>) {
  const count = 1 + draft.selectedAIModelIds.length;
  return Array.from({ length: count }, (_, index) => draft.randomRoleSlots[index] ?? {
    id: `role-slot:${index + 1}`,
    roleName: "",
    personaNotes: ""
  });
}

function createRandomRoleSlotRow(
  slot: ReturnType<typeof randomRoleSlotsForDraft>[number],
  index: number,
  selectedUserRoleSlotId: string | null,
  controller: InteractionController
): HTMLElement {
  const row = document.createElement("section");
  row.className = "mvp-create-world-random-role-row";
  const title = document.createElement("strong");
  title.textContent = `Role ${index + 1}`;

  const roleName = document.createElement("input");
  roleName.name = `randomRoleName:${slot.id}`;
  roleName.placeholder = "角色名";
  roleName.value = slot.roleName;
  bindRandomRoleSlotInput(roleName, controller, slot.id, "roleName");

  const notes = document.createElement("input");
  notes.name = `randomRoleNotes:${slot.id}`;
  notes.placeholder = "人设 / 关系备注";
  notes.value = slot.personaNotes;
  bindRandomRoleSlotInput(notes, controller, slot.id, "personaNotes");

  const ownRole = document.createElement("label");
  ownRole.className = "mvp-create-world-role-checkbox";
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = selectedUserRoleSlotId === slot.id;
  bindRandomRoleUserSlot(checkbox, controller, slot.id);
  const checkboxText = document.createElement("span");
  checkboxText.textContent = "分配给我";
  ownRole.append(checkbox, checkboxText);

  row.append(title, roleName, notes, ownRole);
  return row;
}

function createFixedRoleSetup(
  snapshot: WorldSnapshot,
  draft: NonNullable<SemanticMobileState["createWorldDraft"]>,
  controller: InteractionController
): HTMLElement {
  const rows = document.createElement("section");
  rows.className = "mvp-create-world-fixed-roles";
  rows.append(createFixedRoleRow("user", "你", draft, controller));
  for (const contact of assistantContacts(snapshot).filter((item) => draft.selectedAIModelIds.includes(item.actorId))) {
    rows.append(createFixedRoleRow(contact.actorId, contactDisplayName(contact), draft, controller));
  }
  rows.append(createDraftNote("角色信息可稍后继续完善"));
  return createDraftStage("固定角色", rows);
}

function createFixedRoleRow(
  actorId: string,
  label: string,
  draft: NonNullable<SemanticMobileState["createWorldDraft"]>,
  controller: InteractionController
): HTMLElement {
  const row = document.createElement("section");
  row.className = "mvp-create-world-fixed-role-row";
  const title = document.createElement("strong");
  title.textContent = label;
  const role = draft.fixedRoles.find((item) => item.actorId === actorId);

  const roleName = document.createElement("input");
  roleName.name = `roleName:${actorId}`;
  roleName.placeholder = "角色名";
  roleName.value = role?.roleName ?? "";
  bindFixedRoleInput(roleName, controller, actorId, "roleName");

  const notes = document.createElement("input");
  notes.name = `roleNotes:${actorId}`;
  notes.placeholder = "关系 / 人设备注";
  notes.value = role?.notes ?? "";
  bindFixedRoleInput(notes, controller, actorId, "notes");

  row.append(title, roleName, notes);
  return row;
}

function bindControllerAction(
  element: HTMLElement,
  controller: InteractionController,
  action: InteractionAction
): void {
  element.addEventListener("click", () => controller.dispatch(action));
}

function bindComposerSubmit(form: HTMLFormElement, input: HTMLInputElement, controller: InteractionController): void {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    controller.dispatch({ type: "SUBMIT_MESSAGE", text: input.value });
    input.value = "";
  });
}

function bindTextInput(input: HTMLInputElement, controller: InteractionController): void {
  input.addEventListener("input", () => controller.dispatch({ type: "TEXT_INPUT", text: input.value }));
}

function bindCreateWorldDraftInput(
  input: HTMLInputElement | HTMLTextAreaElement,
  controller: InteractionController,
  field: "worldName" | "worldviewText"
): void {
  input.addEventListener("input", () => {
    controller.dispatch({ type: "UPDATE_CREATE_WORLD_DRAFT", field, value: input.value });
  });
}

function bindCreateGroupDraftInput(
  input: HTMLInputElement,
  controller: InteractionController
): void {
  input.addEventListener("input", () => {
    controller.dispatch({ type: "UPDATE_CREATE_GROUP_DRAFT", field: "groupName", value: input.value });
  });
}

function bindChatSettingsDraftInput(
  input: HTMLInputElement,
  controller: InteractionController,
  field: "backgroundColor" | "myBubbleColor" | "otherBubbleColor"
): void {
  input.addEventListener("input", () => {
    controller.dispatch({ type: "UPDATE_CHAT_SETTINGS_DRAFT", field, value: input.value });
  });
}

function bindGroupRulesDraftInput(
  input: HTMLTextAreaElement,
  controller: InteractionController
): void {
  input.addEventListener("input", () => {
    controller.dispatch({ type: "UPDATE_GROUP_RULES_DRAFT", rulesText: input.value });
  });
}

function bindGroupFileDraftInput(
  input: HTMLInputElement,
  controller: InteractionController,
  field: "fileName" | "fileType" | "fileSize"
): void {
  input.addEventListener("input", () => {
    controller.dispatch({ type: "UPDATE_GROUP_FILE_DRAFT", field, value: input.value });
  });
}

function bindCreateWorldDetailInput(
  input: HTMLInputElement | HTMLTextAreaElement,
  controller: InteractionController,
  field: "worldName" | "worldviewText"
): void {
  input.addEventListener("input", () => {
    controller.dispatch({ type: "UPDATE_CREATE_WORLD_DETAIL", field, value: input.value });
  });
}

function bindWorldEditorInput(
  input: HTMLInputElement | HTMLTextAreaElement,
  controller: InteractionController,
  field: "worldName" | "worldviewText"
): void {
  input.addEventListener("input", () => {
    controller.dispatch({ type: "UPDATE_WORLD_EDITOR_DRAFT", field, value: input.value });
  });
}

function bindWorldEditorUserRoleInput(
  input: HTMLInputElement | HTMLTextAreaElement,
  controller: InteractionController,
  field: "roleName" | "personaNotes"
): void {
  input.addEventListener("input", () => {
    controller.dispatch({ type: "UPDATE_WORLD_EDITOR_USER_ROLE_DRAFT", field, value: input.value });
  });
}

function bindWorldEditorMemberRoleInput(
  input: HTMLInputElement | HTMLTextAreaElement,
  controller: InteractionController,
  worldContactId: string,
  field: "worldRoleName" | "worldPersonaNotes"
): void {
  input.addEventListener("input", () => {
    controller.dispatch({ type: "UPDATE_WORLD_EDITOR_MEMBER_ROLE_DRAFT", worldContactId, field, value: input.value });
  });
}

function bindContactDetailInput(
  input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  controller: InteractionController,
  field: "remark" | "perceivedPersonaNotes" | "answerMode" | "chatTone" | "emojiPermission"
): void {
  input.addEventListener("input", () => {
    const value = input instanceof HTMLInputElement && input.type === "checkbox" ? input.checked : input.value;
    controller.dispatch({ type: "UPDATE_CONTACT_DETAIL_DRAFT", field, value });
  });
}

function bindRandomRoleSlotInput(
  input: HTMLInputElement,
  controller: InteractionController,
  slotId: string,
  field: "roleName" | "personaNotes"
): void {
  input.addEventListener("input", () => {
    controller.dispatch({ type: "UPDATE_CREATE_WORLD_RANDOM_ROLE_SLOT", slotId, field, value: input.value });
  });
}

function bindRandomRoleUserSlot(
  input: HTMLInputElement,
  controller: InteractionController,
  slotId: string
): void {
  input.addEventListener("change", () => {
    controller.dispatch({ type: "TOGGLE_RANDOM_ROLE_USER_SLOT", slotId });
  });
}

function bindFixedRoleInput(
  input: HTMLInputElement,
  controller: InteractionController,
  actorId: string,
  field: "roleName" | "notes"
): void {
  input.addEventListener("input", () => {
    controller.dispatch({ type: "UPDATE_CREATE_WORLD_FIXED_ROLE", actorId, field, value: input.value });
  });
}

function createScreenHeader(title: string, leading: HTMLElement | null): HTMLElement {
  const header = document.createElement("header");
  header.className = "mvp-header";
  if (leading) {
    header.append(leading);
  }
  if (title) {
    const heading = document.createElement("h1");
    heading.textContent = title;
    header.append(heading);
  }
  return header;
}

function createMessageItem(snapshot: WorldSnapshot, message: WorldChatMessage): HTMLElement {
  const item = document.createElement("li");
  const mine = message.authorActorId === snapshot.worldMeta.ownerActorId;
  item.className = mine ? "mvp-message-row is-mine" : "mvp-message-row";

  const bubble = document.createElement("p");
  bubble.className = "mvp-message";
  bubble.textContent = message.text;

  if (mine) {
    item.append(bubble, createAvatarWithStatus(createUserAvatar(), true));
  } else {
    item.append(createAvatarWithStatus(createChatAvatar(snapshot, null), true), bubble);
  }
  return item;
}

function createNameBlock(title: string, subtitle: string): HTMLElement {
  const block = document.createElement("span");
  block.className = "mvp-name-block";

  const name = document.createElement("strong");
  name.textContent = title;

  const detail = document.createElement("span");
  detail.textContent = subtitle;

  block.append(name, detail);
  return block;
}

function createChatAvatar(snapshot: WorldSnapshot, chat: WorldChatSession | null): HTMLElement {
  const avatar = document.createElement("span");
  avatar.className = "mvp-avatar";
  avatar.textContent = chatTitle(snapshot, chat).slice(0, 1);
  return avatar;
}

function createOvoAvatar(): HTMLElement {
  const avatar = document.createElement("span");
  avatar.className = "mvp-avatar";
  avatar.textContent = "o";
  return avatar;
}

function createContactAvatar(contact: WorldContact): HTMLElement {
  const avatar = document.createElement("span");
  avatar.className = "mvp-avatar";
  avatar.textContent = contactDisplayName(contact).slice(0, 1);
  return avatar;
}

function createUserAvatar(): HTMLElement {
  const avatar = document.createElement("span");
  avatar.className = "mvp-avatar";
  avatar.textContent = "你";
  return avatar;
}

function createAvatarWithStatus(avatar: HTMLElement, online: boolean): HTMLElement {
  const wrap = document.createElement("span");
  wrap.className = "mvp-avatar-wrap";
  wrap.append(avatar, createOnlineDot(online));
  return wrap;
}

function createChatListText(title: string, preview: string): HTMLElement {
  const block = document.createElement("span");
  block.className = "mvp-chat-copy";

  const name = document.createElement("strong");
  name.textContent = title;

  const last = document.createElement("span");
  last.textContent = preview;

  block.append(name, last);
  return block;
}

function createRelationshipText(snapshot: WorldSnapshot, contact: WorldContact): HTMLElement {
  const block = document.createElement("span");
  block.className = "mvp-relationship-copy";

  const name = document.createElement("strong");
  name.textContent = contactDisplayName(contact);

  const detail = document.createElement("span");
  detail.textContent = contactRelationshipLine(snapshot, contact);

  block.append(name, detail);
  return block;
}

function createOnlineDot(online: boolean): HTMLElement {
  const dot = document.createElement("span");
  dot.className = online ? "mvp-presence-dot is-online" : "mvp-presence-dot";
  dot.setAttribute("aria-label", online ? "在线" : "离线");
  return dot;
}

function chatsFromSnapshot(snapshot: WorldSnapshot, worldId = snapshot.worldMeta.id): WorldChatSession[] {
  return resolveWorldChats(worldId, snapshot) as WorldChatSession[];
}

function chatById(snapshot: WorldSnapshot, chatId: string | null): WorldChatSession | null {
  return chatId ? snapshot.chatState.chats.get(chatId) ?? null : null;
}

function isOvoChatId(chatId: string | null): boolean {
  return chatId === OVO_CHAT_ID;
}

function chatTitle(snapshot: WorldSnapshot, chat: WorldChatSession | null): string {
  if (isGroupChat(snapshot, chat)) {
    return chat?.title ?? "群聊";
  }
  const assistant = contactForChat(snapshot, chat);
  return assistant ? contactDisplayName(assistant) : chat?.title ?? "聊天";
}

function chatHeaderTitle(snapshot: WorldSnapshot, chat: WorldChatSession | null): string {
  if (!isGroupChat(snapshot, chat)) {
    return chatTitle(snapshot, chat);
  }
  return `${chatTitle(snapshot, chat)}（${groupMemberCount(snapshot, chat)}）`;
}

function chatPreview(chat: WorldChatSession): string {
  return chat.messages.at(-1)?.text ?? "开始聊天";
}

function contactsFromSnapshot(snapshot: WorldSnapshot, worldId = snapshot.worldMeta.id): WorldContact[] {
  return (resolveWorldContacts(worldId, snapshot) as WorldContact[])
    .filter((contact) => contact.kind === "assistant")
    .filter((contact) => !isOvoContact(snapshot, contact));
}

function assistantContacts(snapshot: WorldSnapshot): WorldContact[] {
  return snapshot.contacts.filter((contact) => contact.kind === "assistant");
}

function isOvoContact(snapshot: WorldSnapshot, contact: WorldContact): boolean {
  return contact.actorId === snapshot.worldMeta.assistantActorId;
}

function contactPersona(contact: WorldContact): string {
  return contact.outputMode === "QA" ? "清晰、可靠，适合处理任务。" : "自然、亲近，适合日常聊天。";
}

function contactRelationshipLine(snapshot: WorldSnapshot, contact: WorldContact): string {
  if (snapshot.worldMeta.type === "reality") {
    return `${modeLabel(contact)} · ${modelNameForContact(contact)}`;
  }
  return contact.outputMode === "QA" ? "可靠顾问" : "亲近角色";
}

function modeLabel(contact: WorldContact): string {
  return contact.outputMode === "QA" ? "助手式" : "聊天式";
}

function contactDisplayName(contact: WorldContact): string {
  if (/default ai friend/iu.test(contact.displayName)) {
    return "默认 AI 朋友";
  }
  if (/ovone/iu.test(contact.displayName)) {
    return "ovO";
  }
  return contact.displayName;
}

function modelNameForChat(snapshot: WorldSnapshot): string {
  const contact = contactsFromSnapshot(snapshot)[0] ?? assistantContacts(snapshot)[0] ?? null;
  return contact ? modelNameForContact(contact) : "Dialogue 模型";
}

function modelNameForContact(contact: WorldContact): string {
  return contact.outputMode === "QA" ? "QA 模型" : "Dialogue 模型";
}

function contactForChat(snapshot: WorldSnapshot, chat: WorldChatSession | null): WorldContact | null {
  if (isGroupChat(snapshot, chat)) {
    return null;
  }
  const contacts = contactsFromSnapshot(snapshot);
  if (!chat) {
    return contacts[0] ?? null;
  }
  return contacts.find((contact) => chat.title.includes(contact.displayName) || chat.id.includes(contact.actorId)) ?? contacts[0] ?? null;
}

function contactByActorId(snapshot: WorldSnapshot, actorId: string): WorldContact | null {
  return contactsFromSnapshot(snapshot).find((contact) => contact.actorId === actorId) ?? null;
}

function isGroupChat(snapshot: WorldSnapshot, chat: WorldChatSession | null): boolean {
  return !!chat && snapshot.groups.some((group) => group.id === chat.id);
}

function groupMemberCount(snapshot: WorldSnapshot, chat: WorldChatSession | null): number {
  const group = chat ? snapshot.groups.find((candidate) => candidate.id === chat.id) : null;
  return group ? group.actorIds.length + 1 : 0;
}

function createChatMeta(snapshot: WorldSnapshot, chat: WorldChatSession): HTMLElement {
  const meta = document.createElement("span");
  meta.className = "mvp-chat-meta";

  const time = document.createElement("span");
  time.textContent = chat.messages.length > 0 ? "刚刚" : "";

  const unread = unreadCount(snapshot, chat);
  meta.append(time);
  if (unread > 0) {
    const badge = document.createElement("strong");
    badge.textContent = String(unread);
    meta.append(badge);
  }
  return meta;
}

function unreadCount(snapshot: WorldSnapshot, chat: WorldChatSession): number {
  const last = chat.messages.at(-1);
  return last && last.authorActorId !== snapshot.worldMeta.ownerActorId ? 1 : 0;
}
