import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mountApp, mountAppShell } from "../src/platform/browser-adapter.js";
import { mountMinimalUiShell } from "../src/platform/minimal-ui-adapter.js";

describe("Product UI Consolidation", () => {
  it("keeps mountChatShell as the only production UI export", () => {
    const platformIndex = readFileSync("src/platform/index.ts", "utf8");
    const main = readFileSync("src/main.ts", "utf8");
    const publicIndex = readFileSync("src/index.ts", "utf8");

    assert.match(platformIndex, /export \{ mountChatShell \} from "\.\/mobile-mvp-adapter\.js"/);
    assert.match(platformIndex, /export type \{ ChatShellMount \} from "\.\/mobile-mvp-adapter\.js"/);
    assert.equal(platformIndex.includes("mountApp"), false);
    assert.equal(platformIndex.includes("mountAppShell"), false);
    assert.equal(platformIndex.includes("mountMinimalUiShell"), false);
    assert.equal(platformIndex.includes("mountMobileMvpShell"), false);
    assert.match(main, /mountChatShell\(document\.body\)/);
    assert.equal(main.includes("mountMobileMvpShell"), false);
    assert.equal(publicIndex.includes("./minimal-ui-shell/index.js"), false);
    assert.equal(publicIndex.includes("./app-shell/index.js"), false);
    assert.equal(publicIndex.includes("./ui/index.js"), false);
    assert.equal(publicIndex.includes("./bootstrap/index.js"), false);
    assert.equal(publicIndex.includes("./persistence/index.js"), false);
    assert.equal(publicIndex.includes("./onboarding/index.js"), false);
  });

  it("disables legacy browser and minimal UI roots even when imported directly", () => {
    const browserAdapter = readFileSync("src/platform/browser-adapter.ts", "utf8");
    const minimalAdapter = readFileSync("src/platform/minimal-ui-adapter.ts", "utf8");

    assert.match(browserAdapter, /LegacyUiMountDisabledError/);
    assert.match(browserAdapter, /Use mountChatShell as the single UI entry point/);
    assert.match(browserAdapter, /throw new LegacyUiMountDisabledError\("mountApp"\)/);
    assert.match(browserAdapter, /throw new LegacyUiMountDisabledError\("mountAppShell"\)/);
    assert.match(minimalAdapter, /throw new LegacyUiMountDisabledError\("mountMinimalUiShell"\)/);
    assert.equal(minimalAdapter.includes("createOnboardedProductRuntime"), false);
    const root = {} as HTMLElement;
    assert.throws(() => mountApp({} as Parameters<typeof mountApp>[0], root), /mountApp is disabled/);
    assert.throws(() => mountAppShell({} as Parameters<typeof mountAppShell>[0], root), /mountAppShell is disabled/);
    assert.throws(
      () => mountMinimalUiShell({} as Parameters<typeof mountMinimalUiShell>[0], root),
      /mountMinimalUiShell is disabled/
    );
  });

  it("enforces the mobile MVP routing pipeline as the only active product layout", () => {
    const adapter = readFileSync("src/platform/mobile-mvp-adapter.ts", "utf8");
    const registry = readFileSync("src/platform/behavior-registry.ts", "utf8");

    assert.match(adapter, /const ViewRouter = Object\.freeze\(\{[\s\S]*resolve: createBehaviorRegistry\(\)\.resolveView,[\s\S]*currentOverlay: createBehaviorRegistry\(\)\.currentOverlay[\s\S]*\}\)/);
    assert.match(registry, /export function resolveView\(activeView: string\): ViewRouteResolution/);
    assert.match(adapter, /function renderShellPage\(/);
    assert.match(adapter, /function createShellPageFrame\(routeState: ViewRouteResolution, page: HTMLElement\)/);
    assert.match(adapter, /function createChatShell\(/);
    assert.match(adapter, /const controller = createInteractionController\(shell, state, render\)/);
    assert.match(adapter, /const snapshot = state\.view\.product\.snapshot/);
    assert.match(adapter, /app\.append\([\s\S]*viewport,[\s\S]*createWorldCreationTransitionLayer\(state\),[\s\S]*createOverlayLayer\(ViewRouter\.currentOverlay\(state\), state, controller\),[\s\S]*createBottomNav\(state, controller\)[\s\S]*\)/);
    assert.doesNotMatch(adapter, /className = "minimal-/);
    assert.doesNotMatch(adapter, /ovone-product-shell/);
  });

  it("keeps production CSS isolated to the MVP namespace", () => {
    const html = readFileSync("index.html", "utf8");

    assert.match(html, /\.mvp-shell/);
    assert.match(html, /\.mvp-page/);
    assert.match(html, /\.mvp-overlay-layer/);
    assert.match(html, /\.mvp-composer/);
    assert.equal(html.includes(".minimal-"), false);
    assert.equal(html.includes(".ovone-"), false);
  });
});
