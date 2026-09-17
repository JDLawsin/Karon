import type { ClinicDb } from "@/lib/db/clinic-db";
import { patientPayloadSchema } from "@/lib/sync/event-schema";
import { recordClinicEvent } from "@/lib/sync/sync-engine";

type PatientDraft = {
  name: string;
  mobile: string;
  email?: string;
};

type SavePatientInput = PatientDraft & {
  tenantId: string;
  actorUserId: string;
  patientId?: string;
  now?: Date;
};

const savePatient = async (db: ClinicDb, input: SavePatientInput) => {
  const patientId = input.patientId ?? crypto.randomUUID();

  await recordClinicEvent(db, {
    id: crypto.randomUUID(),
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    recordId: patientId,
    occurredAt: (input.now ?? new Date()).toISOString(),
    type: input.patientId ? "patient.updated" : "patient.created",
    payload: patientPayloadSchema.parse({
      name: input.name,
      mobile: input.mobile,
      ...(input.email ? { email: input.email } : {})
    })
  });

  return patientId;
};

export { savePatient };
export type { PatientDraft, SavePatientInput };
