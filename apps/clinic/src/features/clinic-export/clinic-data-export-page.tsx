import { Alert, Button, PageHeader } from "@karon/design-system";
import Link from "next/link";

import ClinicDataExport from "@/features/clinic-export/clinic-data-export";
import { redirectForPath } from "@/lib/auth/redirect-for-path";

const ClinicDataExportPage = async () => {
  const access = await redirectForPath("/settings/export");

  if (access.membership?.role !== "owner") {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <PageHeader
          description="Clinic exports contain sensitive information and are restricted to the clinic owner."
          title="Owner access required"
        />
        <Alert title="You do not have permission to export clinic data." variant="danger">
          Ask the clinic owner to download the required file. No export has been created.
        </Alert>
        <Button asChild className="w-fit" variant="outline">
          <Link href="/settings">Back to Settings</Link>
        </Button>
      </section>
    );
  }

  return <ClinicDataExport />;
};

export default ClinicDataExportPage;
