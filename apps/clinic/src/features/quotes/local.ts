import type { ClinicDb } from "@/lib/db/clinic-db";
import {
  clinicEventSchema,
  quoteCreatedPayloadSchema,
  type QuoteLine
} from "@/lib/sync/event-schema";
import { recordClinicEvent } from "@/lib/sync/sync-engine";

type CreateQuoteInput = {
  tenantId: string;
  actorUserId: string;
  patientId: string;
  visitId: string;
  lines: QuoteLine[];
  totalMinor: number;
  currency: string;
  now?: Date;
};

const createQuote = async (
  db: ClinicDb,
  input: CreateQuoteInput
) => {
  const event = clinicEventSchema.parse({
    id: crypto.randomUUID(),
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    recordId: crypto.randomUUID(),
    occurredAt: (input.now ?? new Date()).toISOString(),
    type: "quote.created",
    payload: quoteCreatedPayloadSchema.parse({
      patientId: input.patientId,
      visitId: input.visitId,
      status: "accepted",
      lines: input.lines,
      totalMinor: input.totalMinor,
      currency: input.currency
    })
  });

  await recordClinicEvent(db, event);

  return event;
};

export { createQuote };
export type { CreateQuoteInput };
