import { Alert, Button, PageHeader } from "@karon/design-system";
import Link from "next/link";

import PatientImportWizard from "@/features/patient-import/patient-import-wizard";
import { redirectForPath } from "@/lib/auth/redirect-for-path";

const PatientImportPage = async () => {
  const access = await redirectForPath("/settings/import");

  if (access.membership?.role !== "owner") {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <PageHeader
          description="Patient and opening-balance imports contain sensitive information and are restricted to the clinic owner."
          title="Owner access required"
        />
        <Alert title="You do not have permission to import clinic data." variant="danger">
          Ask the clinic owner to run the import. No file has been uploaded.
        </Alert>
        <Button asChild className="w-fit" variant="outline">
          <Link href="/settings">Back to Settings</Link>
        </Button>
      </section>
    );
  }

  return <PatientImportWizard />;
};

export default PatientImportPage;
