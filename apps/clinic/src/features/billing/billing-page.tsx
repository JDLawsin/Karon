import { redirect } from "next/navigation";

import ClinicShell from "@/features/auth/clinic-shell";
import EntitlementScreen from "@/features/billing/entitlement-screen";
import { redirectForPath } from "@/lib/auth/redirect-for-path";
import {
  getBillingConfig,
  publicBillingConfig
} from "@/lib/billing/billing-config";
import type { PublicBillingConfig } from "@/lib/billing/billing-config";

type Props = {
  appVersion: string;
  checkoutNotice?: "returned" | "cancelled" | null;
};

const BillingPage = async ({ appVersion, checkoutNotice = null }: Props) => {
  const access = await redirectForPath("/billing");

  if (!access.membership || !access.userId) {
    redirect("/login");
  }

  let billingConfig: PublicBillingConfig = { checkoutEnabled: false };

  try {
    billingConfig = publicBillingConfig(getBillingConfig());
  } catch {
    // Fail closed: a partial billing configuration never renders a payment action.
  }

  return (
    <ClinicShell
      appVersion={appVersion}
      cloudSyncEnabled={access.entitlement?.hasAccess === true}
      membership={access.membership}
      sessionActive={access.sessionActive}
      userId={access.userId}
    >
      <EntitlementScreen
        billingConfig={billingConfig}
        checkoutNotice={checkoutNotice}
        entitlement={access.entitlement}
        role={access.membership.role}
      />
    </ClinicShell>
  );
};

export default BillingPage;
