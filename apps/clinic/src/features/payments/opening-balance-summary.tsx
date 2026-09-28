import { Card, CardContent, CardHeader, StatusBadge } from "@karon/design-system";

import { formatServicePrice } from "@/features/services/service-money";
import {
  openingBalanceNotedPayloadSchema,
  type ClinicEvent
} from "@/lib/sync/event-schema";

type Props = {
  events: readonly ClinicEvent[];
  locale: string;
  patientId: string;
};

const OpeningBalanceSummary = ({ events, locale, patientId }: Props) => {
  const notes = events.flatMap((event) => {
    if (event.type !== "opening_balance.noted" || event.recordId !== patientId) {
      return [];
    }

    const payload = openingBalanceNotedPayloadSchema.safeParse(event.payload);
    return payload.success
      ? [{ id: event.id, occurredAt: event.occurredAt, ...payload.data }]
      : [];
  }).sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));

  if (notes.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Opening balance</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Starting notes only — not accounts receivable or payment history.
          </p>
        </div>
        <StatusBadge tone="warning">Not reconciled</StatusBadge>
      </CardHeader>
      <CardContent>
        <ul className="flex min-w-0 flex-col divide-y divide-border">
          {notes.map((note) => (
            <li className="flex min-w-0 flex-col gap-1 py-3 first:pt-0 last:pb-0" key={note.id}>
              <p className="text-xl font-semibold tabular-nums">
                {formatServicePrice(note.amountMinor, note.currency, locale)}
              </p>
              <p className="wrap-anywhere text-sm text-muted-foreground">{note.note}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default OpeningBalanceSummary;
