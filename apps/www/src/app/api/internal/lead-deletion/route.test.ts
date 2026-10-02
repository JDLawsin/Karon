import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const deleteByEmail = vi.fn();

vi.mock("@karon/db", async (importOriginal) => {
  const original = await importOriginal<typeof import("@karon/db")>();
  return {
    ...original,
    createMarketingLeadStore: () => ({ deleteByEmail })
  };
});

import { DELETE } from "./route";

const request = (body: unknown, secret = "deletion-test-secret") => new Request(
  "https://www.example.test/api/internal/lead-deletion",
  {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  }
);

describe("verified lead deletion path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("LEAD_DELETION_SECRET", "deletion-test-secret");
    vi.stubEnv("DATABASE_URL", "postgres://unused.example.test/database");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects an invalid secret and malformed email", async () => {
    expect((await DELETE(request({ email: "dentist@example.test" }, "wrong"))).status).toBe(401);
    expect((await DELETE(request({ email: "not-an-email" }))).status).toBe(400);
    expect(deleteByEmail).not.toHaveBeenCalled();
  });

  it("removes every lead row for the verified email", async () => {
    deleteByEmail.mockResolvedValue(1);
    const response = await DELETE(request({ email: " Dentist@Example.Test " }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, deleted: 1 });
    expect(deleteByEmail).toHaveBeenCalledWith("dentist@example.test");
  });
});
