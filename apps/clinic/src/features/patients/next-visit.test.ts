import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildReminderText,
  clinicDateTimeToUtc,
  hasActiveVisitAt
} from "./next-visit";
import { saveNextVisit } from "./save-next-visit";

vi.mock("@/lib/logger/client", () => ({
  clientLog: {
    withMetadata: () => ({ error: vi.fn() })
  }
}));

const APPOINTMENT_ID = "10000000-0000-4000-8000-000000000001";
const PATIENT_ID = "20000000-0000-4000-8000-000000000002";
const TENANT_ID = "30000000-0000-4000-8000-000000000003";
const USER_ID = "40000000-0000-4000-8000-000000000004";

afterEach(() => vi.unstubAllGlobals());

const appointmentEvent = {
  id: "50000000-0000-4000-8000-000000000005",
  tenantId: TENANT_ID,
  actorUserId: USER_ID,
  recordId: APPOINTMENT_ID,
  occurredAt: "2026-09-18T02:00:00.000Z",
  type: "appointment.set" as const,
  payload: {
    patientId: PATIENT_ID,
    startsAt: "2026-09-29T02:00:00.000Z",
    status: "confirmed" as const,
    serviceName: "Follow-up check",
    note: "Diagnosis: caries on tooth 16; unpaid PHP 2,000; 09171234567"
  }
};

const onlineSupabase = (bookingRequests: { starts_at: string }[] = []) => {
  const insert = vi.fn(async () => ({ error: null }));
  const from = vi.fn((table: string) => {
    if (table === "clinic_events") {
      return {
        insert,
        select: () => ({
          eq: () => ({
            in: async () => ({ data: [], error: null })
          })
        })
      };
    }

    if (table === "booking_requests") {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              in: async () => ({ data: bookingRequests, error: null })
            })
          })
        })
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  });

  return { client: { from }, insert };
};

const nextVisitInput = {
  tenantId: TENANT_ID,
  actorUserId: USER_ID,
  patientId: PATIENT_ID,
  startsAt: appointmentEvent.payload.startsAt,
  date: "2026-09-29",
  time: "10:00",
  serviceName: "Follow-up check"
};

describe("clinicDateTimeToUtc", () => {
  it("converts clinic civil time to a UTC instant", () => {
    expect(
      clinicDateTimeToUtc("2026-09-29", "10:00", "Asia/Manila")
    ).toBe("2026-09-29T02:00:00.000Z");
  });

  it("rejects a civil time skipped by daylight saving", () => {
    expect(() =>
      clinicDateTimeToUtc("2026-03-08", "02:30", "America/New_York")
    ).toThrow("not available");
  });
});

describe("buildReminderText", () => {
  it("contains only the clinic name and local appointment datetime", () => {
    const reminder = buildReminderText({
      clinicName: "Cebu Demo Clinic",
      startsAt: appointmentEvent.payload.startsAt,
      timeZone: "Asia/Manila"
    });

    expect(reminder).toBe(
      "Hi! Reminder from Cebu Demo Clinic: Sep 29, 2026, 10:00 AM. See you then."
    );
    expect(reminder).not.toMatch(
      /caries|diagnosis|tooth|\b16\b|unpaid|PHP|2,000|09171234567/i
    );
  });
});

describe("hasActiveVisitAt", () => {
  it("warns when an active appointment occupies the slot", () => {
    expect(
      hasActiveVisitAt(
        [appointmentEvent],
        appointmentEvent.payload.startsAt
      )
    ).toBe(true);
  });

  it("allows a slot after its appointment is cancelled", () => {
    expect(
      hasActiveVisitAt(
        [
          appointmentEvent,
          {
            id: "60000000-0000-4000-8000-000000000006",
            tenantId: TENANT_ID,
            actorUserId: USER_ID,
            recordId: APPOINTMENT_ID,
            occurredAt: "2026-09-18T03:00:00.000Z",
            type: "visit.status_changed",
            payload: { status: "cancelled" }
          }
        ],
        appointmentEvent.payload.startsAt
      )
    ).toBe(false);
  });
});

describe("saveNextVisit", () => {
  it("blocks the writer while the device is offline", async () => {
    vi.stubGlobal("navigator", { onLine: false });

    await expect(
      saveNextVisit(null as never, null as never, nextVisitInput)
    ).rejects.toThrow("internet connection");
  });

  it("treats a pending public booking as an occupied slot", async () => {
    vi.stubGlobal("navigator", { onLine: true });
    const supabase = onlineSupabase([
      { starts_at: appointmentEvent.payload.startsAt }
    ]);
    const db = { events: { put: vi.fn() } };

    await expect(
      saveNextVisit(db as never, supabase.client as never, nextVisitInput)
    ).resolves.toEqual({ status: "conflict" });
    expect(supabase.insert).not.toHaveBeenCalled();
    expect(db.events.put).not.toHaveBeenCalled();
  });

  it("keeps cloud success when the local mirror fails", async () => {
    vi.stubGlobal("navigator", { onLine: true });
    const supabase = onlineSupabase();
    const db = {
      events: { put: vi.fn().mockRejectedValue(new Error("Dexie unavailable")) }
    };

    await expect(
      saveNextVisit(db as never, supabase.client as never, nextVisitInput)
    ).resolves.toMatchObject({ status: "saved" });
    expect(supabase.insert).toHaveBeenCalledOnce();
  });
});
