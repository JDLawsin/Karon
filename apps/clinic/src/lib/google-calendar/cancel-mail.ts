// Deferred: Google Calendar — keep for later reconnect

import {
  patientForVisit,
  visitStatusFromEvents
} from "@/features/today-board/project-today-board";
import {
  reminderQueuedPayloadSchema,
  type ClinicEvent
} from "@/lib/sync/event-schema";

const cancelMailTo = (payload: unknown, events: ClinicEvent[]): string | null => {
  const parsed = reminderQueuedPayloadSchema.safeParse(payload);

  if (!parsed.success) {
    return null;
  }

  if (visitStatusFromEvents(events, parsed.data.visitId) !== "cancelled") {
    return null;
  }

  const email = patientForVisit(events, parsed.data.visitId)?.email;

  if (!email || email !== parsed.data.to) {
    return null;
  }

  return parsed.data.to;
};

export { cancelMailTo };
