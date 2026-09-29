import "server-only";

import type { Entitlement } from "@/features/billing/entitlement";

const TEST_ACCESS_DAYS = 30;

type ManualEntitlementGrant = {
  tenantId: string;
  startsAt: string;
  accessUntil: string;
};

type EnsureDevelopmentEntitlementInput = {
  environment?: NodeJS.ProcessEnv;
  entitlement: Entitlement | null;
  tenantId: string;
  now?: Date;
  grant: (input: ManualEntitlementGrant) => Promise<boolean>;
  reload: () => Promise<Entitlement | null>;
};

const ensureDevelopmentEntitlement = async ({
  environment = process.env,
  entitlement,
  tenantId,
  now = new Date(),
  grant,
  reload
}: EnsureDevelopmentEntitlementInput) => {
  if (
    environment.NODE_ENV !== "development" ||
    environment.KARON_TEST_ACCESS_ENABLED !== "true" ||
    entitlement?.status !== "expired"
  ) {
    return entitlement;
  }

  const accessUntil = new Date(now);
  accessUntil.setUTCDate(accessUntil.getUTCDate() + TEST_ACCESS_DAYS);
  try {
    const granted = await grant({
      tenantId,
      startsAt: now.toISOString(),
      accessUntil: accessUntil.toISOString()
    });

    if (!granted) {
      return entitlement;
    }

    return (await reload()) ?? entitlement;
  } catch {
    return entitlement;
  }
};

export { ensureDevelopmentEntitlement };
export type {
  EnsureDevelopmentEntitlementInput,
  ManualEntitlementGrant
};
