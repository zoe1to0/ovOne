import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolveView } from "../src/platform/behavior-registry.js";

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

  it("shows a skippable prototype image splash before entering chats", () => {
    const adapter = readFileSync("src/platform/mobile-mvp-adapter.ts", "utf8");
    const html = readFileSync("index.html", "utf8");
    const splashBody = adapter.match(/function createSplash[\s\S]*?function createChatShell/)?.[0] ?? "";

    assert.match(adapter, /const SPLASH_DWELL_MS = 1800/);
    assert.match(adapter, /shell\.className = "mvp-shell mvp-splash-shell"/);
    assert.match(adapter, /viewport\.className = "mvp-splash-viewport"/);
    assert.match(adapter, /document\.createElement\("img"\)/);
    assert.match(adapter, /artwork\.className = "mvp-splash-artwork"/);
    assert.match(adapter, /artwork\.src = "public\/assets\/splash\/ovone-splash-artwork\.svg"/);
    assert.match(adapter, /viewport\.append\(artwork\)/);
    assert.match(adapter, /shell\.append\(viewport\)/);
    assert.match(adapter, /screen\.addEventListener\("click", onSkip\)/);
    assert.match(adapter, /window\.setTimeout\(finishSplash, SPLASH_DWELL_MS\)/);
    assert.match(adapter, /state\.activeView = "CHAT_LIST"/);
    assert.doesNotMatch(splashBody, /ovOne/);
    assert.doesNotMatch(splashBody, /createElementNS|SVGSVGElement|mvp-splash-mark-svg|mvp-splash-svg-tagline|mvp-splash-crayon/);
    assert.doesNotMatch(html, /\.mvp-splash-poster \{/);
    assert.doesNotMatch(html, /\.mvp-splash-mark-svg \{/);
    assert.doesNotMatch(html, /\.mvp-splash-svg-tagline \{/);
    assert.doesNotMatch(html, /\.mvp-splash h1 \{/);
    assert.match(html, /\.mvp-splash \{[\s\S]*background: #fbfaf3;/);
    assert.match(html, /\.mvp-shell \{[\s\S]*max-width: 430px;/);
    assert.match(html, /\.mvp-splash-shell \{[\s\S]*width: 100%;[\s\S]*max-width: none;[\s\S]*border: 0;[\s\S]*box-shadow: none;/);
    assert.match(html, /\.mvp-splash-viewport \{[\s\S]*place-items: center;[\s\S]*padding: 0;[\s\S]*background: #fbfaf3;/);
    assert.match(html, /\.mvp-splash-artwork \{[\s\S]*width: min\(62%, 264px\);[\s\S]*height: auto;[\s\S]*max-height: 72vh;[\s\S]*object-fit: contain;[\s\S]*object-position: center 44%;/);
    assert.match(html, /\.mvp-splash \{[\s\S]*overflow: hidden;/);
    assert.match(html, /\.mvp-splash-viewport \{[\s\S]*overflow: hidden;/);
    assert.doesNotMatch(html, /\.mvp-splash-brush \{/);
    assert.doesNotMatch(html, /clip-path: polygon/);
    assert.equal(existsSync("public/assets/splash/ovone-splash-artwork.svg"), true);
  });

  it("shows Splash before the local Trial Entry screen", () => {
    const adapter = readFileSync("src/platform/mobile-mvp-adapter.ts", "utf8");
    const html = readFileSync("index.html", "utf8");

    assert.match(adapter, /loadLocalTrialSession\(sessionStorage\)/);
    assert.match(adapter, /const renderTrialEntryAfterSplash = \(\): void => \{/);
    assert.match(adapter, /mountRoot\.replaceChildren\(createSplash\(finishSplash\)\)/);
    assert.match(adapter, /renderTrialEntryAfterSplash\(\)/);
    assert.match(adapter, /createTrialEntryScreen/);
    assert.match(adapter, /enterMainApp\(false, false\)/);
    assert.match(adapter, /start\.textContent = "开始试用 ovOne"/);
    assert.match(adapter, /createLocalTrialSession\(sessionStorage\)/);
    assert.match(adapter, /createBrowserWorldStorage\(sessionStorage\)/);
    assert.match(adapter, /touchLocalTrialSession\(sessionStorage\)/);
    assert.match(adapter, /brand\.textContent = "ovOne"/);
    assert.match(adapter, /title\.textContent = "开始试用 ovOne"/);
    assert.match(adapter, /copy\.textContent = "这是本地试用体验。你的世界、聊天和记忆会保存在当前设备上。"/);
    assert.match(html, /\.mvp-trial-entry \{/);
    assert.match(html, /\.mvp-trial-entry-card \{/);
    assert.match(html, /\.mvp-trial-entry-brand \{/);
    assert.match(html, /\.mvp-trial-entry-button \{/);
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
    assert.match(adapter, /const routeState = ViewRouter\.resolve\(state\.activeView\)/);
    assert.match(adapter, /const flowResult = flowExecutor\.run\(action, \{ shell, state \}\)/);
  });

  it("routes every page through the unified UI shell layout", () => {
    const adapter = readFileSync("src/platform/mobile-mvp-adapter.ts", "utf8");
    const registry = readFileSync("src/platform/behavior-registry.ts", "utf8");
    const html = readFileSync("index.html", "utf8");
    const contract = readFileSync("src/domain/world-editor-contract.ts", "utf8");

    assert.match(registry, /export type ViewState =[\s\S]*\| "CHAT_LIST"[\s\S]*\| "CHAT_VIEW"[\s\S]*\| "CONTACTS"[\s\S]*\| "CONTACT_DETAIL"[\s\S]*\| "ME"[\s\S]*\| "CREATE_GROUP_DRAFT"[\s\S]*\| "CREATE_WORLD_DRAFT"[\s\S]*\| "CREATE_WORLD_DETAIL_EDIT"[\s\S]*\| "WORLD_EDITOR"/);
    assert.match(adapter, /const ViewRouter = Object\.freeze\(\{[\s\S]*resolve: createBehaviorRegistry\(\)\.resolveView,[\s\S]*currentOverlay: createBehaviorRegistry\(\)\.currentOverlay[\s\S]*\}\)/);
    assert.match(adapter, /const routeState = ViewRouter\.resolve\(state\.activeView\)/);
    assert.match(adapter, /function commitStateTransition\(state: SemanticMobileState, render: \(\) => void\): void/);
    assert.match(adapter, /commitStateTransition\(state, render\)/);
    assert.match(adapter, /const controller = createInteractionController\(shell, state, render\)/);
    assert.match(adapter, /function createChatShell\(/);
    assert.match(adapter, /const snapshot = state\.view\.product\.snapshot/);
    assert.match(adapter, /viewport\.append\(createShellPageFrame\(routeState, renderShellPage\(routeState, snapshot, state, controller\)\)\)/);
    assert.match(adapter, /function renderShellPage\(/);
    assert.match(adapter, /function renderShellPage\(\s*routeState: ViewRouteResolution,\s*snapshot: WorldSnapshot,\s*state: SemanticMobileState,\s*controller: InteractionController\s*\)/);
    assert.match(registry, /export type ViewRouteResolution = Readonly<\{/);
    assert.match(registry, /readonly route: ViewState;/);
    assert.match(registry, /readonly fallbackApplied: boolean;/);
    assert.match(registry, /readonly issue\?: string;/);
    assert.match(adapter, /return createChatList\(snapshot, state, controller\)/);
    assert.match(adapter, /return createChatView\(snapshot, state, controller\)/);
    assert.match(adapter, /return createContactsView\(snapshot, state, controller\)/);
    assert.match(adapter, /return createContactDetailView\(snapshot, state, controller\)/);
    assert.match(adapter, /return createMeView\(snapshot, state, controller\)/);
    assert.match(adapter, /return createCreateWorldDraftView\(snapshot, state, controller\)/);
    assert.match(adapter, /return createCreateWorldDetailEditView\(snapshot, state, controller\)/);
    assert.match(adapter, /function createShellPageFrame\(routeState: ViewRouteResolution, page: HTMLElement\)/);
    assert.match(adapter, /frame\.className = `mvp-page mvp-page-\$\{routeState\.route\.toLowerCase\(\)\.replaceAll\("_", "-"\)\}`/);
    assert.doesNotMatch(adapter, /viewport\.append\(state\.activeChatId/);
    assert.doesNotMatch(adapter, /viewport\.append\(createContactsView/);
    assert.doesNotMatch(adapter, /viewport\.append\(createMeView/);
    assert.match(html, /\.mvp-page \{/);
    assert.match(html, /\.mvp-page > \.mvp-screen \{/);
  });

  it("resolves unknown activeView to Chat list inside ViewRouter only", () => {
    const adapter = readFileSync("src/platform/mobile-mvp-adapter.ts", "utf8");
    const registry = readFileSync("src/platform/behavior-registry.ts", "utf8");

    assert.deepEqual(resolveView("CHAT_LIST"), { route: "CHAT_LIST", fallbackApplied: false });
    assert.deepEqual(resolveView("CHAT_VIEW"), { route: "CHAT_VIEW", fallbackApplied: false });
    assert.deepEqual(resolveView("CONTACTS"), { route: "CONTACTS", fallbackApplied: false });
    assert.deepEqual(resolveView("CONTACT_DETAIL"), { route: "CONTACT_DETAIL", fallbackApplied: false });
    assert.deepEqual(resolveView("ME"), { route: "ME", fallbackApplied: false });
    assert.deepEqual(resolveView("CREATE_GROUP_DRAFT"), { route: "CREATE_GROUP_DRAFT", fallbackApplied: false });
    assert.deepEqual(resolveView("CREATE_WORLD_DRAFT"), { route: "CREATE_WORLD_DRAFT", fallbackApplied: false });
    assert.deepEqual(resolveView("CREATE_WORLD_DETAIL_EDIT"), { route: "CREATE_WORLD_DETAIL_EDIT", fallbackApplied: false });
    assert.deepEqual(resolveView("WORLD_EDITOR"), { route: "WORLD_EDITOR", fallbackApplied: false });
    assert.deepEqual(resolveView("UNKNOWN_VIEW"), {
      route: "CHAT_LIST",
      fallbackApplied: true,
      issue: "Unknown activeView 'UNKNOWN_VIEW' resolved to CHAT_LIST."
    });
    assert.match(registry, /route: "CHAT_LIST",[\s\S]*fallbackApplied: true/);
    assert.doesNotMatch(adapter, /return createMeView\(snapshot, state\.settingsOpen, controller\);\s*}\s*return createChatList/);
  });

  it("renders the chat list as product rows with centered ovO and clickable add menu", () => {
    const adapter = readFileSync("src/platform/mobile-mvp-adapter.ts", "utf8");
    const registry = readFileSync("src/platform/behavior-registry.ts", "utf8");
    const html = readFileSync("index.html", "utf8");

    assert.match(adapter, /screen\.append\(createHomeHeader\(state\.view\.availableWorlds\.length, controller\)\)/);
    assert.match(adapter, /function createHomeHeader\(worldLinkedCount: number, controller: InteractionController\)/);
    assert.match(adapter, /world\.textContent = `\$\{worldLinkedCount\} World Linked`/);
    assert.match(adapter, /mark\.className = "mvp-home-wordmark"/);
    assert.match(adapter, /bindControllerAction\(brand, controller, \{ type: "OPEN_OVO_CHAT" \}\)/);
    assert.match(adapter, /bindControllerAction\(add, controller, \{ type: "OPEN_ADD_MENU" \}\)/);
    assert.match(adapter, /function createAddMenu/);
    assert.match(adapter, /createMenuButton\("创建世界", controller, \{ type: "OPEN_CREATE_WORLD_DRAFT" \}\)/);
    assert.match(adapter, /function createOverlayLayer/);
    assert.match(adapter, /createAvatarWithStatus\(createChatAvatar\(snapshot, chat\), true\)/);
    assert.match(adapter, /createChatListText\(chatTitle\(snapshot, chat\), chatPreview\(chat\), chatKindLabel\(snapshot, chat\)\)/);
    assert.match(adapter, /last\.textContent = `\$\{label\} · \$\{preview\}`/);
    assert.doesNotMatch(adapter, /badge\.className = "mvp-chat-kind"/);
    assert.doesNotMatch(adapter, /createChatListText\(chatHeaderTitle\(snapshot, chat\), chatPreview\(chat\)\)/);
    assert.match(adapter, /empty\.textContent = "暂无聊天。点击右上角 \+ 创建群聊，或在联系人里打开私聊。"/);
    assert.match(registry, /openOverlay\(state, "ovo-world-menu"\)/);
    assert.match(adapter, /function createOvoWorldMenu\(controller: InteractionController\)/);
    assert.equal(adapter.includes("mvp-connection-status"), false);
    assert.equal(html.includes(".mvp-connection-status"), false);
    assert.match(html, /body \{[\s\S]*background: #dceef8;/);
    assert.match(html, /\.mvp-shell \{[\s\S]*max-width: 430px;[\s\S]*box-shadow:/);
    assert.match(html, /\.mvp-home-header \{[\s\S]*grid-template-columns: 44px minmax\(0, 1fr\) 44px;/);
    assert.match(html, /\.mvp-home-brand \{[\s\S]*justify-self: center;/);
    assert.match(html, /\.mvp-notification-dot \{[\s\S]*position: absolute;[\s\S]*right: -9px;/);
    assert.match(html, /\.mvp-world-linked-count \{/);
    assert.match(html, /\.mvp-chat-list li \+ li \{/);
    assert.match(html, /\.mvp-chat-subtitle \{/);
    assert.match(html, /\.mvp-empty-state,/);
  });

  it("renders chat pages with back, name, menu, scroll messages, fixed input, and message avatars", () => {
    const adapter = readFileSync("src/platform/mobile-mvp-adapter.ts", "utf8");
    const registry = readFileSync("src/platform/behavior-registry.ts", "utf8");
    const html = readFileSync("index.html", "utf8");

    assert.match(adapter, /header\.className = "mvp-chat-page-header"/);
    assert.match(adapter, /menu\.className = "mvp-chat-menu-button"/);
    assert.match(adapter, /bindControllerAction\(menu, controller, \{ type: "OPEN_CHAT_SETTINGS" \}\)/);
    assert.match(registry, /\| "CHAT_SETTINGS"/);
    assert.match(adapter, /case "CHAT_SETTINGS":[\s\S]*return createChatSettingsView\(snapshot, state, controller\);/);
    assert.match(adapter, /function createChatSettingsView\(\s*snapshot: WorldSnapshot,\s*state: SemanticMobileState,\s*controller: InteractionController\s*\)/);
    assert.match(adapter, /item\.className = mine \? "mvp-message-row is-mine" : "mvp-message-row"/);
    assert.match(adapter, /createAvatarWithStatus\(createUserAvatar\(\), true\)/);
    assert.match(adapter, /createAvatarWithStatus\(createChatAvatar\(snapshot, chat\), true\)/);
    assert.match(adapter, /const title = isOvoChat \? "ovO" : chat \? chatHeaderTitle\(snapshot, chat\) : "聊天"/);
    assert.match(adapter, /const context = isOvoChat \? "世界入口" : chat \? chatContextLabel\(snapshot, chat\) : "当前聊天"/);
    assert.match(adapter, /createNameBlock\(title, context\)/);
    assert.match(adapter, /function chatHeaderTitle\(snapshot: WorldSnapshot, chat: WorldChatSession \| null\): string \{[\s\S]*return `\$\{chatTitle\(snapshot, chat\)\}（\$\{groupMemberCount\(snapshot, chat\)\}）`;/);
    assert.match(adapter, /function groupMemberCount\(snapshot: WorldSnapshot, chat: WorldChatSession \| null\): number \{[\s\S]*return group \? group\.actorIds\.length \+ 1 : 0;/);
    assert.match(adapter, /input\.placeholder = composerPlaceholder\(snapshot, state\)/);
    assert.match(adapter, /hint\.textContent = "试用记忆：输入「记住：\.\.\.」可让当前世界中的对应 AI 记住"/);
    assert.match(adapter, /state\.memoryNoticeMessage = parseExplicitMemoryCommand\(action\.text\) \? "已记住" : null;/);
    assert.match(adapter, /notice\.className = "mvp-memory-notice"/);
    assert.match(adapter, /bubble\.textContent = "AI 回复中…"/);
    assert.match(adapter, /speaker\.textContent = messageAuthorName\(snapshot, message\.authorActorId\)/);
    assert.match(adapter, /AI 回复失败：/);
    assert.match(html, /\.mvp-message-stream \{[\s\S]*grid-auto-flow: row;[\s\S]*overflow-y: auto;[\s\S]*overscroll-behavior: contain;/);
    assert.match(html, /\.mvp-composer \{[\s\S]*position: fixed;[\s\S]*bottom: 64px;/);
    assert.match(html, /\.mvp-avatar-wrap \.mvp-presence-dot \{[\s\S]*position: absolute;/);
    assert.match(html, /\.mvp-message-speaker \{/);
    assert.match(html, /\.mvp-message\.is-error \{/);
    assert.match(html, /\.mvp-message\.is-loading \{/);
    assert.match(html, /\.mvp-memory-hint \{/);
    assert.match(html, /\.mvp-memory-notice \{/);
    assert.equal(html.includes("column-reverse"), false);
    assert.equal(html.includes("row-reverse"), false);
  });

  it("renders chat settings as a full page with group-only scaffolds and local appearance controls", () => {
    const adapter = readFileSync("src/platform/mobile-mvp-adapter.ts", "utf8");
    const registry = readFileSync("src/platform/behavior-registry.ts", "utf8");
    const flowExecutor = readFileSync("src/platform/flow-executor.ts", "utf8");

    assert.match(registry, /selectedChatIdForSettings: string \| null;/);
    assert.match(registry, /chatSettingsDraft: ChatSettingsDraft \| null;/);
    assert.match(registry, /\| \{ readonly type: "OPEN_CHAT_SETTINGS" \}/);
    assert.match(registry, /\| \{ readonly type: "UPDATE_CHAT_SETTINGS_DRAFT"; readonly field: "backgroundColor" \| "myBubbleColor" \| "otherBubbleColor"; readonly value: string \}/);
    assert.match(registry, /\| \{ readonly type: "UPDATE_GROUP_RULES_DRAFT"; readonly rulesText: string \}/);
    assert.match(registry, /\| \{ readonly type: "SAVE_GROUP_RULES" \}/);
    assert.match(registry, /state\.activeView = "CHAT_SETTINGS"/);
    assert.match(registry, /validateChatSettingsPatch\(/);
    assert.match(flowExecutor, /CHAT_SETTINGS_SAVE_SUCCESS_MESSAGE/);
    assert.match(flowExecutor, /saveChatAppearanceSettings/);
    assert.match(registry, /CHAT_SETTINGS_BACKGROUND_UPLOAD_UNAVAILABLE_MESSAGE/);
    assert.match(registry, /scaffoldNoticeForChatSettingsAction/);
    assert.match(adapter, /createDraftStage\("群成员", createGroupMembersSettings\(snapshot, group, draft, controller\)\)/);
    assert.match(adapter, /resolveGroupAddMemberCandidates\(group\.id/);
    assert.match(adapter, /\{ type: "CONFIRM_GROUP_ADD_MEMBER", worldContactId: candidate\.worldContactId \}/);
    assert.match(adapter, /\{ type: "OPEN_GROUP_REMOVE_MEMBER", worldContactId: actorId \}/);
    assert.match(adapter, /type: "CONFIRM_GROUP_REMOVE_MEMBER"/);
    assert.match(adapter, /createDraftStage\("群规则", createGroupRulesSettings\(draft, controller\)\)/);
    assert.match(adapter, /rules\.name = "groupRulesText"/);
    assert.match(adapter, /createMenuButton\("保存群规", controller, \{ type: "SAVE_GROUP_RULES" \}\)/);
    assert.match(adapter, /createDraftStage\("群文件", createGroupFilesSettings\(chat, draft, controller\)\)/);
    assert.match(adapter, /createDraftNote\(GROUP_FILES_EMPTY_MESSAGE\)/);
    assert.match(adapter, /createGroupFileField\("文件名", "fileName", draft\.groupFileName, controller\)/);
    assert.match(adapter, /createGroupFileField\("文件类型", "fileType", draft\.groupFileType, controller\)/);
    assert.match(adapter, /createGroupFileField\("文件大小", "fileSize", draft\.groupFileSize, controller\)/);
    assert.match(adapter, /createMenuButton\("添加群文件记录", controller, \{ type: "CONFIRM_GROUP_FILE_METADATA" \}\)/);
    assert.match(adapter, /content\.append\(createDraftStage\("当前聊天设置", createChatAppearanceSettings\(draft, controller\)\)\)/);
    assert.match(adapter, /createMenuButton\("上传聊天背景图片", controller, \{ type: "UPLOAD_CHAT_BACKGROUND_IMAGE" \}\)/);
    assert.match(adapter, /createColorField\("聊天背景颜色", draft\.backgroundColor, controller, "backgroundColor"\)/);
    assert.match(adapter, /createColorField\("我的气泡颜色", draft\.myBubbleColor, controller, "myBubbleColor"\)/);
    assert.match(adapter, /createColorField\("对方气泡颜色", draft\.otherBubbleColor, controller, "otherBubbleColor"\)/);
  });

  it("keeps expandable chat input tools in the floating overlay layer", () => {
    const adapter = readFileSync("src/platform/mobile-mvp-adapter.ts", "utf8");
    const registry = readFileSync("src/platform/behavior-registry.ts", "utf8");
    const html = readFileSync("index.html", "utf8");

    assert.match(registry, /\| "ovo-world-menu"/);
    assert.match(registry, /\| "world-switcher"/);
    assert.match(registry, /\| "world-editor-selector"/);
    assert.match(adapter, /app\.append\([\s\S]*viewport,[\s\S]*createWorldCreationTransitionLayer\(state, controller\),[\s\S]*createOverlayLayer\(ViewRouter\.currentOverlay\(state\), state, controller\),[\s\S]*createBottomNav\(state, controller\)[\s\S]*\)/);
    assert.match(adapter, /function createOverlayContent\(\s*overlayState: MobileOverlay,\s*state: SemanticMobileState,\s*controller: InteractionController\s*\)/);
    assert.match(adapter, /bindControllerAction\(left, controller, \{ type: "OPEN_EMOJI_PICKER" \}\)/);
    assert.match(adapter, /bindControllerAction\(action, controller, \{ type: "OPEN_FILE_PICKER" \}\)/);
    assert.match(adapter, /function createContactDetailView\(\s*snapshot: WorldSnapshot,\s*state: SemanticMobileState,\s*controller: InteractionController\s*\)/);
    assert.doesNotMatch(adapter, /screen\.append\(createAddMenu\(\)\)/);
    assert.doesNotMatch(adapter, /screen\.append\(createChatMenu\(\)\)/);
    assert.match(html, /\.mvp-overlay-layer \{[\s\S]*position: fixed;[\s\S]*pointer-events: none;/);
    assert.match(html, /\.mvp-overlay-panel \{[\s\S]*pointer-events: auto;/);
    assert.match(html, /\.mvp-composer \{[\s\S]*position: fixed;[\s\S]*bottom: 64px;/);
    assert.equal(html.includes(".mvp-world-panel"), false);
  });

  it("renders a clearable world creation transition through the controller", () => {
    const adapter = readFileSync("src/platform/mobile-mvp-adapter.ts", "utf8");
    const registry = readFileSync("src/platform/behavior-registry.ts", "utf8");
    const html = readFileSync("index.html", "utf8");

    assert.match(registry, /\| \{ readonly type: "COMPLETE_WORLD_CREATION_TRANSITION" \}/);
    assert.match(registry, /case "COMPLETE_WORLD_CREATION_TRANSITION":/);
    assert.match(registry, /state\.worldCreationTransition = null/);
    assert.match(adapter, /function createWorldCreationTransitionLayer\(\s*state: SemanticMobileState,\s*controller: InteractionController\s*\)/);
    assert.match(adapter, /transition\.phase === "done"/);
    assert.match(adapter, /bindControllerAction\(continueButton, controller, \{ type: "COMPLETE_WORLD_CREATION_TRANSITION" \}\)/);
    assert.match(html, /\.mvp-world-creation-transition \{[\s\S]*pointer-events: auto;/);
    assert.match(html, /\.mvp-world-creation-transition button \{/);
  });

  it("renders create world draft scaffold from the add menu without creating worlds", () => {
    const adapter = readFileSync("src/platform/mobile-mvp-adapter.ts", "utf8");
    const registry = readFileSync("src/platform/behavior-registry.ts", "utf8");
    const html = readFileSync("index.html", "utf8");

    assert.match(registry, /\| \{ readonly type: "OPEN_CREATE_WORLD_DRAFT" \}/);
    assert.match(registry, /\| \{ readonly type: "OPEN_CREATE_WORLD_DETAIL_EDIT" \}/);
    assert.match(registry, /\| \{ readonly type: "UPDATE_CREATE_WORLD_DETAIL"/);
    assert.match(registry, /\| \{ readonly type: "UPDATE_CREATE_WORLD_RANDOM_ROLE_SLOT"/);
    assert.match(registry, /\| \{ readonly type: "TOGGLE_RANDOM_ROLE_USER_SLOT"/);
    assert.match(registry, /\| \{ readonly type: "SELECT_DETAIL_ROLE_MODE"/);
    assert.match(registry, /\| \{ readonly type: "CONFIRM_CREATE_WORLD_DETAIL" \}/);
    assert.match(registry, /\| \{ readonly type: "CANCEL_CREATE_WORLD_DETAIL" \}/);
    assert.match(registry, /state\.activeView = "CREATE_WORLD_DRAFT"/);
    assert.match(registry, /state\.activeView = "CREATE_WORLD_DETAIL_EDIT"/);
    assert.match(registry, /validationError/);
    assert.match(registry, /sanitizeCreateWorldDraft/);
    assert.match(registry, /validateCreateWorldDraft/);
    assert.match(adapter, /function createCreateWorldDraftView\(\s*snapshot: WorldSnapshot,\s*state: SemanticMobileState,\s*controller: InteractionController\s*\)/);
    assert.match(adapter, /screen\.className = "mvp-screen mvp-create-world-draft"/);
    assert.match(adapter, /createDraftStage\("世界名称", draft\.fieldErrors\.worldName \? createFieldWithValidation\(name, draft\.fieldErrors\.worldName\) : name\)/);
    assert.match(adapter, /createDraftStage\("世界观", worldviewBlock\)/);
    assert.match(adapter, /createDraftStage\("选择 AI 好友", aiList\)/);
    assert.match(adapter, /createDraftStage\("下一步", nextMode\)/);
    assert.match(adapter, /sourceControls\.className = "mvp-create-world-source-controls"/);
    assert.match(adapter, /officialChips\.className = "mvp-create-world-official-chips"/);
    assert.match(adapter, /draft\.noticeMessage/);
    assert.match(adapter, /draft\.fieldErrors\.selectedAI/);
    assert.match(adapter, /markFieldInvalid\(name, draft\.fieldErrors\.worldName\)/);
    assert.match(adapter, /createDraftChip\("魔法学院"/);
    assert.match(adapter, /createDraftChip\("修仙世界"/);
    assert.match(adapter, /type: "OPEN_CREATE_WORLD_DETAIL_EDIT"/);
    assert.match(adapter, /createMenuButton\("进入世界", controller, \{ type: "CONFIRM_CREATE_WORLD_DRAFT" \}\)/);
    assert.match(adapter, /function createCreateWorldDetailEditView\(\s*snapshot: WorldSnapshot,\s*state: SemanticMobileState,\s*controller: InteractionController\s*\)/);
    assert.match(adapter, /screen\.className = "mvp-screen mvp-create-world-detail-edit"/);
    assert.match(adapter, /createDraftStage\("世界", worldSection\)/);
    assert.match(adapter, /createDraftStage\("角色分配", roleModes\)/);
    assert.match(adapter, /roleMode: "random-role"/);
    assert.match(adapter, /roleMode: "fixed-role"/);
    assert.match(adapter, /roleMode: "empty-role"/);
    assert.match(adapter, /function randomRoleSlotsForDraft/);
    assert.match(adapter, /function createRandomRoleSlotRow/);
    assert.match(adapter, /roleName\.placeholder = "角色名"/);
    assert.match(adapter, /notes\.placeholder = "人设 \/ 关系备注"/);
    assert.match(adapter, /checkboxText\.textContent = "分配给我"/);
    assert.match(adapter, /type: "UPDATE_CREATE_WORLD_RANDOM_ROLE_SLOT"/);
    assert.match(adapter, /type: "TOGGLE_RANDOM_ROLE_USER_SLOT"/);
    assert.match(adapter, /未填写的角色将由系统随机补全/);
    assert.match(adapter, /角色信息可稍后继续完善/);
    assert.match(adapter, /function createValidationNote/);
    assert.match(adapter, /mvp-create-world-validation/);
    assert.match(adapter, /function createFixedRoleSetup/);
    assert.match(adapter, /function createFixedRoleRow/);
    assert.match(adapter, /不设定角色，进入世界后不会触发主动初始反应。/);
    assert.match(adapter, /createMenuButton\("进入世界", controller, \{ type: "CONFIRM_CREATE_WORLD_DETAIL" \}\)/);
    assert.doesNotMatch(adapter, /overlayState === "create-world-draft"/);
    assert.match(html, /\.mvp-create-world-official-chips \{/);
    assert.match(html, /\.mvp-create-world-validation \{/);
  });

  it("enforces the rebased UI skeleton contract", () => {
    const adapter = readFileSync("src/platform/mobile-mvp-adapter.ts", "utf8");
    const html = readFileSync("index.html", "utf8");

    assert.match(adapter, /screen\.append\(header, messages, createComposer\(snapshot, state, controller\)\)/);
    assert.match(adapter, /function createContactsView\(\s*snapshot: WorldSnapshot,\s*state: SemanticMobileState,\s*controller: InteractionController\s*\): HTMLElement/);
    assert.match(adapter, /screen\.append\(list\)/);
    assert.match(adapter, /screen\.append\(createProfileHeader\(\), createFeatureMenu\(snapshot, controller\)\)/);
    assert.match(adapter, /function createContactDetailView\(\s*snapshot: WorldSnapshot,\s*state: SemanticMobileState,\s*controller: InteractionController\s*\): HTMLElement/);
    assert.match(adapter, /form\.className = "mvp-detail-form"/);
    assert.equal(adapter.includes("createDetailForm"), false);
    assert.equal(adapter.includes("mvp-contact-detail-overlay"), false);
    assert.equal(html.includes(".mvp-contact-detail-overlay"), false);
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

    assert.match(adapter, /function chatsFromSnapshot\(snapshot: WorldSnapshot, worldId = snapshot\.worldMeta\.id\)/);
    assert.match(adapter, /return resolveWorldChats\(worldId, snapshot\) as WorldChatSession\[\]/);
    assert.match(adapter, /const chats = chatsFromSnapshot\(snapshot, state\.currentWorldId\)/);
    assert.match(adapter, /for \(const chat of chats\)/);
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

  it("opens ovO as a special chat with a world-button composer", () => {
    const adapter = readFileSync("src/platform/mobile-mvp-adapter.ts", "utf8");
    const registry = readFileSync("src/platform/behavior-registry.ts", "utf8");
    const html = readFileSync("index.html", "utf8");

    assert.match(registry, /export type InteractionAction =/);
    assert.match(registry, /export const OVO_CHAT_ID = "ovo"/);
    assert.match(registry, /\| \{ readonly type: "OPEN_OVO_CHAT" \}/);
    assert.match(registry, /case "OPEN_OVO_CHAT":/);
    assert.match(registry, /state\.activeChatId = OVO_CHAT_ID/);
    assert.match(registry, /state\.activeView = "CHAT_VIEW"/);
    assert.match(registry, /state\.composerMode = resolveDefaultComposerMode\("ovo"\)/);
    assert.match(adapter, /type InteractionController = Readonly/);
    assert.match(adapter, /function createInteractionController\(/);
    assert.match(adapter, /bindControllerAction\(brand, controller, \{ type: "OPEN_OVO_CHAT" \}\)/);
    assert.match(adapter, /const isOvoChat = isOvoChatId\(state\.activeChatId\)/);
    assert.match(adapter, /const title = isOvoChat \? "ovO"/);
    assert.match(adapter, /createAvatarWithStatus\(isOvoChat \? createOvoAvatar\(\) : createChatAvatar\(snapshot, chat\), true\)/);
    assert.match(adapter, /const composerKind: ComposerKind = isOvoChatId\(state\.activeChatId\) \? "ovo" : "normal"/);
    assert.match(adapter, /left\.textContent = "⌨"/);
    assert.match(adapter, /bindControllerAction\(left, controller, \{ type: "TOGGLE_COMPOSER_MODE", kind: "ovo" \}\)/);
    assert.match(adapter, /modeButton\.textContent = composerMode === "world-button" \? `📍 \$\{snapshot\.worldMeta\.title\}` : "按住说话"/);
    assert.match(adapter, /bindControllerAction\(modeButton, controller, \{ type: "OPEN_OVO_WORLD_MENU" \}\)/);
    assert.match(adapter, /controller\.dispatch\(\{ type: "SUBMIT_MESSAGE", text: input\.value \}\)/);
    assert.equal(adapter.includes("MobileInputMode"), false);
    assert.equal(adapter.includes("createWorldComposer"), false);
    assert.equal(adapter.includes("createWorldPanel"), false);
    assert.equal(adapter.includes("world-panel"), false);
    assert.equal(adapter.includes("createWorldPanel"), false);
    assert.equal(adapter.includes("system page"), false);
    assert.equal(html.includes(".mvp-composer.is-world-mode"), false);
  });

  it("binds ovO world button to switch and edit world menu hierarchy", () => {
    const adapter = readFileSync("src/platform/mobile-mvp-adapter.ts", "utf8");
    const registry = readFileSync("src/platform/behavior-registry.ts", "utf8");
    const html = readFileSync("index.html", "utf8");
    const contract = readFileSync("src/domain/world-editor-contract.ts", "utf8");
    const removeContract = readFileSync("src/domain/world-member-remove-contract.ts", "utf8");

    assert.match(registry, /\| \{ readonly type: "OPEN_OVO_WORLD_MENU" \}/);
    assert.match(registry, /\| \{ readonly type: "OPEN_WORLD_SWITCHER" \}/);
    assert.match(registry, /\| \{ readonly type: "OPEN_WORLD_EDITOR_SELECTOR" \}/);
    assert.match(registry, /\| \{ readonly type: "OPEN_WORLD_EDITOR"; readonly worldId: WorldId \}/);
    assert.match(registry, /case "OPEN_OVO_WORLD_MENU":/);
    assert.match(registry, /openOverlay\(state, "ovo-world-menu"\)/);
    assert.match(registry, /case "OPEN_WORLD_SWITCHER":/);
    assert.match(registry, /openOverlay\(state, "world-switcher"\)/);
    assert.match(registry, /case "OPEN_WORLD_EDITOR_SELECTOR":/);
    assert.match(registry, /openOverlay\(state, "world-editor-selector"\)/);
    assert.match(registry, /case "OPEN_WORLD_EDITOR":/);
    assert.match(registry, /state\.activeView = "WORLD_EDITOR"/);
    assert.match(registry, /state\.selectedWorldIdForEditing = action\.worldId/);
    assert.match(registry, /\| \{ readonly type: "UPDATE_WORLD_EDITOR_DRAFT"/);
    assert.match(registry, /\| \{ readonly type: "CANCEL_WORLD_EDITOR" \}/);
    assert.match(registry, /\| \{ readonly type: "SAVE_WORLD_EDITOR" \}/);
    assert.match(adapter, /function createOvoWorldMenu\(controller: InteractionController\)/);
    assert.match(adapter, /createMenuButton\("切换世界", controller, \{ type: "OPEN_WORLD_SWITCHER" \}\)/);
    assert.match(adapter, /createMenuButton\("编辑世界", controller, \{ type: "OPEN_WORLD_EDITOR_SELECTOR" \}\)/);
    assert.match(adapter, /function createWorldSwitcherPanel\(state: SemanticMobileState, controller: InteractionController\)/);
    assert.match(adapter, /function createWorldEditorSelectorPanel\(state: SemanticMobileState, controller: InteractionController\)/);
    assert.match(adapter, /function createWorldList\(/);
    assert.match(adapter, /worldList\.className = "mvp-ovo-world-list"/);
    assert.match(adapter, /for \(const world of state\.view\.availableWorlds\)/);
    assert.match(adapter, /item\.className = world\.worldId === state\.currentWorldId \? "mvp-ovo-world-row is-current" : "mvp-ovo-world-row"/);
    assert.match(adapter, /const currentMark = world\.worldId === state\.currentWorldId \? "● " : ""/);
    assert.match(adapter, /const lockedText = mode === "edit" && world\.type === "reality" \? " · 已锁定" : ""/);
    assert.match(adapter, /item\.setAttribute\("aria-current", "true"\)/);
    assert.match(adapter, /\? \{ type: "SWITCH_WORLD", worldId: world\.worldId \}/);
    assert.match(adapter, /: \{ type: "OPEN_WORLD_EDITOR", worldId: world\.worldId \}/);
    assert.match(html, /\.mvp-ovo-world-row\.is-current \{[\s\S]*border-color: #d3382f;[\s\S]*font-weight: 700;/);
    assert.equal(html.includes(".mvp-ovo-world-menu,\n      .mvp-create-world-draft"), false);
    assert.match(adapter, /return createWorldEditorView\(snapshot, state, controller\)/);
    assert.match(adapter, /function createWorldEditorView/);
    assert.match(adapter, /screen\.className = "mvp-screen mvp-world-editor"/);
    assert.match(adapter, /createDraftStage\("世界名称", name\)/);
    assert.match(adapter, /createDraftStage\("世界观 \/ 世界设定", worldSection\)/);
    assert.match(adapter, /createDraftStage\("角色 \/ 成员", roleSection\)/);
    assert.match(adapter, /createDraftStage\("添加 AI 成员", memberSection\)/);
    assert.match(adapter, /现实世界世界观不可修改/);
    assert.match(adapter, /function createWorldEditorAddMemberScaffold/);
    assert.match(adapter, /WORLD_MEMBER_REALITY_LOCKED_MESSAGE/);
    assert.match(adapter, /linkedAIModels/);
    assert.match(adapter, /memberActorIds/);
    assert.match(adapter, /type: "ADD_WORLD_MEMBER"/);
    assert.match(adapter, /globalAILinkId: candidate\.globalAILinkId/);
    assert.match(adapter, /function createWorldEditorRemoveMemberScaffold/);
    assert.match(adapter, /function createWorldEditorRoleMemberScaffold/);
    assert.match(adapter, /"roleName"/);
    assert.match(adapter, /"personaNotes"/);
    assert.match(adapter, /"worldRoleName"/);
    assert.match(adapter, /"worldPersonaNotes"/);
    assert.match(adapter, /type: "UPDATE_WORLD_EDITOR_USER_ROLE_DRAFT"/);
    assert.match(adapter, /type: "UPDATE_WORLD_EDITOR_MEMBER_ROLE_DRAFT"/);
    assert.match(adapter, /type: "OPEN_REMOVE_WORLD_MEMBER_CONFIRMATION"/);
    assert.match(adapter, /type: "CANCEL_REMOVE_WORLD_MEMBER"/);
    assert.match(adapter, /type: "CONFIRM_REMOVE_WORLD_MEMBER"/);
    assert.match(removeContract, /WorldRemoveMemberCommand/);
    assert.match(removeContract, /DeleteWorldContact/);
    assert.match(removeContract, /DeletePrivateWorldChat/);
    assert.match(removeContract, /DeleteWorldMemoryScope/);
    assert.match(adapter, /只会创建当前世界内的联系人、私聊和独立记忆占位/);
    assert.match(contract, /WorldContact/);
    assert.match(contract, /WorldChat/);
    assert.match(contract, /WorldMemory/);
    assert.match(contract, /GlobalAIModel/);
    assert.match(contract, /GlobalAILink/);
    assert.match(adapter, /type: "SAVE_WORLD_EDITOR"/);
    assert.match(adapter, /saveButton\.setAttribute\("disabled", "true"\)/);
    assert.match(adapter, /type: "CANCEL_WORLD_EDITOR"/);
    assert.equal(adapter.includes("EDIT_WORLD"), false);
    const editorStart = adapter.indexOf("function createWorldEditorRoleMemberScaffold");
    const editorEnd = adapter.indexOf("function createWorldEditorAddMemberScaffold");
    const editorRoleScaffold = adapter.slice(editorStart, editorEnd);
    assert.equal(editorRoleScaffold.includes("outputMode"), false);
    assert.equal(editorRoleScaffold.includes("chatTone"), false);
    assert.equal(editorRoleScaffold.includes("emoji"), false);
    assert.equal(editorRoleScaffold.includes("nickname"), false);
  });

  it("locks the final UI to Chats, Contacts, and Me only", () => {
    const adapter = readFileSync("src/platform/mobile-mvp-adapter.ts", "utf8");
    const registry = readFileSync("src/platform/behavior-registry.ts", "utf8");
    const html = readFileSync("index.html", "utf8");

    assert.match(registry, /export type ViewState =[\s\S]*"CREATE_GROUP_DRAFT"[\s\S]*"CREATE_WORLD_DRAFT"[\s\S]*"CREATE_WORLD_DETAIL_EDIT"[\s\S]*"WORLD_EDITOR"/);
    assert.match(adapter, /\{ tab: "chats", label: "聊天" \}/);
    assert.match(adapter, /\{ tab: "contacts", label: "联系人" \}/);
    assert.match(adapter, /\{ tab: "me", label: "我的" \}/);
    assert.equal((adapter.match(/tab: "/g) ?? []).length, 3);
    assert.doesNotMatch(adapter, /return "world"/);
    assert.equal(adapter.includes("world-panel"), false);
    assert.equal(adapter.includes("mvp-world-page"), false);
    assert.equal(html.includes(".mvp-world-page"), false);
  });

  it("routes all user interactions through InteractionController", () => {
    const adapter = readFileSync("src/platform/mobile-mvp-adapter.ts", "utf8");
    const registry = readFileSync("src/platform/behavior-registry.ts", "utf8");

    assert.match(adapter, /function bindControllerAction\(/);
    assert.match(adapter, /function bindComposerSubmit\(/);
    assert.match(adapter, /bindControllerAction\(button, controller, actionForTab\(item\.tab\)\)/);
    assert.match(adapter, /bindControllerAction\(button, controller, \{ type: "OPEN_CHAT", chatId: chat\.id \}\)/);
    assert.match(adapter, /bindControllerAction\(back, controller, \{ type: "NAV_BACK" \}\)/);
    assert.match(adapter, /bindControllerAction\(brand, controller, \{ type: "OPEN_OVO_CHAT" \}\)/);
    assert.match(adapter, /bindControllerAction\(button, controller, \{ type: "OPEN_CONTACT", actorId: contact\.actorId \}\)/);
    assert.match(registry, /state\.selectedContactActorId = action\.actorId/);
    assert.match(adapter, /bindControllerAction\(button, controller, \{ type: "OPEN_SETTINGS" \}\)/);
    assert.match(adapter, /bindControllerAction\(back, controller, \{ type: "CLOSE_SETTINGS" \}\)/);
    assert.match(adapter, /bindComposerSubmit\(form, input, controller\)/);
    assert.match(adapter, /bindTextInput\(input, controller\)/);
    assert.match(adapter, /const stateTransition = registry\.execute\(action, state\)/);
    assert.match(adapter, /const flowResult = flowExecutor\.run\(action, \{ shell, state \}\)/);
    assert.match(adapter, /createMenuButton\("添加 AI 好友", controller, \{ type: "CREATE_AI_FRIEND" \}\)/);
    assert.match(adapter, /createMenuButton\("创建群聊", controller, \{ type: "OPEN_CREATE_GROUP_DRAFT" \}\)/);
    assert.match(adapter, /createMenuButton\("创建世界", controller, \{ type: "OPEN_CREATE_WORLD_DRAFT" \}\)/);
    assert.equal(adapter.includes("MENU_ACTION"), false);
    assert.equal((adapter.match(/addEventListener\("click"/g) ?? []).length, 2);
    assert.match(adapter, /screen\.addEventListener\("click", onSkip\)/);
    assert.equal((adapter.match(/addEventListener\("submit"/g) ?? []).length, 1);
    assert.equal((adapter.match(/addEventListener\("input"/g) ?? []).length, 13);
    assert.doesNotMatch(adapter, /addEventListener\("click", \(\) => \{\s*state\./);
    assert.doesNotMatch(adapter, /addEventListener\("click", \(\) => \{\s*shell\./);
  });

  it("derives Contacts from world-scoped snapshot contacts", () => {
    const adapter = readFileSync("src/platform/mobile-mvp-adapter.ts", "utf8");

    assert.match(adapter, /for \(const contact of contactsFromSnapshot\(snapshot, state\.currentWorldId\)\)/);
    assert.match(adapter, /resolveWorldContacts\(worldId, snapshot\) as WorldContact\[\]/);
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
    assert.match(adapter, /mvp-detail-form/);
    assert.match(adapter, /"备注 \/ 昵称"/);
    assert.match(adapter, /"你认为他是怎样的人？"/);
    assert.match(adapter, /"更像聊天"/);
    assert.match(adapter, /"更像问答"/);
    assert.match(adapter, /"他 \/ 她如何和你说话"/);
    assert.match(adapter, /emojiPermission/);
    assert.match(adapter, /state\.view\.linkedAIModels/);
    assert.match(adapter, /OPEN_LINKED_AI_DISCONNECT_CONFIRMATION/);
    assert.match(adapter, /CANCEL_LINKED_AI_DISCONNECT/);
    assert.match(adapter, /CONFIRM_LINKED_AI_DISCONNECT/);
    assert.match(adapter, /"删除好友"/);
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
    assert.match(adapter, /createFeatureRow\("收藏", assistantContacts\(snapshot\)\.filter/);
    assert.doesNotMatch(adapter, /createFeatureRow\("收藏", contactsFromSnapshot\(snapshot/);
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
