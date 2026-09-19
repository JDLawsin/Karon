import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import {
  hasActiveVisitAt,
  nextVisitDraftSchema
} from "@/features/patients/next-visit";
import type { ClinicDb } from "@/lib/db/clinic-db";
import { clientLog } from "@/lib/logger/client";
import {
  clinicEventRowSchema,
  clinicEventSchema,
  toClinicEvent
} from "@/lib/sync/event-schema";

type SaveNextVisitInput = {
  tenantId: string;
  actorUserId: string;
  patientId: string;
  date: string;
  time: string;
  serviceName: string;
  allowOverbook?: boolean;
  now?: Date;
};

const eventColumns =
  "id, tenant_id, actor_user_id, event_type, record_id, payload, occurred_at, received_at";
const bookingRequestRowsSchema = z.array(
  z.object({ starts_at: z.iso.datetime({ offset: true }) })
);

const readOccupancy = async (
  supabase: SupabaseClient,
  tenantId: string,
  startsAt: string
) => {
  const [eventsResult, requestsResult] = await Promise.all([
    supabase
      .from("clinic_events")
      .select(eventColumns)
      .eq("tenant_id", tenantId)
      .in("event_type", ["appointment.set", "visit.status_changed"]),
    supabase
      .from("booking_requests")
      .select("starts_at")
      .eq("tenant_id", tenantId)
      .eq("starts_at", startsAt)
      .in("status", ["pending", "accepted"])
  ]);

  if (eventsResult.error || requestsResult.error) {
    throw new Error("Could not check the clinic schedule.");
  }

  try {
    return {
      events: (eventsResult.data ?? []).map((row) =>
        toClinicEvent(clinicEventRowSchema.parse(row))
      ),
      bookingRequestOccupied:
        bookingRequestRowsSchema.parse(requestsResult.data ?? []).length > 0
    };
  } catch {
    throw new Error("Could not check the clinic schedule.");
  }
};

const saveNextVisit = async (
  db: ClinicDb,
  supabase: SupabaseClient,
  input: SaveNextVisitInput & { startsAt: string }
) => {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error(
      "Next visits need an internet connection until offline scheduling ships."
    );
  }

  const draft = nextVisitDraftSchema.parse({
    date: input.date,
    time: input.time,
    serviceName: input.serviceName
  });
  const occupancy = await readOccupancy(
    supabase,
    input.tenantId,
    input.startsAt
  );

  if (
    !input.allowOverbook &&
    (occupancy.bookingRequestOccupied ||
      hasActiveVisitAt(occupancy.events, input.startsAt))
  ) {
    return { status: "conflict" as const };
  }

  const event = clinicEventSchema.parse({
    id: crypto.randomUUID(),
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    recordId: crypto.randomUUID(),
    occurredAt: (input.now ?? new Date()).toISOString(),
    type: "appointment.set",
    payload: {
      patientId: input.patientId,
      startsAt: input.startsAt,
      status: "confirmed",
      serviceName: draft.serviceName
    }
  });
  const { error } = await supabase
    .from("clinic_events")
    .insert({
      id: event.id,
      tenant_id: event.tenantId,
      actor_user_id: event.actorUserId,
      event_type: event.type,
      record_id: event.recordId,
      payload: event.payload,
      occurred_at: event.occurredAt
    });

  if (error) {
    throw new Error("Could not save the next visit. Check the connection and try again.");
  }

  try {
    await db.events.put(event);
  } catch {
    clientLog
      .withMetadata({ eventId: event.id, type: event.type })
      .error("next_visit.local_mirror_failed");
  }

  return { status: "saved" as const, event };
};

export { saveNextVisit };
