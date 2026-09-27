import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { cleanupExpiredServiceImports } from "./service-import-server";

const expiredJob = {
  id: "10000000-0000-4000-8000-000000000001",
  tenant_id: "10000000-0000-4000-8000-000000000002",
  status: "preview_ready" as const,
  storage_path:
    "10000000-0000-4000-8000-000000000002/10000000-0000-4000-8000-000000000001/source.csv",
  object_deleted_at: null,
  data_purged_at: null
};

const cleanupClient = (removeError: Error | null, updateError: Error | null = null) => {
  const updates: Record<string, unknown>[] = [];
  const updateBuilder = {
    eq: vi.fn(() => updateBuilder),
    then: (resolve: (value: { error: Error | null }) => void) =>
      resolve({ error: updateError })
  };
  const selectBuilder = {
    lt: vi.fn(() => selectBuilder),
    or: vi.fn(() => selectBuilder),
    order: vi.fn(() => selectBuilder),
    limit: vi.fn().mockResolvedValue({ data: [expiredJob], error: null })
  };
  const table = {
    select: vi.fn(() => selectBuilder),
    update: vi.fn((value: Record<string, unknown>) => {
      updates.push(value);
      return updateBuilder;
    })
  };
  const remove = vi.fn().mockResolvedValue({ error: removeError });
  const client = {
    from: vi.fn(() => table),
    storage: { from: vi.fn(() => ({ remove })) }
  } as unknown as SupabaseClient;

  return { client, updates };
};

describe("expired service import cleanup", () => {
  it("purges parsed rows and marks an abandoned job failed", async () => {
    const { client, updates } = cleanupClient(null);

    const result = await cleanupExpiredServiceImports(client);

    expect(result).toEqual({ examined: 1, objectsDeleted: 1, recordsPurged: 1, pendingObjects: 0 });
    expect(updates.at(-1)).toMatchObject({
      status: "failed",
      rows: [],
      data_purged_at: expect.any(String),
      object_deleted_at: expect.any(String),
      last_error: "Import data expired and was deleted. Choose the file again."
    });
  });

  it("keeps object deletion pending for the next cleanup retry", async () => {
    const { client, updates } = cleanupClient(new Error("storage unavailable"));

    const result = await cleanupExpiredServiceImports(client);

    expect(result.pendingObjects).toBe(1);
    expect(updates.at(-1)).not.toHaveProperty("object_deleted_at");
  });

  it("fails when purging the expired job cannot be persisted", async () => {
    const { client } = cleanupClient(null, new Error("database unavailable"));

    await expect(cleanupExpiredServiceImports(client)).rejects.toThrow(
      "Could not purge expired service import data."
    );
  });
});
