# AI Provider Setup

The Trial MVP provider bridge reads secrets only from local/server environment configuration. Do not put real API keys in frontend code, committed docs, or committed config files.

## Local Variables

Copy `.env.example` to a local `.env` file if a local runner needs environment variables.

```text
OVONE_AI_PROVIDER=mock
OVONE_AI_BASE_URL=https://api.example.com/v1
OVONE_AI_API_KEY=
OVONE_AI_MODEL=mock-trial
```

Use `OVONE_AI_PROVIDER=mock` for no-key local demo and tests.

For a real OpenAI-compatible provider, set:

```text
OVONE_AI_PROVIDER=openai-compatible
OVONE_AI_BASE_URL=<server-side provider base url>
OVONE_AI_API_KEY=<local secret, never committed>
OVONE_AI_MODEL=<provider model id>
```

## Boundary

- `.env` and `.env.*` are ignored by Git.
- `.env.example` must contain placeholders only.
- The bridge exposes provider/model/configured state to client-visible code, never the API key.
- Real Chat Runtime v1 uses the bridge for active private/group chat sends. It does not stream, inject memory, inject group rules, inject group files, or expose API keys in client-visible state.
