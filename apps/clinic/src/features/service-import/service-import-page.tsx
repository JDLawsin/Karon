import { Alert, Button, PageHeader } from "@karon/design-system";
import Link from "next/link";

import ServiceImportWizard from "@/features/service-import/service-import-wizard";
import { redirectForPath } from "@/lib/auth/redirect-for-path";

const ServiceImportPage = async () => {
  const access = await redirectForPath("/settings/import/services");

  if (access.membership?.role !== "owner") {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <PageHeader
          description="Catalog imports change clinic pricing and are restricted to the clinic owner."
          title="Owner access required"
        />
        <Alert title="You do not have permission to import services." variant="danger">
          Ask the clinic owner to run the import. No file has been uploaded.
        </Alert>
        <Button asChild className="w-fit" variant="outline">
          <Link href="/settings">Back to Settings</Link>
        </Button>
      </section>
    );
  }

  return <ServiceImportWizard />;
};

export default ServiceImportPage;
