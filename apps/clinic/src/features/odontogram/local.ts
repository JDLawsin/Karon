import type { ClinicDb } from "@/lib/db/clinic-db";
import { clientLog } from "@/lib/logger/client";
import {
  chartAppendedPayloadSchema,
  clinicEventSchema,
  type AdultFdiToothCode,
  type ChartFinding,
  type ClinicEvent
} from "@/lib/sync/event-schema";

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

type WriteRemoteChartEvent = (event: ClinicEvent) => Promise<void>;

const appendChartEntry = async (
  db: ClinicDb,
  input: AppendChartEntryInput,
  writeRemote: WriteRemoteChartEvent
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

  await writeRemote(event);

  try {
    await db.events.put(event);
  } catch {
    clientLog
      .withMetadata({ eventId: event.id, type: event.type })
      .error("chart.local_mirror_failed");
  }

  return event;
};

export { appendChartEntry };
export type { AppendChartEntryInput, WriteRemoteChartEvent };
