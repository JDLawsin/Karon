import { EmptyState, StatusBadge } from "@karon/design-system";

import {
  VISIT_STATUS_LABEL,
  formatVisitTime
} from "@/features/today-board/project-today-board";
import type { VisitStatus } from "@/lib/sync/event-schema";

type Patient = {
  name: string;
  mobile: string;
  email?: string;
};

type PatientVisit = {
  id: string;
  startsAt: string;
  status: VisitStatus;
  serviceName?: string;
};

type Props = {
  patient: Patient;
  visit?: PatientVisit | null;
  visits: PatientVisit[];
};

const STATUS_TONE: Record<
  VisitStatus,
  "neutral" | "info" | "primary" | "warning" | "success"
> = {
  pending_review: "info",
  confirmed: "neutral",
  waiting: "info",
  in_chair: "primary",
  complete: "success",
  cancelled: "neutral",
  no_show: "warning"
};

const formatVisitDate = (iso: string) =>
  new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila"
  }).format(new Date(iso));

const PatientDetail = ({ patient, visit, visits }: Props) => (
  <div className="flex min-w-0 flex-col gap-5">
    <header className="min-w-0">
      <h2 className="wrap-anywhere text-xl font-semibold">{patient.name}</h2>
      <p className="mt-1 text-sm tabular-nums text-muted-foreground">
        {patient.mobile}
      </p>
      {patient.email ? (
        <p className="wrap-anywhere mt-1 text-sm text-muted-foreground">
          {patient.email}
        </p>
      ) : null}
    </header>

    <section
      aria-labelledby="patient-current-visit-heading"
      className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-4"
    >
      <h3 className="font-semibold" id="patient-current-visit-heading">
        Current visit
      </h3>
      {visit ? (
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <StatusBadge tone={STATUS_TONE[visit.status]}>
            {VISIT_STATUS_LABEL[visit.status]}
          </StatusBadge>
          <span className="text-sm tabular-nums text-muted-foreground">
            {formatVisitTime(visit.startsAt)}
          </span>
          {visit.serviceName ? (
            <span className="min-w-0 text-sm">{visit.serviceName}</span>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No active visit.</p>
      )}
    </section>

    <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-2">
      <EmptyState title="No quote yet">
        Quotes will appear here after they are recorded.
      </EmptyState>
      <EmptyState title="No payments recorded">
        Payment history stays empty until Collect records a payment.
      </EmptyState>
      {visits.length === 0 ? (
        <EmptyState title="No visits yet">
          Visits will appear here after they are scheduled or started.
        </EmptyState>
      ) : (
        <section className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card px-4 py-6">
          <h3 className="text-lg font-semibold">Visit history</h3>
          <ul className="flex min-w-0 flex-col divide-y divide-border">
            {visits.map((item) => (
              <li className="flex min-w-0 flex-col gap-1 py-3 first:pt-0 last:pb-0" key={item.id}>
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {item.serviceName ?? "Visit"}
                  </span>
                  <StatusBadge tone={STATUS_TONE[item.status]}>
                    {VISIT_STATUS_LABEL[item.status]}
                  </StatusBadge>
                </div>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {formatVisitDate(item.startsAt)} · {formatVisitTime(item.startsAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  </div>
);

export default PatientDetail;
export type { PatientVisit };
