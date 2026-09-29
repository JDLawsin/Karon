import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ writeAuditEvent: vi.fn() }));

vi.mock("@/lib/auth/audit", () => ({ writeAuditEvent: mocks.writeAuditEvent }));

import { createClinicExportStream } from "./clinic-export-server";

const TENANT_ID = "11111111-1111-4111-8111-111111111111";
const ACTOR_ID = "22222222-2222-4222-8222-222222222222";
const CUTOFF = "2026-09-29T00:00:00.000Z";

const patient = (index: number, createdAt = CUTOFF) => ({
  id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
  name: `Patient ${index}`,
  mobile: `0917${String(index).padStart(7, "0")}`,
  email: null,
  created_at: createdAt,
  updated_at: createdAt
});

type PatientRow = ReturnType<typeof patient>;

class PatientQuery implements PromiseLike<{ data: PatientRow[]; error: null }> {
  private cutoff: string | null = null;
  private cursor: string | null = null;
  private pageSize: number | null = null;
  private rangeStart: number | null = null;
  private rangeEnd: number | null = null;

  constructor(
    private readonly rows: PatientRow[],
    private readonly onFirstPage: () => void
  ) {}

  select() {
    return this;
  }

  eq() {
    return this;
  }

  lte(_column: string, value: string) {
    this.cutoff = value;
    return this;
  }

  gt(_column: string, value: string) {
    this.cursor = value;
    return this;
  }

  order() {
    return this;
  }

  limit(value: number) {
    this.pageSize = value;
    return this;
  }

  range(start: number, end: number) {
    this.rangeStart = start;
    this.rangeEnd = end;
    return this;
  }

  then<TResult1 = { data: PatientRow[]; error: null }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: PatientRow[]; error: null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    const eligible = this.rows
      .filter((row) => !this.cutoff || row.created_at <= this.cutoff)
      .filter((row) => !this.cursor || row.id > this.cursor)
      .sort((left, right) => left.id.localeCompare(right.id));
    const data =
      this.rangeStart === null || this.rangeEnd === null
        ? eligible.slice(0, this.pageSize ?? eligible.length)
        : eligible.slice(this.rangeStart, this.rangeEnd + 1);

    this.onFirstPage();
    return Promise.resolve({ data, error: null }).then(onfulfilled, onrejected);
  }
}

const patientClient = () => {
  const rows = Array.from({ length: 101 }, (_, index) => patient(index + 1));
  let firstPage = true;

  return {
    client: {
      from: () =>
        new PatientQuery(rows, () => {
          if (firstPage) {
            firstPage = false;
            rows.push(patient(0, "2026-09-29T00:00:01.000Z"));
          }
        })
    } as unknown as SupabaseClient,
    originalIds: rows.map(({ id }) => id)
  };
};

describe("createClinicExportStream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.writeAuditEvent.mockResolvedValue({ error: null });
  });

  it("exports one stable snapshot while rows arrive between pages", async () => {
    const { client, originalIds } = patientClient();
    const stream = createClinicExportStream({
      supabase: client,
      tenantId: TENANT_ID,
      actorUserId: ACTOR_ID,
      kind: "patients",
      cutoff: CUTOFF
    });
    const csv = await new Response(stream).text();
    const exportedIds = csv
      .trim()
      .split("\r\n")
      .slice(1)
      .map((line) => line.split(",", 1)[0]);

    expect(exportedIds).toEqual(originalIds);
    expect(new Set(exportedIds).size).toBe(101);
  });
});
