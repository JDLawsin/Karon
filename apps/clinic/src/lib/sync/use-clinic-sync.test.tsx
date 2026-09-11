import { randomUUID } from "node:crypto";

import "fake-indexeddb/auto";
import { renderHook, waitFor } from "@testing-library/react";
import Dexie from "dexie";
import { afterEach, describe, expect, it, vi } from "vitest";

import { closeClinicDb, openClinicDb } from "@/lib/db/clinic-db";

const TENANT = "11111111-1111-4111-8111-111111111111";

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabase: () => ({})
}));

vi.mock("@/lib/sync/sync-engine", () => ({
  drainOutbox: vi.fn(async () => undefined),
  pullEvents: vi.fn(async () => undefined)
}));

import { drainOutbox, pullEvents } from "@/lib/sync/sync-engine";

import { useClinicSync } from "./use-clinic-sync";

afterEach(async () => {
  closeClinicDb();
  await Dexie.delete(`karon-${TENANT}`);
  await Dexie.delete("karon-crypto");
  vi.clearAllMocks();
});

describe("useClinicSync", () => {
  it("drains as soon as the browser comes back online", async () => {
    const { unmount } = renderHook(() => useClinicSync(TENANT));

    await waitFor(() => {
      expect(drainOutbox).toHaveBeenCalled();
      expect(pullEvents).toHaveBeenCalled();
    });

    vi.mocked(drainOutbox).mockClear();
    vi.mocked(pullEvents).mockClear();
    window.dispatchEvent(new Event("online"));

    await waitFor(() => {
      expect(drainOutbox).toHaveBeenCalled();
      expect(pullEvents).toHaveBeenCalled();
    });

    unmount();
  });

  it("drains when a new outbox row lands while online", async () => {
    const { unmount } = renderHook(() => useClinicSync(TENANT));

    await waitFor(() => {
      expect(drainOutbox).toHaveBeenCalled();
    });

    vi.mocked(drainOutbox).mockClear();
    const db = await openClinicDb(TENANT);
    await db.outbox.add({
      id: randomUUID(),
      tenantId: TENANT,
      createdAt: new Date().toISOString(),
      attempts: 0
    });

    await waitFor(() => {
      expect(drainOutbox).toHaveBeenCalled();
    });

    unmount();
  });
});
