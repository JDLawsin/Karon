import type { SupabaseClient } from "@supabase/supabase-js";

import { type ClinicDb } from "@/lib/db/clinic-db";
import { clientLog } from "@/lib/logger/client";
import {
  clinicEventRowSchema,
  clinicEventSchema,
  toClinicEvent,
  type ClinicEvent
} from "@/lib/sync/event-schema";

const PULL_PAGE = 100;
const LAST_PULL_KEY = "lastPullReceivedAt";

let drainLock: Promise<void> | null = null;

const toInsertRow = (event: ClinicEvent) => ({
  id: event.id,
  tenant_id: event.tenantId,
  actor_user_id: event.actorUserId,
  event_type: event.type,
  record_id: event.recordId,
  payload: event.payload,
  occurred_at: event.occurredAt
});

const isRetryLater = (error: { message: string; code?: string }) => {
  const message = error.message.toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    error.code === "PGRST301" ||
    error.code === "401" ||
    error.code === "403"
  );
};

const recordClinicEvents = async (db: ClinicDb, inputs: unknown[]) => {
  const events = inputs.map((input) => clinicEventSchema.parse(input));

  await db.transaction("rw", db.events, db.outbox, async () => {
    for (const event of events) {
      const existing = await db.events.get(event.id);

      if (existing) {
        continue;
      }

      await db.events.add(event);
      await db.outbox.add({
        id: event.id,
        tenantId: event.tenantId,
        createdAt: event.occurredAt,
        attempts: 0
      });
    }
  });

  return events;
};

const recordClinicEvent = async (db: ClinicDb, input: unknown) => {
  const events = await recordClinicEvents(db, [input]);
  const event = events[0];

  if (!event) {
    throw new Error("recordClinicEvent expected one event");
  }

  return event;
};

const applyRemoteEvent = async (db: ClinicDb, event: ClinicEvent) => {
  const existing = await db.events.get(event.id);

  if (existing) {
    return;
  }

  await db.events.add(event);
};

const runDrain = async (db: ClinicDb, supabase: SupabaseClient) => {
  if (!db.isOpen()) {
    return;
  }

  const pending = await db.outbox.orderBy("createdAt").toArray();

  for (const item of pending) {
    if (!db.isOpen()) {
      return;
    }

    const row = await db.events.get(item.id);
    const parsed = row ? clinicEventSchema.safeParse(row) : null;

    if (!parsed?.success) {
      clientLog.withMetadata({ eventId: item.id }).error("sync.drain_invalid");
      await db.outbox.update(item.id, { attempts: item.attempts + 1 });
      continue;
    }

    const { error } = await supabase.from("clinic_events").upsert(toInsertRow(parsed.data), {
      onConflict: "id",
      ignoreDuplicates: true
    });

    if (!error || error.code === "23505") {
      await db.outbox.delete(item.id);
      continue;
    }

    clientLog
      .withMetadata({ eventId: parsed.data.id, type: parsed.data.type })
      .error("sync.drain_failed");

    if (isRetryLater(error)) {
      return;
    }

    await db.outbox.update(item.id, { attempts: item.attempts + 1 });
  }
};

const drainOutbox = async (db: ClinicDb, supabase: SupabaseClient) => {
  if (!drainLock) {
    // ponytail: global drain lock, per-tenant if we ever multi-tab drain
    drainLock = runDrain(db, supabase).finally(() => {
      drainLock = null;
    });
  }

  return drainLock;
};

const pullEvents = async (db: ClinicDb, supabase: SupabaseClient) => {
  if (!db.isOpen()) {
    return;
  }

  const cursor = await db.meta.get(LAST_PULL_KEY);
  const lastPull = cursor?.value ?? "1970-01-01T00:00:00.000Z";
  const { data, error } = await supabase
    .from("clinic_events")
    .select(
      "id, tenant_id, actor_user_id, event_type, record_id, payload, occurred_at, received_at"
    )
    .gt("received_at", lastPull)
    .order("received_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(PULL_PAGE);

  if (error) {
    clientLog.withMetadata({ type: "pull" }).error("sync.pull_failed");
    return;
  }

  let latest = lastPull;

  for (const raw of data ?? []) {
    const parsed = clinicEventRowSchema.safeParse(raw);

    if (!parsed.success) {
      const eventId =
        raw && typeof raw === "object" && "id" in raw && typeof raw.id === "string"
          ? raw.id
          : undefined;
      clientLog.withMetadata({ eventId, type: "pull" }).error("sync.pull_invalid");
      // ponytail: stop at first invalid remote row; skip-by-id if a poison event blocks the clinic
      break;
    }

    const event = toClinicEvent(parsed.data);
    await applyRemoteEvent(db, event);
    latest = parsed.data.received_at;
  }

  if (latest !== lastPull) {
    await db.meta.put({ key: LAST_PULL_KEY, value: latest });
  }
};

export { drainOutbox, pullEvents, recordClinicEvent, recordClinicEvents };
