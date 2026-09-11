import type { ClinicDb } from "@/lib/db/clinic-db";
import {
  patientPayloadSchema,
  type VisitStatus
} from "@/lib/sync/event-schema";
import { recordClinicEvent, recordClinicEvents } from "@/lib/sync/sync-engine";

type WalkInInput = {
  tenantId: string;
  actorUserId: string;
  name: string;
  mobile: string;
  now?: Date;
};

const addWalkIn = async (db: ClinicDb, input: WalkInInput) => {
  const patient = patientPayloadSchema.parse({
    name: input.name,
    mobile: input.mobile
  });
  const patientId = crypto.randomUUID();
  const visitId = crypto.randomUUID();
  const occurredAt = (input.now ?? new Date()).toISOString();

  await recordClinicEvents(db, [
    {
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      recordId: patientId,
      occurredAt,
      type: "patient.created",
      payload: patient
    },
    {
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      recordId: visitId,
      occurredAt,
      type: "appointment.set",
      payload: {
        patientId,
        startsAt: occurredAt,
        status: "waiting"
      }
    }
  ]);

  return { patientId, visitId };
};

const changeVisitStatus = async (
  db: ClinicDb,
  input: {
    tenantId: string;
    actorUserId: string;
    visitId: string;
    status: VisitStatus;
    now?: Date;
  }
) =>
  recordClinicEvent(db, {
    id: crypto.randomUUID(),
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    recordId: input.visitId,
    occurredAt: (input.now ?? new Date()).toISOString(),
    type: "visit.status_changed",
    payload: { status: input.status }
  });

export { addWalkIn, changeVisitStatus };
