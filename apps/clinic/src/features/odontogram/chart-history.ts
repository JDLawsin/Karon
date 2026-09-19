import {
  chartAppendedPayloadSchema,
  type ChartAppendedPayload,
  type ClinicEvent
} from "@/lib/sync/event-schema";

type ChartHistoryEntry = ChartAppendedPayload & {
  id: string;
  occurredAt: string;
};

const chartHistoryForPatient = (
  events: readonly ClinicEvent[],
  patientId: string
): ChartHistoryEntry[] =>
  events
    .flatMap((event) => {
      if (event.type !== "chart.appended") {
        return [];
      }

      const parsed = chartAppendedPayloadSchema.safeParse(event.payload);

      if (!parsed.success || parsed.data.patientId !== patientId) {
        return [];
      }

      return [{ id: event.id, occurredAt: event.occurredAt, ...parsed.data }];
    })
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));

export { chartHistoryForPatient };
export type { ChartHistoryEntry };
