import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, describe, expect, it, vi } from "vitest";

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

describe("online chart append", () => {
  it("persists remotely before mirroring the event into encrypted local history", async () => {
    const db = await openClinicDb(TENANT, DEK);
    const writeRemote = vi.fn().mockResolvedValue(undefined);

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
      },
      writeRemote
    );

    expect(writeRemote).toHaveBeenCalledWith(event);
    expect(await db.events.get(event.id)).toEqual(event);
    expect(await db.outbox.count()).toBe(0);
  });

  it("does not create local history or an outbox row when the server write fails", async () => {
    const db = await openClinicDb(TENANT, DEK);
    const writeRemote = vi.fn().mockRejectedValue(new Error("offline"));

    await expect(
      appendChartEntry(
        db,
        {
          tenantId: TENANT,
          actorUserId: ACTOR,
          patientId: PATIENT,
          visitId: VISIT,
          toothCode: "16",
          finding: { kind: "condition", code: "caries" },
          note: "Occlusal lesion noted."
        },
        writeRemote
      )
    ).rejects.toThrow("offline");

    expect(await db.events.count()).toBe(0);
    expect(await db.outbox.count()).toBe(0);
  });

  it("keeps the remote save successful when the local history mirror fails", async () => {
    const writeRemote = vi.fn().mockResolvedValue(undefined);
    const db = {
      events: { put: vi.fn().mockRejectedValue(new Error("Dexie unavailable")) }
    };

    await expect(
      appendChartEntry(
        db as never,
        {
          tenantId: TENANT,
          actorUserId: ACTOR,
          patientId: PATIENT,
          visitId: VISIT,
          toothCode: "16",
          finding: { kind: "condition", code: "caries" },
          note: "Occlusal lesion noted."
        },
        writeRemote
      )
    ).resolves.toMatchObject({ type: "chart.appended" });
    expect(writeRemote).toHaveBeenCalledOnce();
  });
});
