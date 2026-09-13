const IDLE_WARN_MS = 25 * 60 * 1000;
const IDLE_LOCK_MS = 30 * 60 * 1000;
const IDLE_HEARTBEAT_MS = 5 * 60 * 1000;
const LAST_ACTIVE_KEY = "karon-idle-last-active";
const IDLE_LOCK_ENABLED_EVENT = "karon-idle-lock-enabled";

type IdlePhase = "ok" | "warn" | "lock";

const idlePhase = (now: number, lastActiveAt: number): IdlePhase => {
  const idleFor = now - lastActiveAt;

  if (idleFor >= IDLE_LOCK_MS) {
    return "lock";
  }

  if (idleFor >= IDLE_WARN_MS) {
    return "warn";
  }

  return "ok";
};

const activityResetsIdle = (phase: IdlePhase) => phase !== "lock";

const readStoredLastActive = (userId: string) => {
  try {
    const raw = sessionStorage.getItem(`${LAST_ACTIVE_KEY}:${userId}`);
    const value = raw ? Number(raw) : NaN;

    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
};

const writeStoredLastActive = (userId: string, at: number) => {
  try {
    sessionStorage.setItem(`${LAST_ACTIVE_KEY}:${userId}`, String(at));
  } catch {
    return;
  }
};

const clearStoredLastActive = (userId: string) => {
  try {
    sessionStorage.removeItem(`${LAST_ACTIVE_KEY}:${userId}`);
  } catch {
    return;
  }
};

const parseIdleLockEnabled = (value: unknown) => value !== false;

const notifyIdleLockEnabled = (enabled: boolean) => {
  window.dispatchEvent(
    new CustomEvent(IDLE_LOCK_ENABLED_EVENT, { detail: enabled })
  );

  try {
    localStorage.setItem(IDLE_LOCK_ENABLED_EVENT, enabled ? "1" : "0");
  } catch {
    return;
  }
};

export {
  IDLE_HEARTBEAT_MS,
  IDLE_LOCK_ENABLED_EVENT,
  IDLE_LOCK_MS,
  IDLE_WARN_MS,
  activityResetsIdle,
  clearStoredLastActive,
  idlePhase,
  notifyIdleLockEnabled,
  parseIdleLockEnabled,
  readStoredLastActive,
  writeStoredLastActive
};
export type { IdlePhase };
