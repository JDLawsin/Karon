import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";

import { closeClinicDb, openClinicDb } from "@/lib/db/clinic-db";

import { addWalkIn, changeVisitStatus } from "./local";
import { projectTodayBoard } from "./project-today-board";

const TENANT = "11111111-1111-4111-8111-111111111111";
const ACTOR = "22222222-2222-4222-8222-222222222222";
const DEK = new Uint8Array(32);

afterEach(async () => {
  closeClinicDb();
  await Dexie.delete(`karon-${TENANT}`);
  await Dexie.delete("karon-crypto");
});

describe("today-board local writes", () => {
  it("records a walk-in as waiting on today's board", async () => {
    const db = await openClinicDb(TENANT, DEK);
    const now = new Date("2026-09-12T04:00:00.000Z");

    await addWalkIn(db, {
      tenantId: TENANT,
      actorUserId: ACTOR,
      name: "Ana Cruz",
      mobile: "09171234567",
      now
    });

    const rows = projectTodayBoard(await db.events.toArray(), now);

    expect(rows).toEqual([
      expect.objectContaining({
        name: "Ana Cruz",
        status: "waiting"
      })
    ]);
    expect(await db.outbox.count()).toBe(2);
  });

  it("appends visit.status_changed when seating a walk-in", async () => {
    const db = await openClinicDb(TENANT, DEK);
    const now = new Date("2026-09-12T04:00:00.000Z");
    const { visitId } = await addWalkIn(db, {
      tenantId: TENANT,
      actorUserId: ACTOR,
      name: "Ana Cruz",
      mobile: "09171234567",
      now
    });

    await changeVisitStatus(db, {
      tenantId: TENANT,
      actorUserId: ACTOR,
      visitId,
      status: "in_chair",
      now: new Date("2026-09-12T04:05:00.000Z")
    });

    const rows = projectTodayBoard(await db.events.toArray(), now);
    const types = (await db.events.toArray()).map((row) => row.type);

    expect(rows[0]?.status).toBe("in_chair");
    expect(types).toContain("visit.status_changed");
  });
});
