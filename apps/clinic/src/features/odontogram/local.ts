import type { ClinicDb } from "@/lib/db/clinic-db";
import {
  chartAppendedPayloadSchema,
  clinicEventSchema,
  type AdultFdiToothCode,
  type ChartFinding
} from "@/lib/sync/event-schema";
import { recordClinicEvent } from "@/lib/sync/sync-engine";

type AppendChartEntryInput = {
  tenantId: string;
  actorUserId: string;
  patientId: string;
  visitId: string;
  toothCode: AdultFdiToothCode;
  finding: ChartFinding;
  note: string;
  now?: Date;
};

const appendChartEntry = async (
  db: ClinicDb,
  input: AppendChartEntryInput
) => {
  const event = clinicEventSchema.parse({
    id: crypto.randomUUID(),
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    recordId: crypto.randomUUID(),
    occurredAt: (input.now ?? new Date()).toISOString(),
    type: "chart.appended",
    payload: chartAppendedPayloadSchema.parse({
      patientId: input.patientId,
      visitId: input.visitId,
      toothCode: input.toothCode,
      finding: input.finding,
      note: input.note
    })
  });

  await recordClinicEvent(db, event);

  return event;
};

export { appendChartEntry };
export type { AppendChartEntryInput };
