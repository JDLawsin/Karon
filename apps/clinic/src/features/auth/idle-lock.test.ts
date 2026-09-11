import { describe, expect, it } from "vitest";

import { IDLE_LOCK_MS, IDLE_WARN_MS, idlePhase } from "./idle-lock";

describe("idlePhase", () => {
  it("warns before the 30-minute lock", () => {
    const now = 1_000_000;

    expect(idlePhase(now, now)).toBe("ok");
    expect(idlePhase(now, now - IDLE_WARN_MS)).toBe("warn");
    expect(idlePhase(now, now - IDLE_LOCK_MS)).toBe("lock");
  });
});
