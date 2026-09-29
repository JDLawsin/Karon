import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader
} from "@karon/design-system";
import { Download } from "lucide-react";

import {
  exportKinds,
  type ClinicExportKind
} from "@/features/clinic-export/clinic-export";

const exportLabels: Record<ClinicExportKind, string> = {
  patients: "Patients",
  appointments: "Appointments",
  payments: "Payments"
};

const ClinicDataExport = () => {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <PageHeader
        description="Download portable CSV copies of the clinic's patient, appointment, and payment records."
        title="Export clinic data"
      />

      <Alert
        title="Exports contain sensitive clinic data. Store downloaded files securely."
        variant="info"
      >
        Every export is recorded in the clinic audit history. Only the clinic owner can export.
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>CSV exports</CardTitle>
          <CardDescription>
            Each file contains all available records for this clinic. Your browser shows download
            progress while large files are streamed in pages.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {exportKinds.map((kind) => (
              <li
                className="flex min-w-0 flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                key={kind}
              >
                <div className="min-w-0">
                  <h2 className="font-medium">{exportLabels[kind]}</h2>
                  <p className="text-sm text-muted-foreground">
                    {kind === "patients"
                      ? "Names and clinic contact details."
                      : kind === "appointments"
                        ? "Visit dates, current statuses, services, and notes."
                        : "Amounts, currencies, methods, and linked appointments."}
                  </p>
                </div>
                <Button asChild className="w-full shrink-0 sm:w-auto" variant="outline">
                  <a href={`/api/exports/${kind}`}>
                    <Download aria-hidden />
                    Export {kind}
                  </a>
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
};

export default ClinicDataExport;
