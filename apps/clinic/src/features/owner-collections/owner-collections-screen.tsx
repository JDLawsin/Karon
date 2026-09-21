import {
  Button,
  Card,
  CardContent,
  CardHeader,
  EmptyState,
  Input,
  Label,
  PageHeader
} from "@karon/design-system";

import type { CollectionsReport } from "@/features/owner-collections/owner-collections";
import { formatServicePrice } from "@/features/services/service-money";

type Props = {
  report: CollectionsReport;
};

const METHOD_LABELS = {
  cash: "Cash",
  gcash: "GCash",
  maya: "Maya",
  card: "Card",
  other: "Other",
  unpaid: "Unpaid"
} as const;

const formatClinicDay = (day: string) =>
  new Intl.DateTimeFormat("en-PH", {
    dateStyle: "long",
    timeZone: "UTC"
  }).format(new Date(`${day}T00:00:00Z`));

const OwnerCollectionsScreen = ({ report }: Props) => {
  const methodRows = [
    { label: METHOD_LABELS.cash, amount: report.methods.cash },
    { label: METHOD_LABELS.gcash, amount: report.methods.gcash },
    { label: METHOD_LABELS.maya, amount: report.methods.maya },
    { label: METHOD_LABELS.card, amount: report.methods.card },
    { label: METHOD_LABELS.other, amount: report.methods.other },
    { label: METHOD_LABELS.unpaid, amount: report.methods.unpaid }
  ].filter(({ amount }) => amount > 0);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        description={`Paid and outstanding payment records for ${formatClinicDay(report.day)} in ${report.timezone}.`}
        title="Daily collections"
      >
        <form className="flex min-w-0 flex-wrap items-end gap-2" method="get">
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor="collections-day">Clinic day</Label>
            <Input
              className="min-w-0"
              defaultValue={report.day}
              id="collections-day"
              max={report.clinicToday}
              min="2000-01-01"
              name="day"
              required
              type="date"
            />
          </div>
          <Button type="submit">View day</Button>
        </form>
      </PageHeader>

      {report.paymentCount === 0 ? (
        <EmptyState title="No collections for this day">
          No payments or unpaid balances were recorded on this clinic day.
        </EmptyState>
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
          <section aria-labelledby="collections-summary-heading">
            <h2 className="sr-only" id="collections-summary-heading">
              Collection summary
            </h2>
            <dl className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
              <Card>
                <dt className="text-sm text-muted-foreground">Paid</dt>
                <dd className="wrap-anywhere text-2xl font-semibold tabular-nums">
                  {formatServicePrice(report.paidMinor, report.currency)}
                </dd>
              </Card>
              <Card>
                <dt className="text-sm text-muted-foreground">Outstanding</dt>
                <dd className="wrap-anywhere text-2xl font-semibold tabular-nums">
                  {formatServicePrice(report.outstandingMinor, report.currency)}
                </dd>
              </Card>
            </dl>
          </section>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Method mix</h2>
              <p className="text-sm text-muted-foreground tabular-nums">
                {report.paymentCount} {report.paymentCount === 1 ? "record" : "records"}
              </p>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-border">
                {methodRows.map(({ label, amount }) => (
                  <div
                    className="flex min-w-0 items-baseline justify-between gap-4 py-3 first:pt-0 last:pb-0"
                    key={label}
                  >
                    <dt className="text-sm text-muted-foreground">{label}</dt>
                    <dd className="wrap-anywhere text-right font-semibold tabular-nums">
                      {formatServicePrice(amount, report.currency)}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default OwnerCollectionsScreen;
