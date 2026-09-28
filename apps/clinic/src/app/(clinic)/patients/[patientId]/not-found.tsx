import { Button, EmptyState, PageHeader } from "@karon/design-system";
import Link from "next/link";

const PatientNotFound = () => (
  <div className="flex min-w-0 flex-col gap-4">
    <title>Page not found | Karon</title>
    <PageHeader title="Page not found">
      <Button asChild>
        <Link href="/patients">View patients</Link>
      </Button>
      <Button asChild variant="outline">
        <Link href="/today">Return to Today</Link>
      </Button>
    </PageHeader>
    <EmptyState title="This patient address is not valid">
      Open the patient from Patients and try again.
    </EmptyState>
  </div>
);

export default PatientNotFound;
