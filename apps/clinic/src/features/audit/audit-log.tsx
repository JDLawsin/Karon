import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader
} from "@karon/design-system";

import type { AuditEvent } from "@/features/audit/audit-log-data";
import { formatClinicDateTime } from "@/lib/clinic/regional-settings";

const eventLabels: Record<string, string> = {
  "patient.created": "Patient created",
  "patient.updated": "Patient updated",
  "appointment.set": "Appointment set",
  "chart.appended": "Chart entry added",
  "quote.created": "Quote created",
  "payment.recorded": "Payment recorded",
  "import.started": "Import started",
  "import.completed": "Import completed",
  "import.failed": "Import failed",
  "export.started": "Export started",
  "export.completed": "Export completed",
  "export.failed": "Export failed"
};

type Props = {
  events: readonly AuditEvent[];
  locale: string;
  timezone: string;
};

const metadataString = (event: AuditEvent, key: string) => {
  const value = event.metadata[key];
  return typeof value === "string" ? value : null;
};

const eventSummary = (event: AuditEvent) => {
  const patientId = metadataString(event, "patient_id");
  const visitId = metadataString(event, "visit_id");
  const status = metadataString(event, "status");
  const parts = [
    patientId ? `Patient ${patientId}` : null,
    visitId ? `Visit ${visitId}` : null,
    status ? `Status ${status}` : null
  ].filter((part): part is string => Boolean(part));

  return parts.join(" · ") || "Metadata only; no patient content stored.";
};

const AuditLog = ({ events, locale, timezone }: Props) => (
  <section className="mx-auto flex w-full max-w-5xl flex-col gap-4">
    <PageHeader
      description="Owner-only history of committed clinic actions. Audit entries store identifiers and action metadata, not patient content."
      title="Recent audit activity"
    />

    {events.length === 0 ? (
      <EmptyState title="No audit activity yet">
        Committed clinic actions will appear here.
      </EmptyState>
    ) : (
      <ol className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
        {events.map((event) => (
          <li className="min-w-0" key={event.id}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle>
                  {eventLabels[event.event_type] ?? event.event_type}
                </CardTitle>
                <CardDescription>
                  <time dateTime={event.created_at}>
                    {formatClinicDateTime(event.created_at, { locale, timezone })}
                  </time>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {eventSummary(event)}
                </p>
                <dl className="grid min-w-0 grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <div className="min-w-0">
                    <dt className="text-muted-foreground">Actor</dt>
                    <dd className="break-all font-mono text-xs">
                      {event.actor_user_id ?? "System"}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-muted-foreground">Entity</dt>
                    <dd className="break-all font-mono text-xs">
                      {event.record_id ?? "None"}
                    </dd>
                  </div>
                  <div className="min-w-0 sm:col-span-2">
                    <dt className="text-muted-foreground">Clinic</dt>
                    <dd className="break-all font-mono text-xs">
                      {event.tenant_id}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>
    )}
  </section>
);

export default AuditLog;
