import { describe, expect, it } from "vitest";

import {
  IDLE_LOCK_MS,
  IDLE_WARN_MS,
  activityResetsIdle,
  idlePhase,
  parseIdleLockEnabled
} from "./idle-lock";

describe("idlePhase", () => {
  it("warns before the 30-minute lock", () => {
    const now = 1_000_000;

    expect(idlePhase(now, now)).toBe("ok");
    expect(idlePhase(now, now - IDLE_WARN_MS)).toBe("warn");
    expect(idlePhase(now, now - IDLE_LOCK_MS)).toBe("lock");
  });
});

describe("activityResetsIdle", () => {
  it("counts pointer activity during the warning as still using the clinic", () => {
    expect(activityResetsIdle("ok")).toBe(true);
    expect(activityResetsIdle("warn")).toBe(true);
    expect(activityResetsIdle("lock")).toBe(false);
  });
});

describe("parseIdleLockEnabled", () => {
  it("defaults to on unless metadata is explicitly false", () => {
    expect(parseIdleLockEnabled(undefined)).toBe(true);
    expect(parseIdleLockEnabled(true)).toBe(true);
    expect(parseIdleLockEnabled("0")).toBe(true);
    expect(parseIdleLockEnabled(false)).toBe(false);
  });
});
