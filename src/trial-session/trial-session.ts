export const LOCAL_TRIAL_SESSION_STORAGE_KEY = "ovone:v2:local-trial-session";
export const LOCAL_TRIAL_SESSION_SCHEMA_VERSION = 1;

export type LocalTrialSessionMode = "trial";
export type LocalTrialSessionStatus = "active";

export type LocalTrialSession = Readonly<{
  readonly userId: string;
  readonly mode: LocalTrialSessionMode;
  readonly displayName: "Trial User";
  readonly createdAt: string;
  readonly lastActiveAt: string;
  readonly schemaVersion: number;
  readonly status: LocalTrialSessionStatus;
}>;

export type LocalTrialSessionStorage = Readonly<{
  readonly getItem: (key: string) => string | null;
  readonly setItem: (key: string, value: string) => void;
  readonly removeItem?: (key: string) => void;
}>;

export type LocalTrialSessionClock = Readonly<{
  readonly now: () => Date;
}>;

const DEFAULT_CLOCK: LocalTrialSessionClock = Object.freeze({
  now: () => new Date()
});

export function loadLocalTrialSession(
  storage: LocalTrialSessionStorage,
  key: string = LOCAL_TRIAL_SESSION_STORAGE_KEY
): LocalTrialSession | null {
  const raw = storage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    return normalizeLocalTrialSession(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function hasLocalTrialSession(storage: LocalTrialSessionStorage): boolean {
  return loadLocalTrialSession(storage) !== null;
}

export function createLocalTrialSession(
  storage: LocalTrialSessionStorage,
  clock: LocalTrialSessionClock = DEFAULT_CLOCK
): LocalTrialSession {
  const timestamp = clock.now().toISOString();
  const session: LocalTrialSession = Object.freeze({
    userId: `trial-${timestamp}`,
    mode: "trial",
    displayName: "Trial User",
    createdAt: timestamp,
    lastActiveAt: timestamp,
    schemaVersion: LOCAL_TRIAL_SESSION_SCHEMA_VERSION,
    status: "active"
  });

  persistLocalTrialSession(storage, session);
  return session;
}

export function touchLocalTrialSession(
  storage: LocalTrialSessionStorage,
  clock: LocalTrialSessionClock = DEFAULT_CLOCK
): LocalTrialSession | null {
  const existing = loadLocalTrialSession(storage);
  if (!existing) {
    return null;
  }

  const next: LocalTrialSession = Object.freeze({
    ...existing,
    lastActiveAt: clock.now().toISOString()
  });
  persistLocalTrialSession(storage, next);
  return next;
}

export function isLocalTrialSessionSecretFree(session: LocalTrialSession): boolean {
  const raw = JSON.stringify(session).toLowerCase();
  return !raw.includes("api") && !raw.includes("key") && !raw.includes("secret") && !raw.includes("token");
}

function persistLocalTrialSession(
  storage: LocalTrialSessionStorage,
  session: LocalTrialSession,
  key: string = LOCAL_TRIAL_SESSION_STORAGE_KEY
): void {
  storage.setItem(key, JSON.stringify(session));
}

function normalizeLocalTrialSession(value: unknown): LocalTrialSession | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Partial<Record<keyof LocalTrialSession, unknown>>;
  if (
    typeof candidate.userId !== "string" ||
    candidate.mode !== "trial" ||
    candidate.displayName !== "Trial User" ||
    typeof candidate.createdAt !== "string" ||
    typeof candidate.lastActiveAt !== "string" ||
    candidate.schemaVersion !== LOCAL_TRIAL_SESSION_SCHEMA_VERSION ||
    candidate.status !== "active"
  ) {
    return null;
  }

  return Object.freeze({
    userId: candidate.userId,
    mode: "trial",
    displayName: "Trial User",
    createdAt: candidate.createdAt,
    lastActiveAt: candidate.lastActiveAt,
    schemaVersion: LOCAL_TRIAL_SESSION_SCHEMA_VERSION,
    status: "active"
  });
}
