export type AIProviderName = "mock" | "openai-compatible";

export type AIProviderConfig = Readonly<{
  readonly provider: AIProviderName;
  readonly baseUrl: string;
  readonly apiKey?: string;
  readonly model: string;
}>;

export type AIProviderMessage = Readonly<{
  readonly role: "system" | "user" | "assistant";
  readonly content: string;
}>;

export type AIProviderChatRequest = Readonly<{
  readonly messages: readonly AIProviderMessage[];
  readonly temperature?: number;
  readonly maxTokens?: number;
}>;

export type AIProviderChatResponse = Readonly<{
  readonly ok: boolean;
  readonly provider: AIProviderName;
  readonly model: string;
  readonly status: "ok" | "provider-not-configured" | "provider-error";
  readonly text: string;
  readonly error: AIProviderError | null;
}>;

export type AIProviderError = Readonly<{
  readonly code: "provider-not-configured" | "provider-error" | "invalid-config" | "invalid-response";
  readonly message: string;
  readonly provider: AIProviderName;
  readonly statusCode?: number;
}>;

export type AIProviderConfigValidation = Readonly<{
  readonly valid: boolean;
  readonly configured: boolean;
  readonly config: AIProviderConfig | null;
  readonly error: AIProviderError | null;
}>;

export type AIProviderClientVisibleState = Readonly<{
  readonly provider: AIProviderName;
  readonly model: string;
  readonly configured: boolean;
  readonly exposesApiKey: false;
}>;

export type AIProviderBridge = Readonly<{
  readonly provider: AIProviderName;
  readonly model: string;
  readonly configured: boolean;
  readonly clientVisibleState: AIProviderClientVisibleState;
}>;

type FetchLike = (url: string, init: Readonly<{
  method: "POST";
  headers: Readonly<Record<string, string>>;
  body: string;
}>) => Promise<Readonly<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text?: () => Promise<string>;
}>>;

type AIProviderBridgeInternal = AIProviderBridge & Readonly<{
  readonly config: AIProviderConfig;
  readonly fetchImpl: FetchLike | null;
}>;

export function validateAIProviderConfig(config: unknown): AIProviderConfigValidation {
  const normalized = normalizeProviderConfig(config);
  if (!normalized) {
    return Object.freeze({
      valid: false,
      configured: false,
      config: null,
      error: Object.freeze({
        code: "invalid-config",
        message: "AI provider config is invalid.",
        provider: "mock"
      })
    });
  }
  if (normalized.provider === "mock") {
    return Object.freeze({
      valid: true,
      configured: true,
      config: normalized,
      error: null
    });
  }
  const configured = Boolean(normalized.apiKey?.trim());
  return Object.freeze({
    valid: true,
    configured,
    config: normalized,
    error: configured
      ? null
      : Object.freeze({
        code: "provider-not-configured",
        message: "AI provider API key is not configured.",
        provider: normalized.provider
      })
  });
}

export function createAIProviderBridge(
  config: unknown,
  options: Readonly<{ fetchImpl?: FetchLike }> = {}
): AIProviderBridge {
  const validation = validateAIProviderConfig(config);
  const providerConfig = validation.config ?? normalizeProviderConfig({ provider: "mock", model: "mock-trial" });
  if (!providerConfig) {
    throw new Error("AI provider bridge fallback config failed to normalize.");
  }
  const visible = Object.freeze({
    provider: providerConfig.provider,
    model: providerConfig.model,
    configured: validation.config ? validation.config.provider === "mock" || validation.configured : false,
    exposesApiKey: false as const
  });
  return Object.freeze({
    provider: visible.provider,
    model: visible.model,
    configured: visible.configured,
    clientVisibleState: visible,
    config: providerConfig,
    fetchImpl: options.fetchImpl ?? null
  }) as AIProviderBridge;
}

