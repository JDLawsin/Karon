import { z } from "zod";

import {
  paymentRecordedPayloadSchema,
  quoteCreatedPayloadSchema,
  type ClinicEvent
} from "@/lib/sync/event-schema";

const visitBalanceRowSchema = z
  .object({
    quote_id: z.string().uuid(),
    quote_total_minor: z.number().int().nonnegative(),
    paid_minor: z.number().int().nonnegative(),
    remaining_minor: z.number().int().nonnegative(),
    currency: z.string().regex(/^[A-Z]{3}$/)
  })
  .strict();

type CollectBalance = {
  quoteId: string;
  quoteTotalMinor: number;
  paidMinor: number;
  remainingMinor: number;
  currency: string;
};

const collectBalanceSnapshotKey = (patientId: string, visitId: string) =>
  `collectBalance:${patientId}:${visitId}`;

const collectBalanceSchema = z
  .object({
    quoteId: z.string().uuid(),
    quoteTotalMinor: z.number().int().nonnegative(),
    paidMinor: z.number().int().nonnegative(),
    remainingMinor: z.number().int().nonnegative(),
    currency: z.string().regex(/^[A-Z]{3}$/)
  })
  .strict();

const parseCollectBalance = (value: unknown): CollectBalance => {
  const row = visitBalanceRowSchema.parse(value);

  return {
    quoteId: row.quote_id,
    quoteTotalMinor: row.quote_total_minor,
    paidMinor: row.paid_minor,
    remainingMinor: row.remaining_minor,
    currency: row.currency
  };
};

const collectBalanceForVisit = (
  events: readonly ClinicEvent[],
  patientId: string,
  visitId: string
): CollectBalance | null => {
  const quote = events
    .flatMap((event) => {
      if (event.type !== "quote.created" || !event.recordId) {
        return [];
      }

      const payload = quoteCreatedPayloadSchema.safeParse(event.payload);
      return payload.success &&
        payload.data.patientId === patientId &&
        payload.data.visitId === visitId
        ? [{ event, payload: payload.data, quoteId: event.recordId }]
        : [];
    })
    .sort((left, right) =>
      right.event.occurredAt.localeCompare(left.event.occurredAt) ||
      right.event.id.localeCompare(left.event.id)
    )[0];

  if (!quote) {
    return null;
  }

  const paidMinor = events.reduce((total, event) => {
    if (event.type !== "payment.recorded") {
      return total;
    }

    const payload = paymentRecordedPayloadSchema.safeParse(event.payload);
    return payload.success &&
      payload.data.patientId === patientId &&
      payload.data.visitId === visitId &&
      payload.data.currency === quote.payload.currency &&
      payload.data.method !== "unpaid"
      ? total + payload.data.amountMinor
      : total;
  }, 0);

  return {
    quoteId: quote.quoteId,
    quoteTotalMinor: quote.payload.totalMinor,
    paidMinor,
    remainingMinor: Math.max(quote.payload.totalMinor - paidMinor, 0),
    currency: quote.payload.currency
  };
};

const applyPendingPayments = (
  balance: CollectBalance,
  events: readonly ClinicEvent[],
  pendingIds: ReadonlySet<string>,
  patientId: string,
  visitId: string
): CollectBalance => {
  const pendingMinor = events.reduce((total, event) => {
    if (event.type !== "payment.recorded" || !pendingIds.has(event.id)) {
      return total;
    }

    const payload = paymentRecordedPayloadSchema.safeParse(event.payload);
    return payload.success &&
      payload.data.patientId === patientId &&
      payload.data.visitId === visitId &&
      payload.data.currency === balance.currency &&
      payload.data.method !== "unpaid"
      ? total + payload.data.amountMinor
      : total;
  }, 0);

  return {
    ...balance,
    paidMinor: balance.paidMinor + pendingMinor,
    remainingMinor: Math.max(balance.remainingMinor - pendingMinor, 0)
  };
};

const parseCollectBalanceSnapshot = (value: string | undefined) => {
  if (!value) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(value);
    const balance = collectBalanceSchema.safeParse(parsed);
    return balance.success ? balance.data : null;
  } catch {
    return null;
  }
};

export {
  applyPendingPayments,
  collectBalanceSnapshotKey,
  collectBalanceForVisit,
  parseCollectBalance,
  parseCollectBalanceSnapshot
};
export type { CollectBalance };
