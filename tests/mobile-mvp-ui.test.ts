import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

describe("Mobile MVP Product Shell", () => {
  it("mounts the semantic mobile MVP from the browser entry without modifying core modules", () => {
    const main = readFileSync("src/main.ts", "utf8");
    const adapter = readFileSync("src/platform/mobile-mvp-adapter.ts", "utf8");

    assert.match(main, /mountChatShell\(document\.body\)/);
    assert.match(adapter, /createOnboardedProductRuntime/);
    assert.match(adapter, /WorldSnapshot/);
    assert.equal(adapter.includes("../chat-kernel"), false);
    assert.equal(adapter.includes("../ai-adapter"), false);
    assert.equal(adapter.includes("WorldDomain.create"), false);
  });

  it("shows Chinese splash copy before entering chats", () => {
    const adapter = readFileSync("src/platform/mobile-mvp-adapter.ts", "utf8");

    assert.match(adapter, /title\.textContent = "ovOne"/);
    assert.match(adapter, /first\.textContent = "一个 AI。"/);
    assert.match(adapter, /second\.textContent = "一个入口。"/);
    assert.match(adapter, /state\.activeView = "CHAT_LIST"/);
  });

  it("uses fixed Chinese chat-app navigation with chats as default primary surface", () => {
    const adapter = readFileSync("src/platform/mobile-mvp-adapter.ts", "utf8");
    const html = readFileSync("index.html", "utf8");

    assert.match(adapter, /activeView: "CHAT_LIST"/);
    assert.match(adapter, /label: "聊天"/);
    assert.match(adapter, /label: "联系人"/);
    assert.match(adapter, /label: "我的"/);
    assert.match(adapter, /aria-label", "主导航"/);
    assert.match(html, /\.mvp-bottom-nav \{[\s\S]*position: fixed;/);
    assert.equal(adapter.includes("dashboard"), false);
    assert.equal(adapter.includes("createScreenNav"), false);
  });

  it("starts from the chat list instead of opening a chat page", () => {
    const adapter = readFileSync("src/platform/mobile-mvp-adapter.ts", "utf8");

    assert.match(adapter, /state\.splashVisible = false;[\s\S]*state\.activeView = "CHAT_LIST";[\s\S]*state\.activeChatId = null;/);
    assert.match(adapter, /const viewState = ViewRouter\.resolve\(state\.activeView\)/);
    assert.match(adapter, /state\.activeView = "CHAT_VIEW"/);
  });

  it("routes every page through the unified UI shell layout", () => {
    const adapter = readFileSync("src/platform/mobile-mvp-adapter.ts", "utf8");
    const registry = readFileSync("src/platform/behavior-registry.ts", "utf8");
    const html = readFileSync("index.html", "utf8");

    assert.match(registry, /export type ViewState = "CHAT_LIST" \| "CHAT_VIEW" \| "CONTACTS" \| "CONTACT_DETAIL" \| "ME"/);
    assert.match(adapter, /const ViewRouter = Object\.freeze\(\{[\s\S]*resolve: createBehaviorRegistry\(\)\.resolveView,[\s\S]*currentOverlay: createBehaviorRegistry\(\)\.currentOverlay[\s\S]*\}\)/);
    assert.match(adapter, /const viewState = ViewRouter\.resolve\(state\.activeView\)/);
    assert.match(adapter, /function commitStateTransition\(state: SemanticMobileState, render: \(\) => void\): void/);
    assert.match(adapter, /commitStateTransition\(state, render\)/);
    assert.match(adapter, /const controller = createInteractionController\(shell, state, render\)/);
    assert.match(adapter, /function createChatShell\(/);
    assert.match(adapter, /const snapshot = state\.view\.product\.snapshot/);
    assert.match(adapter, /viewport\.append\(createShellPageFrame\(viewState, renderShellPage\(viewState, snapshot, state, controller\)\)\)/);
    assert.match(adapter, /function renderShellPage\(/);
    assert.match(adapter, /function renderShellPage\(\s*viewState: ViewState,\s*snapshot: WorldSnapshot,\s*state: SemanticMobileState,\s*controller: InteractionController\s*\)/);
    assert.match(adapter, /return createChatList\(snapshot, controller\)/);
    assert.match(adapter, /return createChatView\(snapshot, state\.activeChatId, controller\)/);
    assert.match(adapter, /return createContactsView\(snapshot, controller\)/);
    assert.match(adapter, /return createContactDetailView\(snapshot, state\.selectedContactActorId, controller\)/);
    assert.match(adapter, /return createMeView\(snapshot, state\.settingsOpen, controller\)/);
    assert.match(adapter, /function createShellPageFrame\(viewState: ViewState, page: HTMLElement\)/);
    assert.match(adapter, /frame\.className = `mvp-page mvp-page-\$\{viewState\.toLowerCase\(\)\.replaceAll\("_", "-"\)\}`/);
    assert.doesNotMatch(adapter, /viewport\.append\(state\.activeChatId/);
    assert.doesNotMatch(adapter, /viewport\.append\(createContactsView/);
    assert.doesNotMatch(adapter, /viewport\.append\(createMeView/);
    assert.match(html, /\.mvp-page \{/);
    assert.match(html, /\.mvp-page > \.mvp-screen \{/);
  });

  it("renders the chat list as product rows with centered ovO and clickable add menu", () => {
    const adapter = readFileSync("src/platform/mobile-mvp-adapter.ts", "utf8");
    const registry = readFileSync("src/platform/behavior-registry.ts", "utf8");
    const html = readFileSync("index.html", "utf8");

    assert.match(adapter, /screen\.append\(createHomeHeader\(controller\)\)/);
    assert.match(adapter, /function createHomeHeader\(controller: InteractionController\)/);
    assert.match(adapter, /bindControllerAction\(brand, controller, \{ type: "OPEN_OVO_CONTROL" \}\)/);
    assert.match(adapter, /bindControllerAction\(add, controller, \{ type: "OPEN_ADD_MENU" \}\)/);
    assert.match(adapter, /function createAddMenu/);
    assert.match(adapter, /createMenuButton\("创建世界", controller, \{ type: "CREATE_WORLD" \}\)/);
    assert.match(adapter, /function createOverlayLayer/);
    assert.match(adapter, /createAvatarWithStatus\(createChatAvatar\(snapshot, chat\), true\)/);
    assert.match(adapter, /createChatListText\(chatTitle\(snapshot, chat\), chatPreview\(chat\)\)/);
    assert.match(registry, /openOverlay\(state, "ovo-control"\)/);
    assert.match(adapter, /function createOvoControlPanel\(controller: InteractionController\)/);
    assert.equal(adapter.includes("mvp-connection-status"), false);
    assert.equal(html.includes(".mvp-connection-status"), false);
    assert.match(html, /\.mvp-home-header \{[\s\S]*grid-template-columns: 42px minmax\(0, 1fr\) 42px;/);
    assert.match(html, /\.mvp-home-brand \{[\s\S]*justify-self: center;/);
  });

  it("renders chat pages with back, name, menu, scroll messages, fixed input, and message avatars", () => {
    const adapter = readFileSync("src/platform/mobile-mvp-adapter.ts", "utf8");
    const html = readFileSync("index.html", "utf8");

    assert.match(adapter, /header\.className = "mvp-chat-page-header"/);
    assert.match(adapter, /menu\.className = "mvp-chat-menu-button"/);
    assert.match(adapter, /bindControllerAction\(menu, controller, \{ type: "OPEN_CHAT_MENU" \}\)/);
    assert.match(adapter, /function createChatMenu/);
    assert.match(adapter, /const CHAT_PANEL_ACTIONS = Object\.freeze/);
    assert.match(adapter, /type: "CHAT_OPEN_GROUP_MEMBERS"/);
    assert.match(adapter, /type: "CHAT_OPEN_SETTINGS"/);
    assert.match(adapter, /type: "CHAT_OPEN_BACKGROUND_SETTINGS"/);
    assert.match(adapter, /item\.className = mine \? "mvp-message-row is-mine" : "mvp-message-row"/);
    assert.match(adapter, /createAvatarWithStatus\(createUserAvatar\(\), true\)/);
    assert.match(adapter, /createAvatarWithStatus\(createChatAvatar\(snapshot, chat\), true\)/);
    assert.match(html, /\.mvp-message-stream \{[\s\S]*grid-auto-flow: row;[\s\S]*overflow-y: auto;[\s\S]*overscroll-behavior: contain;/);
    assert.match(html, /\.mvp-composer \{[\s\S]*position: fixed;[\s\S]*bottom: 64px;/);
    assert.match(html, /\.mvp-avatar-wrap \.mvp-presence-dot \{[\s\S]*position: absolute;/);
    assert.equal(html.includes("column-reverse"), false);
    assert.equal(html.includes("row-reverse"), false);
  });

  it("keeps expandable chat input tools in the floating overlay layer", () => {
    const adapter = readFileSync("src/platform/mobile-mvp-adapter.ts", "utf8");
    const registry = readFileSync("src/platform/behavior-registry.ts", "utf8");
    const html = readFileSync("index.html", "utf8");

    assert.match(registry, /export type MobileOverlay = "add-menu" \| "chat-menu" \| "ovo-control" \| "emoji-picker" \| "file-picker" \| null/);
    assert.match(adapter, /app\.append\(viewport, createOverlayLayer\(ViewRouter\.currentOverlay\(state\), controller\), createBottomNav\(state, controller\)\)/);
    assert.match(adapter, /function createOverlayContent\(\s*overlayState: MobileOverlay,\s*controller: InteractionController\s*\)/);
    assert.match(adapter, /bindControllerAction\(emoji, controller, \{ type: "OPEN_EMOJI_PICKER" \}\)/);
    assert.match(adapter, /bindControllerAction\(action, controller, \{ type: "OPEN_FILE_PICKER" \}\)/);
    assert.match(adapter, /function createContactDetailView\(\s*snapshot: WorldSnapshot,\s*actorId: string \| null,\s*controller: InteractionController\s*\)/);
    assert.doesNotMatch(adapter, /screen\.append\(createAddMenu\(\)\)/);
    assert.doesNotMatch(adapter, /screen\.append\(createChatMenu\(\)\)/);
    assert.match(html, /\.mvp-overlay-layer \{[\s\S]*position: fixed;[\s\S]*pointer-events: none;/);
    assert.match(html, /\.mvp-overlay-panel \{[\s\S]*pointer-events: auto;/);
    assert.match(html, /\.mvp-composer \{[\s\S]*position: fixed;[\s\S]*bottom: 64px;/);
    assert.equal(html.includes(".mvp-world-panel"), false);
  });

  it("enforces the rebased UI skeleton contract", () => {
    const adapter = readFileSync("src/platform/mobile-mvp-adapter.ts", "utf8");
    const html = readFileSync("index.html", "utf8");

    assert.match(adapter, /screen\.append\(header, messages, createComposer\(snapshot, controller\)\)/);
    assert.match(adapter, /function createContactsView\(snapshot: WorldSnapshot, controller: InteractionController\): HTMLElement/);
    assert.match(adapter, /screen\.append\(list\)/);
    assert.match(adapter, /screen\.append\(createProfileHeader\(\), createFeatureMenu\(snapshot, controller\)\)/);
    assert.match(adapter, /function createContactDetailView\(\s*snapshot: WorldSnapshot,\s*actorId: string \| null,\s*controller: InteractionController\s*\): HTMLElement/);
    assert.equal(adapter.includes("createDetailForm"), false);
    assert.equal(adapter.includes("mvp-contact-detail-overlay"), false);
    assert.equal(html.includes(".mvp-contact-detail-overlay"), false);
    assert.equal(html.includes(".mvp-detail-form"), false);
    assert.match(html, /\.mvp-composer \{[\s\S]*position: fixed;/);
  });

  it("keeps context switching hidden while using internal context data only", () => {
    const adapter = readFileSync("src/platform/mobile-mvp-adapter.ts", "utf8");

    assert.match(adapter, /function enterRealityContext/);
    assert.match(adapter, /world\.type === "reality"/);
    assert.match(adapter, /shell\.switchWorld\(reality\.worldId\)/);
    assert.match(adapter, /function contactsFromSnapshot/);
    assert.doesNotMatch(adapter, /textContent = "Worlds"/);
    assert.equal(adapter.includes("switch world"), false);
    assert.equal(adapter.includes("world management"), false);
  });

  it("generates Chats from WorldSnapshot.chatState instead of static template entries", () => {
    const adapter = readFileSync("src/platform/mobile-mvp-adapter.ts", "utf8");

    assert.match(adapter, /function chatsFromSnapshot\(snapshot: WorldSnapshot\)/);
    assert.match(adapter, /Array\.from\(snapshot\.chatState\.chats\.values\(\)\)/);
    assert.match(adapter, /for \(const chat of chatsFromSnapshot\(snapshot\)\)/);
    assert.equal(adapter.includes("contactIds: ["), false);
    assert.equal(adapter.includes("conversations:"), false);
    assert.equal(adapter.includes("messages: ["), false);
  });

  it("renders ovO as a system entry indicator instead of a normal chat item", () => {
    const adapter = readFileSync("src/platform/mobile-mvp-adapter.ts", "utf8");

    assert.match(adapter, /function createOvoIndicator\(snapshot: WorldSnapshot\)/);
    assert.match(adapter, /label\.textContent = "ovO"/);
    assert.match(adapter, /function createHomeHeader/);
    assert.match(adapter, /title\.textContent = "ovO"/);
    assert.match(adapter, /dot\.setAttribute\("aria-label", "有新动态"\)/);
    assert.match(adapter, /aria-label", online \? "在线" : "离线"/);
    assert.match(adapter, /contact\.actorId === snapshot\.worldMeta\.assistantActorId/);
    assert.doesNotMatch(adapter, /assistantContacts\(state\.view\.product\.snapshot\)\.length/);
    assert.equal(adapter.includes("model identity"), false);
    assert.equal(adapter.includes("provider"), false);
  });

  it("keeps ovO as an inline system controller without chat or world UI", () => {
    const adapter = readFileSync("src/platform/mobile-mvp-adapter.ts", "utf8");
    const registry = readFileSync("src/platform/behavior-registry.ts", "utf8");
    const html = readFileSync("index.html", "utf8");

    assert.match(registry, /export type InteractionAction =/);
    assert.match(adapter, /type InteractionController = Readonly/);
    assert.match(adapter, /function createInteractionController\(/);
    assert.match(adapter, /bindControllerAction\(brand, controller, \{ type: "OPEN_OVO_CONTROL" \}\)/);
    assert.match(adapter, /controller\.dispatch\(\{ type: "SUBMIT_MESSAGE", text: input\.value \}\)/);
    assert.equal(adapter.includes("MobileInputMode"), false);
    assert.equal(adapter.includes("createWorldComposer"), false);
    assert.equal(adapter.includes("createWorldPanel"), false);
    assert.equal(adapter.includes("world-panel"), false);
    assert.equal(adapter.includes("createWorldPanel"), false);
    assert.equal(adapter.includes("function isOvoChat"), false);
    assert.equal(adapter.includes("system page"), false);
    assert.equal(html.includes(".mvp-composer.is-world-mode"), false);
  });

  it("locks the final UI to Chats, Contacts, and Me only", () => {
    const adapter = readFileSync("src/platform/mobile-mvp-adapter.ts", "utf8");
    const registry = readFileSync("src/platform/behavior-registry.ts", "utf8");
    const html = readFileSync("index.html", "utf8");

    assert.match(registry, /export type ViewState = "CHAT_LIST" \| "CHAT_VIEW" \| "CONTACTS" \| "CONTACT_DETAIL" \| "ME"/);
    assert.match(adapter, /\{ tab: "chats", label: "聊天" \}/);
    assert.match(adapter, /\{ tab: "contacts", label: "联系人" \}/);
    assert.match(adapter, /\{ tab: "me", label: "我的" \}/);
    assert.doesNotMatch(registry, /type ViewState = .*"WORLD"/);
    assert.doesNotMatch(adapter, /return "world"/);
    assert.equal(adapter.includes("world-panel"), false);
    assert.equal(adapter.includes("mvp-world"), false);
    assert.equal(html.includes(".mvp-world"), false);
  });

  it("routes all user interactions through InteractionController", () => {
    const adapter = readFileSync("src/platform/mobile-mvp-adapter.ts", "utf8");
    const registry = readFileSync("src/platform/behavior-registry.ts", "utf8");

    assert.match(adapter, /function bindControllerAction\(/);
    assert.match(adapter, /function bindComposerSubmit\(/);
    assert.match(adapter, /bindControllerAction\(button, controller, actionForTab\(item\.tab\)\)/);
    assert.match(adapter, /bindControllerAction\(button, controller, \{ type: "OPEN_CHAT", chatId: chat\.id \}\)/);
    assert.match(adapter, /bindControllerAction\(back, controller, \{ type: "NAV_BACK" \}\)/);
    assert.match(adapter, /bindControllerAction\(brand, controller, \{ type: "OPEN_OVO_CONTROL" \}\)/);
    assert.match(adapter, /bindControllerAction\(button, controller, \{ type: "OPEN_CONTACT", actorId: contact\.actorId \}\)/);
    assert.match(registry, /state\.selectedContactActorId = action\.actorId/);
    assert.match(adapter, /bindControllerAction\(button, controller, \{ type: "OPEN_SETTINGS" \}\)/);
    assert.match(adapter, /bindControllerAction\(back, controller, \{ type: "CLOSE_SETTINGS" \}\)/);
    assert.match(adapter, /bindComposerSubmit\(form, input, controller\)/);
    assert.match(adapter, /bindTextInput\(input, controller\)/);
    assert.match(adapter, /const result = registry\.execute\(action, state\)/);
    assert.match(adapter, /createMenuButton\("添加 AI 好友", controller, \{ type: "CREATE_AI_FRIEND" \}\)/);
    assert.match(adapter, /createMenuButton\("创建群聊", controller, \{ type: "CREATE_GROUP" \}\)/);
    assert.match(adapter, /createMenuButton\("创建世界", controller, \{ type: "CREATE_WORLD" \}\)/);
    assert.equal(adapter.includes("MENU_ACTION"), false);
    assert.equal((adapter.match(/addEventListener\("click"/g) ?? []).length, 1);
    assert.equal((adapter.match(/addEventListener\("submit"/g) ?? []).length, 1);
    assert.equal((adapter.match(/addEventListener\("input"/g) ?? []).length, 1);
    assert.doesNotMatch(adapter, /addEventListener\("click", \(\) => \{\s*state\./);
    assert.doesNotMatch(adapter, /addEventListener\("click", \(\) => \{\s*shell\./);
  });

  it("derives Contacts from world-scoped snapshot contacts", () => {
    const adapter = readFileSync("src/platform/mobile-mvp-adapter.ts", "utf8");

    assert.match(adapter, /for \(const contact of contactsFromSnapshot\(snapshot\)\)/);
    assert.match(adapter, /snapshot\.contacts\.filter\(\(contact\) => contact\.kind === "assistant"\)/);
    assert.match(adapter, /filter\(\(contact\) => !isOvoContact\(snapshot, contact\)\)/);
    assert.equal(adapter.includes("const contacts:"), false);
    assert.equal(adapter.includes("nickname: \"Nara\""), false);
  });

  it("keeps Contacts as a Chinese list-only view and Me as settings boundary", () => {
    const adapter = readFileSync("src/platform/mobile-mvp-adapter.ts", "utf8");

    assert.match(adapter, /screen\.append\(createScreenHeader\("联系人"/);
    assert.match(adapter, /button\.className = "mvp-contact-row"/);
    assert.match(adapter, /button\.append\(createContactAvatar\(contact\), createRelationshipText\(snapshot, contact\)\)/);
    assert.match(adapter, /function contactRelationshipLine\(snapshot: WorldSnapshot, contact: WorldContact\): string/);
    assert.match(adapter, /return `\$\{modeLabel\(contact\)\} · \$\{modelNameForContact\(contact\)\}`/);
    assert.match(adapter, /return contact\.outputMode === "QA" \? "可靠顾问" : "亲近角色"/);
    assert.equal(adapter.includes("createTextInput"), false);
    assert.equal(adapter.includes("createSelect"), false);
    assert.equal(adapter.includes("mvp-detail-form"), false);
    assert.match(adapter, /已连接 AI/);
    assert.match(adapter, /断开连接/);
    assert.match(adapter, /在这里断开 AI，会从账号中移除该连接。/);
    assert.match(adapter, /语言设置/);
    assert.match(adapter, /简体中文/);
  });

  it("renders Me as a global account control layer", () => {
    const adapter = readFileSync("src/platform/mobile-mvp-adapter.ts", "utf8");

    assert.match(adapter, /function createProfileHeader/);
    assert.match(adapter, /aria-label", "编辑头像"/);
    assert.match(adapter, /用户 ID：one-0001/);
    assert.match(adapter, /ovO 账号：已绑定/);
    assert.match(adapter, /aria-label", "编辑账号绑定"/);
    assert.match(adapter, /function createFeatureMenu/);
    assert.match(adapter, /createFeatureRow\("收藏"/);
    assert.match(adapter, /createFeatureRow\("胶囊", "即将开放"\)/);
    assert.match(adapter, /createFeatureRow\("聊天容量", "最多 25 个聊天"\)/);
    assert.match(adapter, /createFeatureRow\("会员", "未开通"\)/);
    assert.match(adapter, /detail\.textContent = "账号与语言"/);
    assert.equal(adapter.includes("worldDomain."), false);
    assert.equal(adapter.includes("applyStructuralPatch"), false);
    assert.equal(adapter.includes("applyPersonaOverlay"), false);
  });

  it("does not expose generic English chat-template labels", () => {
    const adapter = readFileSync("src/platform/mobile-mvp-adapter.ts", "utf8");

    for (const label of [
      "Chats",
      "Contacts",
      "Online",
      "Offline",
      "Actions",
      "Message",
      "Send",
      "Connected AI",
      "Disconnect",
      "Profile",
      "Favorites",
      "Settings",
      "Clear memory here"
    ]) {
      assert.equal(adapter.includes(`"${label}"`), false);
    }
  });

  it("does not expose world or system concepts as user-facing product copy", () => {
    const adapter = readFileSync("src/platform/mobile-mvp-adapter.ts", "utf8");

    for (const text of [
      "一个世界。",
      "世界动作",
      "当前世界记忆",
      "所有世界",
      "世界容量",
      "占位系统"
    ]) {
      assert.equal(adapter.includes(`"${text}"`), false);
    }
    assert.equal(adapter.includes("mvp-world-status"), false);
  });
});
