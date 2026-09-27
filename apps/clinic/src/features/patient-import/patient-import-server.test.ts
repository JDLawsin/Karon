import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import {
  cleanupExpiredImports,
  createSecureImportUploadToken
} from "./patient-import-server";

const expiredJob = {
  id: "10000000-0000-4000-8000-000000000001",
  tenant_id: "10000000-0000-4000-8000-000000000002",
  status: "completed" as const,
  storage_path:
    "10000000-0000-4000-8000-000000000002/10000000-0000-4000-8000-000000000001/source.csv",
  object_deleted_at: null,
  data_purged_at: "2026-09-27T00:00:00.000Z"
};

const cleanupClient = (removeError: Error | null, job = expiredJob) => {
  const updates: Record<string, unknown>[] = [];
  const updateBuilder = {
    eq: vi.fn(() => updateBuilder),
    then: (resolve: (value: { error: null }) => void) => resolve({ error: null })
  };
  const selectBuilder = {
    lt: vi.fn(() => selectBuilder),
    or: vi.fn(() => selectBuilder),
    order: vi.fn(() => selectBuilder),
    limit: vi.fn().mockResolvedValue({ data: [job], error: null })
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

  return { client, remove, updates };
};

describe("expired patient import cleanup", () => {
  it("retries an undeleted object after parsed data was already purged", async () => {
    const { client, remove, updates } = cleanupClient(null);

    const result = await cleanupExpiredImports(client);

    expect(remove).toHaveBeenCalledWith([expiredJob.storage_path]);
    expect(result).toEqual({
      examined: 1,
      objectsDeleted: 1,
      recordsPurged: 0,
      pendingObjects: 0
    });
    expect(updates.at(-1)).toMatchObject({
      rows: [],
      data_purged_at: expiredJob.data_purged_at,
      object_deleted_at: expect.any(String)
    });
  });

  it("purges parsed rows and leaves object deletion pending after a Storage failure", async () => {
    const { client, updates } = cleanupClient(new Error("storage unavailable"), {
      ...expiredJob,
      status: "preview_ready",
      data_purged_at: null
    });

    const result = await cleanupExpiredImports(client);

    expect(result).toEqual({
      examined: 1,
      objectsDeleted: 0,
      recordsPurged: 1,
      pendingObjects: 1
    });
    expect(updates.at(-1)).toMatchObject({
      status: "failed",
      rows: [],
      data_purged_at: expect.any(String),
      last_error:
        "Import data expired. Parsed rows were deleted; secure upload cleanup will retry."
    });
    expect(updates.at(-1)).not.toHaveProperty("object_deleted_at");
  });
});

describe("secure import upload policy", () => {
  it("fails closed when Storage refuses to create an upload token", async () => {
    const createSignedUploadUrl = vi.fn().mockResolvedValue({
      data: null,
      error: new Error("row-level security policy missing")
    });
    const client = {
      storage: { from: vi.fn(() => ({ createSignedUploadUrl })) }
    } as unknown as SupabaseClient;

    await expect(
      createSecureImportUploadToken(client, "patient-import-staging", "tenant/job/source.csv")
    ).resolves.toBeNull();
  });
});
