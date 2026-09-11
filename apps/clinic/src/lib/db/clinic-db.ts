import Dexie, { type Table } from "dexie";
import { applyEncryptionMiddleware, cryptoOptions } from "dexie-encrypted";

import type { ClinicEvent } from "@/lib/sync/event-schema";

const CRYPTO_DB_NAME = "karon-crypto";
const CLINIC_NOTEBOOK_NAME =
  /^karon-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const clinicNotebookName = (tenantId: string) => `karon-${tenantId}`;

type ClinicEventRow = ClinicEvent;
type OutboxRow = {
  id: string;
  tenantId: string;
  createdAt: string;
  attempts: number;
};
type MetaRow = {
  key: string;
  value: string;
};

type CryptoRow = {
  tenantId: string;
  wrapKey: CryptoKey;
  iv: Uint8Array;
  wrappedDek: Uint8Array;
};

class ClinicDb extends Dexie {
  events!: Table<ClinicEventRow, string>;
  outbox!: Table<OutboxRow, string>;
  meta!: Table<MetaRow, string>;

  constructor(tenantId: string, dek: Uint8Array) {
    super(clinicNotebookName(tenantId));
    applyEncryptionMiddleware(
      this,
      dek,
      // ponytail: dexie-encrypted Dexie 4 Table generics don't unify
      {
        events: {
          type: cryptoOptions.ENCRYPT_LIST,
          fields: ["payload"]
        }
      } as never,
      async () => {
        throw new Error("clinic db key changed");
      }
    );
    this.version(1).stores({
      events: "id, tenantId, type, occurredAt, receivedAt, recordId",
      outbox: "id, tenantId, createdAt, attempts",
      meta: "key"
    });
  }
}

let current: { tenantId: string; db: ClinicDb } | null = null;
let opening: Promise<ClinicDb> | null = null;

const openCryptoDb = () => {
  const db = new Dexie(CRYPTO_DB_NAME);
  db.version(1).stores({ keys: "tenantId" });
  return db as Dexie & { keys: Table<CryptoRow, string> };
};

// ponytail: password-derived DEK if we drop magic-link-only unlock later
const loadOrCreateDek = async (tenantId: string) => {
  const db = openCryptoDb();

  try {
    await db.open();
    const existing = await db.table("keys").get(tenantId);

    if (existing) {
      const row = existing as CryptoRow;
      const raw = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: row.iv as BufferSource },
        row.wrapKey,
        row.wrappedDek as BufferSource
      );
      return new Uint8Array(raw);
    }

    const wrapKey = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
    const dek = crypto.getRandomValues(new Uint8Array(32));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const wrapped = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      wrapKey,
      dek
    );

    await db.table("keys").put({
      tenantId,
      wrapKey,
      iv,
      wrappedDek: new Uint8Array(wrapped)
    });

    return dek;
  } finally {
    db.close();
  }
};

const closeClinicDb = () => {
  current?.db.close();
  current = null;
};

const dropOtherTenantStores = async (tenantId: string) => {
  const keep = clinicNotebookName(tenantId);
  const names = await Dexie.getDatabaseNames();
  await Promise.all(
    names
      .filter((name) => CLINIC_NOTEBOOK_NAME.test(name) && name !== keep)
      .map((name) => Dexie.delete(name))
  );

  const crypto = openCryptoDb();

  try {
    await crypto.open();
    const rows = (await crypto.table("keys").toArray()) as CryptoRow[];
    await Promise.all(
      rows
        .filter((row) => row.tenantId !== tenantId)
        .map((row) => crypto.table("keys").delete(row.tenantId))
    );
  } finally {
    crypto.close();
  }
};

// ponytail: wipe on leave (sign-out + idle lock). Unsynced outbox is lost if they lock offline; drain-on-write is the ceiling until we drain-then-wipe.
const dropClinicStores = async () => {
  closeClinicDb();
  const names = await Dexie.getDatabaseNames();
  await Promise.all(
    names
      .filter((name) => name === CRYPTO_DB_NAME || CLINIC_NOTEBOOK_NAME.test(name))
      .map((name) => Dexie.delete(name))
  );
};

const openClinicDb = async (tenantId: string, dek?: Uint8Array) => {
  if (current?.tenantId === tenantId && current.db.isOpen()) {
    return current.db;
  }

  if (!opening) {
    opening = (async () => {
      if (current?.tenantId === tenantId && current.db.isOpen()) {
        return current.db;
      }

      closeClinicDb();
      await dropOtherTenantStores(tenantId);
      const key = dek ?? (await loadOrCreateDek(tenantId));
      const db = new ClinicDb(tenantId, key);
      await db.open();
      current = { tenantId, db };
      return db;
    })().finally(() => {
      opening = null;
    });
  }

  const db = await opening;

  if (current?.tenantId === tenantId && db.isOpen()) {
    return db;
  }

  return openClinicDb(tenantId, dek);
};

export { ClinicDb, closeClinicDb, dropClinicStores, loadOrCreateDek, openClinicDb };
export type { ClinicEventRow, MetaRow, OutboxRow };
