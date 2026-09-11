const IDLE_WARN_MS = 25 * 60 * 1000;
const IDLE_LOCK_MS = 30 * 60 * 1000;

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

export { IDLE_LOCK_MS, IDLE_WARN_MS, idlePhase };
export type { IdlePhase };
