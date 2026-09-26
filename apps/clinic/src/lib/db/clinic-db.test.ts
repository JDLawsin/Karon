import { randomUUID } from "node:crypto";

import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";

import {
  closeClinicDb,
  dropClinicStores,
  loadOrCreateDek,
  openClinicDb,
  pendingClinicEvents,
  pendingClinicOutboxCount
} from "./clinic-db";

const TENANT = "11111111-1111-4111-8111-111111111111";
const OTHER = "33333333-3333-4333-8333-333333333333";

const rawRow = async (store: "events" | "meta", id: string) => {
  const dbName = `karon-${TENANT}`;
  const request = indexedDB.open(dbName);

  return new Promise<Record<string, unknown>>((resolve, reject) => {
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(store, "readonly");
      const get = tx.objectStore(store).get(id);
      get.onerror = () => reject(get.error);
      get.onsuccess = () => {
        db.close();
        resolve(get.result as Record<string, unknown>);
      };
    };
  });
};

afterEach(async () => {
  closeClinicDb();
  await Dexie.delete(`karon-${TENANT}`);
  await Dexie.delete(`karon-${OTHER}`);
  await Dexie.delete("karon-crypto");
});

describe("encrypted clinic db", () => {
  it("stores patient payload as ciphertext", async () => {
    const dek = crypto.getRandomValues(new Uint8Array(32));
    const db = await openClinicDb(TENANT, dek);
    const id = randomUUID();
    await db.events.add({
      id,
      tenantId: TENANT,
      actorUserId: randomUUID(),
      recordId: randomUUID(),
      occurredAt: new Date().toISOString(),
      type: "patient.created",
      payload: { name: "Maria Santos", mobile: "09170001111" }
    });

    const stored = await rawRow("events", id);
    const dumped = JSON.stringify(stored);

    expect(stored.__encryptedData).toBeTruthy();
    expect(dumped).not.toContain("Maria Santos");
    expect(dumped).not.toContain("09170001111");

    const read = await db.events.get(id);
    expect(read?.payload).toEqual({ name: "Maria Santos", mobile: "09170001111" });
  });

  it("stores cached balance metadata as ciphertext", async () => {
    const db = await openClinicDb(TENANT, crypto.getRandomValues(new Uint8Array(32)));
    await db.meta.put({
      key: "collectBalance:patient:visit",
      value: JSON.stringify({ paidMinor: 100_000, remainingMinor: 50_000 })
    });

    const stored = await rawRow("meta", "collectBalance:patient:visit");
    expect(stored.__encryptedData).toBeTruthy();
    expect(JSON.stringify(stored)).not.toContain("100000");
    expect((await db.meta.get("collectBalance:patient:visit"))?.value).toContain(
      '"paidMinor":100000'
    );
  });

  it("reuses a wrapped device DEK", async () => {
    const first = await loadOrCreateDek(TENANT);
    const second = await loadOrCreateDek(TENANT);
    expect(first).toEqual(second);
    expect(first.byteLength).toBe(32);
  });

  it("keeps this clinic's notebook after close and reopen", async () => {
    const dek = crypto.getRandomValues(new Uint8Array(32));
    const db = await openClinicDb(TENANT, dek);
    const id = randomUUID();
    await db.events.add({
      id,
      tenantId: TENANT,
      actorUserId: randomUUID(),
      recordId: randomUUID(),
      occurredAt: new Date().toISOString(),
      type: "patient.created",
      payload: { name: "Maria Santos", mobile: "09170001111" }
    });
    closeClinicDb();

    const reopened = await openClinicDb(TENANT, dek);
    expect(await reopened.events.get(id)).toMatchObject({ id });
  });

  it("counts and returns pending events for protected export", async () => {
    const db = await openClinicDb(TENANT);
    const id = randomUUID();
    const event = {
      id,
      tenantId: TENANT,
      actorUserId: randomUUID(),
      recordId: randomUUID(),
      occurredAt: new Date().toISOString(),
      type: "patient.created" as const,
      payload: { name: "Maria Santos", mobile: "09170001111" }
    };
    await db.transaction("rw", db.events, db.outbox, async () => {
      await db.events.add(event);
      await db.outbox.add({
        id,
        tenantId: TENANT,
        createdAt: event.occurredAt,
        attempts: 0
      });
    });
    closeClinicDb();

    expect(await pendingClinicOutboxCount()).toBe(1);
    expect(await pendingClinicEvents(TENANT)).toEqual([event]);
  });

  it("drops another clinic's notebook when this device opens a different tenant", async () => {
    const dekA = crypto.getRandomValues(new Uint8Array(32));
    const dbA = await openClinicDb(TENANT, dekA);
    await dbA.events.add({
      id: randomUUID(),
      tenantId: TENANT,
      actorUserId: randomUUID(),
      recordId: randomUUID(),
      occurredAt: new Date().toISOString(),
      type: "patient.created",
      payload: { name: "Maria Santos", mobile: "09170001111" }
    });
    await loadOrCreateDek(TENANT);
    closeClinicDb();

    const dekB = crypto.getRandomValues(new Uint8Array(32));
    await openClinicDb(OTHER, dekB);

    expect(await Dexie.exists(`karon-${TENANT}`)).toBe(false);

    const cryptoDb = new Dexie("karon-crypto");
    cryptoDb.version(1).stores({ keys: "tenantId" });
    await cryptoDb.open();
    expect(await cryptoDb.table("keys").get(TENANT)).toBeUndefined();
    cryptoDb.close();

    closeClinicDb();
    const restored = await openClinicDb(TENANT, dekA);
    expect(await restored.events.count()).toBe(0);
  });

  it("drops this clinic's notebook and wrap keys on leave", async () => {
    const dek = crypto.getRandomValues(new Uint8Array(32));
    const db = await openClinicDb(TENANT, dek);
    await db.events.add({
      id: randomUUID(),
      tenantId: TENANT,
      actorUserId: randomUUID(),
      recordId: randomUUID(),
      occurredAt: new Date().toISOString(),
      type: "patient.created",
      payload: { name: "Maria Santos", mobile: "09170001111" }
    });
    await loadOrCreateDek(TENANT);

    await dropClinicStores();

    expect(await Dexie.exists(`karon-${TENANT}`)).toBe(false);
    expect(await Dexie.exists("karon-crypto")).toBe(false);
  });
});
