import { redirect } from "next/navigation";

import ClinicShell from "@/features/auth/clinic-shell";
import EntitlementScreen from "@/features/billing/entitlement-screen";
import { redirectForPath } from "@/lib/auth/redirect-for-path";

type Props = {
  appVersion: string;
};

const BillingPage = async ({ appVersion }: Props) => {
  const access = await redirectForPath("/billing");

  if (!access.membership || !access.userId) {
    redirect("/login");
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
        entitlement={access.entitlement}
        role={access.membership.role}
      />
    </ClinicShell>
  );
};

export default BillingPage;
