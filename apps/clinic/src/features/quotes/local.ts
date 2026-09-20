import type { ClinicDb } from "@/lib/db/clinic-db";
import { clientLog } from "@/lib/logger/client";
import {
  clinicEventSchema,
  quoteCreatedPayloadSchema,
  type ClinicEvent,
  type QuoteLine
} from "@/lib/sync/event-schema";

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

type WriteRemoteQuoteEvent = (event: ClinicEvent) => Promise<void>;

const createQuote = async (
  db: ClinicDb,
  input: CreateQuoteInput,
  writeRemote: WriteRemoteQuoteEvent
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

  await writeRemote(event);

  try {
    await db.events.put(event);
  } catch {
    clientLog
      .withMetadata({ eventId: event.id, type: event.type })
      .error("quote.local_mirror_failed");
  }

  return event;
};

export { createQuote };
export type { CreateQuoteInput, WriteRemoteQuoteEvent };
