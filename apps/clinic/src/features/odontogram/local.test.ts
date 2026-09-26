import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";

import { closeClinicDb, openClinicDb } from "@/lib/db/clinic-db";

import { appendChartEntry } from "./local";

const TENANT = "11111111-1111-4111-8111-111111111111";
const ACTOR = "22222222-2222-4222-8222-222222222222";
const PATIENT = "33333333-3333-4333-8333-333333333333";
const VISIT = "44444444-4444-4444-8444-444444444444";
const DEK = new Uint8Array(32);

afterEach(async () => {
  closeClinicDb();
  await Dexie.delete(`karon-${TENANT}`);
  await Dexie.delete("karon-crypto");
});

describe("offline chart append", () => {
  it("atomically stores encrypted local history and an outbox row", async () => {
    const db = await openClinicDb(TENANT, DEK);

    const event = await appendChartEntry(
      db,
      {
        tenantId: TENANT,
        actorUserId: ACTOR,
        patientId: PATIENT,
        visitId: VISIT,
        toothCode: "16",
        finding: { kind: "procedure", code: "filling" },
        note: "Composite restoration placed.",
        now: new Date("2026-09-19T01:00:00.000Z")
      }
    );

    expect(await db.events.get(event.id)).toEqual(event);
    expect(await db.outbox.get(event.id)).toMatchObject({ id: event.id, attempts: 0 });
  });
});
