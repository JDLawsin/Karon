import type { ClinicDb } from "@/lib/db/clinic-db";
import {
  clinicEventSchema,
  paymentRecordedPayloadSchema,
  type PaymentMethod
} from "@/lib/sync/event-schema";
import { recordClinicEvent } from "@/lib/sync/sync-engine";

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

const recordPayment = async (
  db: ClinicDb,
  input: RecordPaymentInput
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

  await recordClinicEvent(db, event);

  return event;
};

export { recordPayment };
export type { RecordPaymentInput };
