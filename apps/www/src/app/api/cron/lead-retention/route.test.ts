import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const deleteExpired = vi.fn();

vi.mock("@karon/db", async (importOriginal) => {
  const original = await importOriginal<typeof import("@karon/db")>();
  return {
    ...original,
    createMarketingLeadStore: () => ({ deleteExpired })
  };
});

import { GET } from "./route";

describe("lead retention cron", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "cron-test-secret");
    vi.stubEnv("DATABASE_URL", "postgres://unused.example.test/database");
    vi.stubEnv("LEAD_RETENTION_DAYS", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects requests without the cron secret", async () => {
    const response = await GET(new Request("https://www.example.test/api/cron/lead-retention"));
    expect(response.status).toBe(401);
    expect(deleteExpired).not.toHaveBeenCalled();
  });

  it("fails visibly until the retention period is approved and configured", async () => {
    const response = await GET(new Request("https://www.example.test/api/cron/lead-retention", {
      headers: { Authorization: "Bearer cron-test-secret" }
    }));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Lead retention is not configured."
    });
    expect(deleteExpired).not.toHaveBeenCalled();
  });

  it("deletes rows older than the configured period", async () => {
    vi.stubEnv("LEAD_RETENTION_DAYS", "365");
    deleteExpired.mockResolvedValue(2);
    const response = await GET(new Request("https://www.example.test/api/cron/lead-retention", {
      headers: { Authorization: "Bearer cron-test-secret" }
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, deleted: 2 });
    expect(deleteExpired).toHaveBeenCalledOnce();
  });
});