export async function callAIProviderChat(
  bridge: AIProviderBridge,
  request: AIProviderChatRequest
): Promise<AIProviderChatResponse> {
  const internal = bridge as AIProviderBridgeInternal;
  if (!isValidChatRequest(request)) {
    return createProviderErrorResponse(internal, "invalid-config", "AI provider chat request is invalid.");
  }
  if (internal.config.provider === "mock") {
    const lastUserMessage = [...request.messages].reverse().find((message) => message.role === "user");
    return Object.freeze({
      ok: true,
      provider: "mock",
      model: internal.config.model,
      status: "ok",
      text: `mock:${lastUserMessage?.content ?? "empty"}`,
      error: null
    });
  }
  if (!internal.config.apiKey?.trim()) {
    return createProviderErrorResponse(internal, "provider-not-configured", "AI provider API key is not configured.");
  }
  const fetchImpl = internal.fetchImpl ?? globalThis.fetch as FetchLike | undefined;
  if (!fetchImpl) {
    return createProviderErrorResponse(internal, "provider-error", "AI provider fetch implementation is unavailable.");
  }
  try {
    const response = await fetchImpl(`${internal.config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: Object.freeze({
        "content-type": "application/json",
        authorization: `Bearer ${internal.config.apiKey}`
      }),
      body: JSON.stringify(normalizeProviderChatRequest(internal.config, request))
    });
    const payload = await response.json();
    if (!response.ok) {
      return createProviderErrorResponse(internal, "provider-error", extractProviderErrorMessage(payload), response.status);
    }
    const text = extractProviderText(payload);
    if (!text) {
      return createProviderErrorResponse(internal, "invalid-response", "AI provider response did not include text.", response.status);
    }
    return Object.freeze({
      ok: true,
      provider: internal.config.provider,
      model: extractProviderModel(payload) ?? internal.config.model,
      status: "ok",
      text,
      error: null
    });
  } catch (error) {
    return createProviderErrorResponse(internal, "provider-error", error instanceof Error ? error.message : "AI provider request failed.");
  }
}

function normalizeProviderConfig(config: unknown): AIProviderConfig | null {
  if (!isRecord(config)) {
    return null;
  }
  const provider = config.provider ?? config.OVONE_AI_PROVIDER ?? "mock";
  const model = config.model ?? config.OVONE_AI_MODEL ?? "mock-trial";
  const baseUrl = config.baseUrl ?? config.OVONE_AI_BASE_URL ?? "";
  const apiKey = config.apiKey ?? config.OVONE_AI_API_KEY;
  if ((provider !== "mock" && provider !== "openai-compatible") || typeof model !== "string") {
    return null;
  }
  if (provider === "openai-compatible" && typeof baseUrl !== "string") {
    return null;
  }
  if (apiKey !== undefined && typeof apiKey !== "string") {
    return null;
  }
  return Object.freeze({
    provider,
    baseUrl: typeof baseUrl === "string" ? baseUrl : "",
    ...(apiKey !== undefined ? { apiKey } : {}),
    model
  });
}

function normalizeProviderChatRequest(config: AIProviderConfig, request: AIProviderChatRequest): Readonly<Record<string, unknown>> {
  return Object.freeze({
    model: config.model,
    messages: request.messages.map((message) => Object.freeze({
      role: message.role,
      content: message.content
    })),
    ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
    ...(request.maxTokens !== undefined ? { max_tokens: request.maxTokens } : {})
  });
}

function isValidChatRequest(request: AIProviderChatRequest): boolean {
  return Array.isArray(request.messages) && request.messages.length > 0 && request.messages.every((message) =>
    (message.role === "system" || message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string"
  );
}

function createProviderErrorResponse(
  bridge: AIProviderBridgeInternal,
  code: AIProviderError["code"],
  message: string,
  statusCode?: number
): AIProviderChatResponse {
  return Object.freeze({
    ok: false,
    provider: bridge.config.provider,
    model: bridge.config.model,
    status: code === "provider-not-configured" ? "provider-not-configured" : "provider-error",
    text: "",
    error: Object.freeze({
      code,
      message,
      provider: bridge.config.provider,
      ...(statusCode !== undefined ? { statusCode } : {})
    })
  });
}

function extractProviderText(payload: unknown): string {
  if (!isRecord(payload)) {
    return "";
  }
  const choices = payload.choices;
  if (!Array.isArray(choices)) {
    return "";
  }
  const first = choices[0];
  if (!isRecord(first) || !isRecord(first.message) || typeof first.message.content !== "string") {
    return "";
  }
  return first.message.content;
}

function extractProviderModel(payload: unknown): string | null {
  return isRecord(payload) && typeof payload.model === "string" ? payload.model : null;
}

function extractProviderErrorMessage(payload: unknown): string {
  if (isRecord(payload) && isRecord(payload.error) && typeof payload.error.message === "string") {
    return payload.error.message;
  }
  return "AI provider returned an error.";
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
