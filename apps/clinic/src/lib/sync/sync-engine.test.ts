import { randomUUID } from "node:crypto";

import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";

import { closeClinicDb, openClinicDb } from "@/lib/db/clinic-db";
import type { ClinicEvent } from "@/lib/sync/event-schema";
import { drainOutbox, pullEvents, recordClinicEvent, recordClinicEvents } from "@/lib/sync/sync-engine";

const TENANT = "11111111-1111-4111-8111-111111111111";
const ACTOR = "22222222-2222-4222-8222-222222222222";
const DEK = new Uint8Array(32);

const makeEvent = (
  type: ClinicEvent["type"],
  overrides: Partial<ClinicEvent> = {}
): ClinicEvent => ({
  id: randomUUID(),
  tenantId: TENANT,
  actorUserId: ACTOR,
  recordId: randomUUID(),
  occurredAt: new Date().toISOString(),
  type,
  payload:
    type === "patient.created" || type === "patient.updated"
      ? { name: "Ana Cruz", mobile: "09171234567" }
      : {},
  ...overrides
});

const mockSupabase = (options?: {
  upsertError?: { message: string; code?: string } | null;
  rows?: unknown[];
}) => {
  const upsert = vi.fn(async () => ({
    data: null,
    error: options?.upsertError ?? null
  }));
  const query = {
    select: vi.fn(() => query),
    gt: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(async () => ({ data: options?.rows ?? [], error: null })),
    upsert
  };
  const from = vi.fn(() => query);
  const fetchSpy = vi.fn();
  vi.stubGlobal("fetch", fetchSpy);

  return { from, upsert, query, fetchSpy, supabase: { from } as never };
};

afterEach(async () => {
  closeClinicDb();
  vi.unstubAllGlobals();
  const { default: Dexie } = await import("dexie");
  await Dexie.delete(`karon-${TENANT}`);
  await Dexie.delete("karon-crypto");
});

describe("sync engine", () => {
  it("records offline then drains via clinic_events, not /api/patients", async () => {
    const db = await openClinicDb(TENANT, DEK);
    const event = makeEvent("patient.created");
    await recordClinicEvent(db, event);

    expect(await db.outbox.count()).toBe(1);

    const { supabase, from, upsert, fetchSpy } = mockSupabase();
    await drainOutbox(db, supabase);

    expect(from).toHaveBeenCalledWith("clinic_events");
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: event.id,
        tenant_id: TENANT,
        event_type: "patient.created"
      }),
      { onConflict: "id", ignoreDuplicates: true }
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(await db.outbox.count()).toBe(0);
    expect(await db.events.get(event.id)).toMatchObject({ id: event.id });
  });

  it("clears the outbox when the server already has the id", async () => {
    const db = await openClinicDb(TENANT, DEK);
    const event = makeEvent("quote.created");
    await recordClinicEvent(db, event);
    const { supabase } = mockSupabase({
      upsertError: { message: "duplicate", code: "23505" }
    });

    await drainOutbox(db, supabase);

    expect(await db.outbox.count()).toBe(0);
    expect(await db.events.get(event.id)).toBeTruthy();
  });

  it("pulls a remote event without deleting a local sibling", async () => {
    const db = await openClinicDb(TENANT, DEK);
    const recordId = randomUUID();
    const local = makeEvent("chart.appended", { recordId });
    await recordClinicEvent(db, local);

    const remote = makeEvent("chart.appended", { recordId });
    const { supabase } = mockSupabase({
      rows: [
        {
          id: remote.id,
          tenant_id: remote.tenantId,
          actor_user_id: remote.actorUserId,
          event_type: remote.type,
          record_id: remote.recordId,
          payload: { note: "other device" },
          occurred_at: remote.occurredAt,
          received_at: "2026-09-12T00:00:00.000Z"
        }
      ]
    });

    await pullEvents(db, supabase);

    const rows = await db.events.toArray();
    expect(rows.map((row) => row.id).sort()).toEqual([local.id, remote.id].sort());
    expect(rows.find((row) => row.id === local.id)?.payload).toEqual(local.payload);
  });

  it("does not throw when the db is closed before drain", async () => {
    const db = await openClinicDb(TENANT, DEK);
    await recordClinicEvent(db, makeEvent("payment.recorded"));
    closeClinicDb();
    const { supabase, upsert } = mockSupabase();

    await expect(drainOutbox(db, supabase)).resolves.toBeUndefined();
    expect(upsert).not.toHaveBeenCalled();
  });

  it("does not advance the pull cursor past an invalid remote row", async () => {
    const db = await openClinicDb(TENANT, DEK);
    const first = makeEvent("quote.created");
    const later = makeEvent("quote.created");
    const invalidId = "44444444-4444-4444-8444-444444444444";
    const { supabase } = mockSupabase({
      rows: [
        {
          id: first.id,
          tenant_id: first.tenantId,
          actor_user_id: first.actorUserId,
          event_type: first.type,
          record_id: first.recordId,
          payload: {},
          occurred_at: first.occurredAt,
          received_at: "2026-09-12T00:00:00.000Z"
        },
        { id: invalidId, received_at: "2026-09-12T00:00:01.000Z" },
        {
          id: later.id,
          tenant_id: later.tenantId,
          actor_user_id: later.actorUserId,
          event_type: later.type,
          record_id: later.recordId,
          payload: {},
          occurred_at: later.occurredAt,
          received_at: "2026-09-12T00:00:02.000Z"
        }
      ]
    });

    await pullEvents(db, supabase);

    expect(await db.events.get(first.id)).toBeTruthy();
    expect(await db.events.get(later.id)).toBeUndefined();
    expect(await db.meta.get("lastPullReceivedAt")).toEqual({
      key: "lastPullReceivedAt",
      value: "2026-09-12T00:00:00.000Z"
    });
  });

  it("records a walk-in pair in one transaction", async () => {
    const db = await openClinicDb(TENANT, DEK);
    const patientId = randomUUID();
    const visitId = randomUUID();
    const occurredAt = new Date().toISOString();

    await recordClinicEvents(db, [
      makeEvent("patient.created", { recordId: patientId }),
      makeEvent("appointment.set", {
        recordId: visitId,
        payload: {
          patientId,
          startsAt: occurredAt,
          status: "waiting"
        }
      })
    ]);

    expect(await db.events.count()).toBe(2);
    expect(await db.outbox.count()).toBe(2);
  });
});
