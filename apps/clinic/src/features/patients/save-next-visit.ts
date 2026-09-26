import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import {
  hasActiveVisitAt,
  nextVisitDraftSchema
} from "@/features/patients/next-visit";
import type { ClinicDb } from "@/lib/db/clinic-db";
import {
  clinicEventRowSchema,
  clinicEventSchema,
  toClinicEvent
} from "@/lib/sync/event-schema";
import { recordClinicEvent } from "@/lib/sync/sync-engine";

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
  const draft = nextVisitDraftSchema.parse({
    date: input.date,
    time: input.time,
    serviceName: input.serviceName
  });
  const localEvents = await db.events.toArray();
  const online = typeof navigator === "undefined" || navigator.onLine;
  const occupancy = online
    ? await readOccupancy(supabase, input.tenantId, input.startsAt)
    : { events: [], bookingRequestOccupied: false };

  if (
    !input.allowOverbook &&
    (occupancy.bookingRequestOccupied ||
      hasActiveVisitAt(
        [...localEvents, ...occupancy.events],
        input.startsAt
      ))
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
  await recordClinicEvent(db, event);

  return { status: "saved" as const, event };
};

export { saveNextVisit };
