import { randomUUID } from "node:crypto";

import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";

import {
  closeClinicDb,
  dropClinicStores,
  loadOrCreateDek,
  openClinicDb
} from "./clinic-db";

const TENANT = "11111111-1111-4111-8111-111111111111";
const OTHER = "33333333-3333-4333-8333-333333333333";

const rawEvent = async (id: string) => {
  const dbName = `karon-${TENANT}`;
  const request = indexedDB.open(dbName);

  return new Promise<Record<string, unknown>>((resolve, reject) => {
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction("events", "readonly");
      const get = tx.objectStore("events").get(id);
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

    const stored = await rawEvent(id);
    const dumped = JSON.stringify(stored);

    expect(stored.__encryptedData).toBeTruthy();
    expect(dumped).not.toContain("Maria Santos");
    expect(dumped).not.toContain("09170001111");

    const read = await db.events.get(id);
    expect(read?.payload).toEqual({ name: "Maria Santos", mobile: "09170001111" });
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
