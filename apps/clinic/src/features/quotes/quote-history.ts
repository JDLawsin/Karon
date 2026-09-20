import {
  quoteCreatedPayloadSchema,
  type ClinicEvent,
  type QuoteCreatedPayload
} from "@/lib/sync/event-schema";

type QuoteHistoryEntry = QuoteCreatedPayload & {
  id: string;
  quoteId: string;
  occurredAt: string;
};

const quoteHistoryForPatient = (
  events: readonly ClinicEvent[],
  patientId: string
): QuoteHistoryEntry[] =>
  events
    .flatMap((event) => {
      if (event.type !== "quote.created" || !event.recordId) {
        return [];
      }

      const parsed = quoteCreatedPayloadSchema.safeParse(event.payload);

      if (!parsed.success || parsed.data.patientId !== patientId) {
        return [];
      }

      return [
        {
          id: event.id,
          quoteId: event.recordId,
          occurredAt: event.occurredAt,
          ...parsed.data
        }
      ];
    })
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));

export { quoteHistoryForPatient };
export type { QuoteHistoryEntry };
