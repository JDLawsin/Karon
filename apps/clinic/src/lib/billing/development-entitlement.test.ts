import { describe, expect, it, vi } from "vitest";

import type { Entitlement } from "@/features/billing/entitlement";

import { ensureDevelopmentEntitlement } from "./development-entitlement";

const expiredEntitlement: Entitlement = {
  status: "expired",
  source: "trial",
  startsAt: "2026-09-01T00:00:00.000Z",
  endsAt: "2026-09-08T00:00:00.000Z",
  daysRemaining: 0,
  hasAccess: false
};

const manualEntitlement: Entitlement = {
  status: "active",
  source: "manual",
  startsAt: "2026-09-29T00:00:00.000Z",
  endsAt: "2026-10-29T00:00:00.000Z",
  daysRemaining: 30,
  hasAccess: true
};

const input = (
  environment: NodeJS.ProcessEnv,
  overrides: Partial<Parameters<typeof ensureDevelopmentEntitlement>[0]> = {}
) => ({
  environment,
  entitlement: expiredEntitlement,
  grant: vi.fn().mockResolvedValue(true),
  now: new Date("2026-09-29T00:00:00.000Z"),
  reload: vi.fn().mockResolvedValue(manualEntitlement),
  tenantId: "11111111-1111-4111-8111-111111111111",
  ...overrides
});

describe("ensureDevelopmentEntitlement", () => {
  it.each([undefined, "false"])(
    "keeps normal access rules when the switch is %s",
    async (enabled) => {
      const grant = vi.fn().mockResolvedValue(true);
      const reload = vi.fn().mockResolvedValue(manualEntitlement);

      await expect(
        ensureDevelopmentEntitlement(
          input({
            NODE_ENV: "development",
            KARON_TEST_ACCESS_ENABLED: enabled
          }, { grant, reload })
        )
      ).resolves.toEqual(expiredEntitlement);
      expect(grant).not.toHaveBeenCalled();
      expect(reload).not.toHaveBeenCalled();
    }
  );

  it("ignores the switch in production", async () => {
    const grant = vi.fn().mockResolvedValue(true);

    await expect(
      ensureDevelopmentEntitlement(
        input(
          { NODE_ENV: "production", KARON_TEST_ACCESS_ENABLED: "true" },
          { grant }
        )
      )
    ).resolves.toEqual(expiredEntitlement);
    expect(grant).not.toHaveBeenCalled();
  });

  it.each(["trialing", "active", "past_due"] as const)(
    "does not rewrite a %s entitlement",
    async (status) => {
      const entitlement: Entitlement = {
        ...manualEntitlement,
        status,
        hasAccess: true
      };
      const grant = vi.fn().mockResolvedValue(true);

      await expect(
        ensureDevelopmentEntitlement(
          input(
            { NODE_ENV: "development", KARON_TEST_ACCESS_ENABLED: "true" },
            { entitlement, grant }
          )
        )
      ).resolves.toEqual(entitlement);
      expect(grant).not.toHaveBeenCalled();
    }
  );

  it("grants 30 days and returns the entitlement reloaded from the server", async () => {
    const grant = vi.fn().mockResolvedValue(true);
    const reload = vi.fn().mockResolvedValue(manualEntitlement);

    await expect(
      ensureDevelopmentEntitlement(
        input(
          { NODE_ENV: "development", KARON_TEST_ACCESS_ENABLED: "true" },
          { grant, reload }
        )
      )
    ).resolves.toEqual(manualEntitlement);
    expect(grant).toHaveBeenCalledWith({
      accessUntil: "2026-10-29T00:00:00.000Z",
      startsAt: "2026-09-29T00:00:00.000Z",
      tenantId: "11111111-1111-4111-8111-111111111111"
    });
    expect(reload).toHaveBeenCalledOnce();
  });

  it("fails closed when the grant cannot be stored", async () => {
    const reload = vi.fn().mockResolvedValue(manualEntitlement);

    await expect(
      ensureDevelopmentEntitlement(
        input(
          { NODE_ENV: "development", KARON_TEST_ACCESS_ENABLED: "true" },
          { grant: vi.fn().mockResolvedValue(false), reload }
        )
      )
    ).resolves.toEqual(expiredEntitlement);
    expect(reload).not.toHaveBeenCalled();
  });

  it("fails closed when the grant throws", async () => {
    const reload = vi.fn().mockResolvedValue(manualEntitlement);

    await expect(
      ensureDevelopmentEntitlement(
        input(
          { NODE_ENV: "development", KARON_TEST_ACCESS_ENABLED: "true" },
          {
            grant: vi.fn().mockRejectedValue(new Error("Unavailable")),
            reload
          }
        )
      )
    ).resolves.toEqual(expiredEntitlement);
    expect(reload).not.toHaveBeenCalled();
  });

  it("fails closed when the reloaded entitlement is missing", async () => {
    await expect(
      ensureDevelopmentEntitlement(
        input(
          { NODE_ENV: "development", KARON_TEST_ACCESS_ENABLED: "true" },
          { reload: vi.fn().mockResolvedValue(null) }
        )
      )
    ).resolves.toEqual(expiredEntitlement);
  });

  it("fails closed when reloading throws", async () => {
    await expect(
      ensureDevelopmentEntitlement(
        input(
          { NODE_ENV: "development", KARON_TEST_ACCESS_ENABLED: "true" },
          { reload: vi.fn().mockRejectedValue(new Error("Unavailable")) }
        )
      )
    ).resolves.toEqual(expiredEntitlement);
  });
});
