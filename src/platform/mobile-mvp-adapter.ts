import { createOnboardedProductRuntime } from "../onboarding/index.js";
import { createBrowserWorldStorage } from "../persistence/index.js";
import {
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
  ViewRouteResolution
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
    composerMode: resolveDefaultComposerMode("normal"),
    inputDraft: "",
    settingsOpen: false,
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

  app.append(viewport, createOverlayLayer(ViewRouter.currentOverlay(state), state, controller), createBottomNav(state, controller));
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
      return createContactDetailView(snapshot, state.selectedContactActorId, controller);
    case "ME":
      return createMeView(snapshot, state.settingsOpen, controller);
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
  const title = isOvoChat ? "ovO" : chat ? chatTitle(snapshot, chat) : "聊天";

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
  bindControllerAction(menu, controller, { type: "OPEN_CHAT_MENU" });

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
    modeButton.disabled = true;
    modeButton.textContent = composerMode === "world-button" ? `📍 ${snapshot.worldMeta.title}` : "按住说话";
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
  settingsOpen: boolean,
  controller: InteractionController
): HTMLElement {
  const screen = document.createElement("section");
  screen.className = "mvp-screen";
  screen.append(createScreenHeader("我的", null));

  if (settingsOpen) {
    screen.append(createSettingsView(snapshot, controller));
    return screen;
  }

  screen.append(createProfileHeader(), createFeatureMenu(snapshot, controller));
  return screen;
}

function createSettingsView(snapshot: WorldSnapshot, controller: InteractionController): HTMLElement {
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
  for (const contact of assistantContacts(snapshot)) {
    const item = document.createElement("li");
    const name = document.createElement("span");
    name.textContent = isOvoContact(snapshot, contact) ? "ovO" : contactDisplayName(contact);
    const disconnect = document.createElement("button");
    disconnect.type = "button";
    disconnect.textContent = "断开连接";
    disconnect.disabled = isOvoContact(snapshot, contact);
    bindControllerAction(disconnect, controller, { type: "SETTINGS_DISCONNECT_AI" });
    item.append(name, disconnect);
    list.append(item);
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
    return createOvoControlPanel(state, controller);
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
    createMenuButton("创建群聊", controller, { type: "CREATE_GROUP" }),
    createMenuButton("创建世界", controller, { type: "CREATE_WORLD" })
  );
  return menu;
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

function createOvoControlPanel(state: SemanticMobileState, controller: InteractionController): HTMLElement {
  const menu = document.createElement("section");
  menu.className = "mvp-overlay-panel mvp-ovo-control";

  const worldList = document.createElement("section");
  worldList.className = "mvp-ovo-world-list";
  for (const world of state.view.availableWorlds) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = world.worldId === state.currentWorldId ? "mvp-ovo-world-row is-current" : "mvp-ovo-world-row";
    item.textContent = world.worldId === state.currentWorldId ? `${world.title} · 当前` : world.title;
    if (world.worldId === state.currentWorldId) {
      item.setAttribute("aria-current", "true");
    }
    bindControllerAction(item, controller, { type: "SWITCH_WORLD", worldId: world.worldId });
    worldList.append(item);
  }

  menu.append(
    worldList,
    createMenuButton("新建聊天", controller, { type: "OPEN_ADD_MENU" }),
    createMenuButton("查看联系人", controller, { type: "NAV_OPEN_CONTACTS" }),
    createMenuButton("我的设置", controller, { type: "NAV_OPEN_ME" })
  );
  return menu;
}

function createContactDetailView(
  snapshot: WorldSnapshot,
  actorId: string | null,
  controller: InteractionController
): HTMLElement {
  const contact = contactsFromSnapshot(snapshot).find((item) => item.actorId === actorId) ?? null;
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

  screen.append(back, title, detail);
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
  const assistant = contactForChat(snapshot, chat);
  return assistant ? contactDisplayName(assistant) : chat?.title ?? "聊天";
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
  const contacts = contactsFromSnapshot(snapshot);
  if (!chat) {
    return contacts[0] ?? null;
  }
  return contacts.find((contact) => chat.title.includes(contact.displayName) || chat.id.includes(contact.actorId)) ?? contacts[0] ?? null;
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
