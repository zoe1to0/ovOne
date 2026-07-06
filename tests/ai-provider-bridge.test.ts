import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  callAIProviderChat,
  createAIProviderBridge,
  validateAIProviderConfig
} from "../src/domain/index.js";

const realConfig = Object.freeze({
  provider: "openai-compatible",
  baseUrl: "https://provider.example/v1",
  apiKey: "test-secret-key",
  model: "trial-model"
});

const request = Object.freeze({
  messages: Object.freeze([
    Object.freeze({ role: "system" as const, content: "Be concise." }),
    Object.freeze({ role: "user" as const, content: "hello" })
  ]),
  temperature: 0.2,
  maxTokens: 64
});

describe("AI Provider Bridge", () => {
  it("validates provider config without exposing API keys", () => {
    const validation = validateAIProviderConfig(realConfig);
    const bridge = createAIProviderBridge(realConfig);

    assert.equal(validation.valid, true);
    assert.equal(validation.config?.provider, "openai-compatible");
    assert.equal(validation.config?.model, "trial-model");
    assert.equal(bridge.provider, "openai-compatible");
    assert.equal(bridge.model, "trial-model");
    assert.equal(bridge.configured, true);
    assert.equal(bridge.clientVisibleState.provider, "openai-compatible");
    assert.equal(bridge.clientVisibleState.model, "trial-model");
    assert.equal(bridge.clientVisibleState.exposesApiKey, false);
    assert.equal(JSON.stringify(bridge.clientVisibleState).includes("test-secret-key"), false);
  });

  it("returns provider-not-configured when real provider API key is missing", async () => {
    const bridge = createAIProviderBridge({
      provider: "openai-compatible",
      baseUrl: "https://provider.example/v1",
      model: "trial-model"
    });

    const response = await callAIProviderChat(bridge, request);

    assert.equal(bridge.configured, false);
    assert.equal(response.ok, false);
    assert.equal(response.status, "provider-not-configured");
    assert.equal(response.error?.code, "provider-not-configured");
    assert.equal(response.text, "");
  });

  it("keeps mock provider deterministic for tests and no-key local demo", async () => {
    const bridge = createAIProviderBridge({
      provider: "mock",
      model: "mock-trial"
    });

    const response = await callAIProviderChat(bridge, request);

    assert.equal(bridge.configured, true);
    assert.equal(response.ok, true);
    assert.equal(response.provider, "mock");
    assert.equal(response.model, "mock-trial");
    assert.equal(response.status, "ok");
    assert.equal(response.text, "mock:hello");
  });

  it("normalizes real adapter requests and success responses", async () => {
    let capturedUrl = "";
    let capturedBody = "";
    let capturedAuthorization = "";
    const bridge = createAIProviderBridge(realConfig, {
      fetchImpl: async (url, init) => {
        capturedUrl = url;
        capturedBody = init.body;
        capturedAuthorization = init.headers.authorization ?? "";
        return {
          ok: true,
          status: 200,
          json: async () => ({
            model: "trial-model-response",
            choices: [{ message: { content: "real response" } }]
          })
        };
      }
    });

    const response = await callAIProviderChat(bridge, request);
    const body = JSON.parse(capturedBody) as {
      model: string;
      messages: { role: string; content: string }[];
      temperature: number;
      max_tokens: number;
    };

    assert.equal(capturedUrl, "https://provider.example/v1/chat/completions");
    assert.equal(capturedAuthorization, "Bearer test-secret-key");
    assert.equal(body.model, "trial-model");
    assert.deepEqual(body.messages, [
      { role: "system", content: "Be concise." },
      { role: "user", content: "hello" }
    ]);
    assert.equal(body.temperature, 0.2);
    assert.equal(body.max_tokens, 64);
    assert.equal(response.ok, true);
    assert.equal(response.provider, "openai-compatible");
    assert.equal(response.model, "trial-model-response");
    assert.equal(response.status, "ok");
    assert.equal(response.text, "real response");
    assert.equal(response.error, null);
  });

  it("normalizes provider error responses without leaking raw payloads to UI state", async () => {
    const bridge = createAIProviderBridge(realConfig, {
      fetchImpl: async () => ({
        ok: false,
        status: 429,
        json: async () => ({
          error: { message: "rate limited", raw: { secret: "provider-internal" } }
        })
      })
    });

    const response = await callAIProviderChat(bridge, request);

    assert.equal(response.ok, false);
    assert.equal(response.status, "provider-error");
    assert.equal(response.text, "");
    assert.equal(response.error?.code, "provider-error");
    assert.equal(response.error?.message, "rate limited");
    assert.equal(response.error?.statusCode, 429);
    assert.equal(JSON.stringify(bridge.clientVisibleState).includes("test-secret-key"), false);
    assert.equal(JSON.stringify(response).includes("provider-internal"), false);
  });

  it("keeps .env uncommitted and .env.example placeholder-only", () => {
    const gitignore = readFileSync(".gitignore", "utf8");
    const envExample = readFileSync(".env.example", "utf8");

    assert.match(gitignore, /^\.env$/m);
    assert.match(gitignore, /^\.env\.\*$/m);
    assert.match(gitignore, /^!\.env\.example$/m);
    assert.match(envExample, /^OVONE_AI_API_KEY=$/m);
    assert.equal(envExample.includes("test-secret-key"), false);
  });
});
