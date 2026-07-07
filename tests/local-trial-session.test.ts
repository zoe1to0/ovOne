import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  LOCAL_TRIAL_SESSION_SCHEMA_VERSION,
  LOCAL_TRIAL_SESSION_STORAGE_KEY,
  createLocalTrialSession,
  isLocalTrialSessionSecretFree,
  loadLocalTrialSession,
  touchLocalTrialSession
} from "../src/trial-session/index.js";

describe("Local Trial Session", () => {
  it("returns null when no local trial session exists", () => {
    const storage = createKeyValueStorage();

    assert.equal(loadLocalTrialSession(storage), null);
  });

  it("creates a local trial session with trial user fields", () => {
    const storage = createKeyValueStorage();
    const session = createLocalTrialSession(storage, clock("2026-07-07T01:02:03.000Z"));

    assert.deepEqual(session, {
      userId: "trial-2026-07-07T01:02:03.000Z",
      mode: "trial",
      displayName: "Trial User",
      createdAt: "2026-07-07T01:02:03.000Z",
      lastActiveAt: "2026-07-07T01:02:03.000Z",
      schemaVersion: LOCAL_TRIAL_SESSION_SCHEMA_VERSION,
      status: "active"
    });
    assert.deepEqual(loadLocalTrialSession(storage), session);
  });

  it("loads an existing session and refreshes lastActiveAt without replacing the user", () => {
    const storage = createKeyValueStorage();
    createLocalTrialSession(storage, clock("2026-07-07T01:02:03.000Z"));

    const touched = touchLocalTrialSession(storage, clock("2026-07-07T02:03:04.000Z"));

    assert.equal(touched?.userId, "trial-2026-07-07T01:02:03.000Z");
    assert.equal(touched?.createdAt, "2026-07-07T01:02:03.000Z");
    assert.equal(touched?.lastActiveAt, "2026-07-07T02:03:04.000Z");
    assert.deepEqual(loadLocalTrialSession(storage), touched);
  });

  it("does not store provider API keys or secret-bearing fields in the session", () => {
    const storage = createKeyValueStorage();
    const session = createLocalTrialSession(storage, clock("2026-07-07T01:02:03.000Z"));
    const raw = storage.getItem(LOCAL_TRIAL_SESSION_STORAGE_KEY) ?? "";

    assert.equal(isLocalTrialSessionSecretFree(session), true);
    assert.equal(raw.includes("OVONE_AI_API_KEY"), false);
    assert.equal(raw.includes("apiKey"), false);
    assert.equal(raw.includes("secret"), false);
    assert.equal(raw.includes("token"), false);
  });

  it("keeps local app data outside the trial session store", () => {
    const sessionStorage = createKeyValueStorage();
    const worldData = {
      worlds: ["reality", "custom-world"],
      chats: ["chat-one"],
      memory: ["memory-one"]
    };
    const before = JSON.stringify(worldData);

    createLocalTrialSession(sessionStorage, clock("2026-07-07T01:02:03.000Z"));

    assert.equal(JSON.stringify(worldData), before);
    assert.equal(sessionStorage.keys().includes("worlds"), false);
    assert.equal(sessionStorage.keys().includes("chats"), false);
    assert.equal(sessionStorage.keys().includes("memory"), false);
  });
});

function clock(value: string) {
  return Object.freeze({
    now: () => new Date(value)
  });
}

function createKeyValueStorage() {
  const entries = new Map<string, string>();
  return Object.freeze({
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
    removeItem: (key: string) => {
      entries.delete(key);
    },
    keys: () => [...entries.keys()]
  });
}
