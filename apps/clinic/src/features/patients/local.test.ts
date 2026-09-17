import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";

import { closeClinicDb, openClinicDb } from "@/lib/db/clinic-db";

import { savePatient } from "./local";

const TENANT = "11111111-1111-4111-8111-111111111111";
const ACTOR = "22222222-2222-4222-8222-222222222222";
const DEK = new Uint8Array(32);

afterEach(async () => {
  closeClinicDb();
  await Dexie.delete(`karon-${TENANT}`);
  await Dexie.delete("karon-crypto");
});

describe("patient local writes", () => {
  it("records create and merge choices as queued patient events", async () => {
    const db = await openClinicDb(TENANT, DEK);
    const patientId = await savePatient(db, {
      tenantId: TENANT,
      actorUserId: ACTOR,
      name: "Mia Santos",
      mobile: "0917 555 0102",
      now: new Date("2026-09-17T01:00:00.000Z")
    });

    await savePatient(db, {
      tenantId: TENANT,
      actorUserId: ACTOR,
      patientId,
      name: "Mia S. Santos",
      mobile: "+63 917 555 0102",
      now: new Date("2026-09-17T01:01:00.000Z")
    });

    const events = await db.events.orderBy("occurredAt").toArray();

    expect(events).toEqual([
      expect.objectContaining({
        recordId: patientId,
        type: "patient.created",
        payload: { name: "Mia Santos", mobile: "0917 555 0102" }
      }),
      expect.objectContaining({
        recordId: patientId,
        type: "patient.updated",
        payload: { name: "Mia S. Santos", mobile: "+63 917 555 0102" }
      })
    ]);
    expect(await db.outbox.count()).toBe(2);
  });
});
