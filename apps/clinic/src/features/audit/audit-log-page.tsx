import { Alert, Button, PageHeader } from "@karon/design-system";
import Link from "next/link";

import AuditLog from "@/features/audit/audit-log";
import { getRecentAuditEvents } from "@/features/audit/audit-log-data";
import { redirectForPath } from "@/lib/auth/redirect-for-path";
import { clinicRegionalSettingsRowSchema } from "@/lib/clinic/regional-settings";

const AuditLogPage = async () => {
  const access = await redirectForPath("/settings/audit");

  if (access.membership?.role !== "owner") {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <PageHeader
          description="Audit history is restricted to the clinic owner."
          title="Owner access required"
        />
        <Alert
          title="You do not have permission to view clinic audit activity."
          variant="danger"
        >
          Ask the clinic owner if an action needs to be reviewed.
        </Alert>
        <Button asChild className="w-fit" variant="outline">
          <Link href="/settings">Back to Settings</Link>
        </Button>
      </section>
    );
  }

  const [events, regionalResult] = await Promise.all([
    getRecentAuditEvents(access.supabase, access.membership.tenantId),
    access.supabase
      .from("clinics")
      .select("currency_code, locale, timezone")
      .eq("id", access.membership.tenantId)
      .single()
  ]);

  if (regionalResult.error) {
    throw new Error("Could not load clinic regional settings.");
  }

  const regional = clinicRegionalSettingsRowSchema.parse(regionalResult.data);

  return (
    <AuditLog
      events={events}
      locale={regional.locale}
      timezone={regional.timezone}
    />
  );
};

export default AuditLogPage;
