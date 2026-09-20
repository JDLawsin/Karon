import type { ClinicDb } from "@/lib/db/clinic-db";
import { clientLog } from "@/lib/logger/client";
import {
  clinicEventSchema,
  paymentRecordedPayloadSchema,
  type ClinicEvent,
  type PaymentMethod
} from "@/lib/sync/event-schema";

type RecordPaymentInput = {
  tenantId: string;
  actorUserId: string;
  patientId: string;
  visitId: string;
  amountMinor: number;
  currency: string;
  method: PaymentMethod;
  now?: Date;
};

type WriteRemotePaymentEvent = (event: ClinicEvent) => Promise<void>;

const recordPayment = async (
  db: ClinicDb,
  input: RecordPaymentInput,
  writeRemote: WriteRemotePaymentEvent
) => {
  const event = clinicEventSchema.parse({
    id: crypto.randomUUID(),
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    recordId: crypto.randomUUID(),
    occurredAt: (input.now ?? new Date()).toISOString(),
    type: "payment.recorded",
    payload: paymentRecordedPayloadSchema.parse({
      patientId: input.patientId,
      visitId: input.visitId,
      amountMinor: input.amountMinor,
      currency: input.currency,
      method: input.method
    })
  });

  await writeRemote(event);

  try {
    await db.events.put(event);
  } catch {
    clientLog
      .withMetadata({ eventId: event.id, type: event.type })
      .error("payment.local_mirror_failed");
  }

  return event;
};

export { recordPayment };
export type { RecordPaymentInput, WriteRemotePaymentEvent };
