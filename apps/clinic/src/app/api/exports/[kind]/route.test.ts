import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  countClinicExportRows: vi.fn(),
  createClinicExportStream: vi.fn(),
  getClinicAccess: vi.fn(),
  loadClinicExportCutoff: vi.fn(),
  reserveClinicExport: vi.fn(),
  writeAuditEvent: vi.fn()
}));

vi.mock("@/features/clinic-export/clinic-export-server", () => ({
  ClinicExportError: class extends Error {},
  ClinicExportRateLimitedError: class extends Error {},
  countClinicExportRows: mocks.countClinicExportRows,
  createClinicExportStream: mocks.createClinicExportStream,
  loadClinicExportCutoff: mocks.loadClinicExportCutoff,
  reserveClinicExport: mocks.reserveClinicExport
}));

vi.mock("@/lib/auth/clinic-access", () => ({
  getClinicAccess: mocks.getClinicAccess
}));

vi.mock("@/lib/auth/audit", () => ({
  writeAuditEvent: mocks.writeAuditEvent
}));

import { GET } from "./route";

const request = new Request("https://clinic.example/api/exports/patients");
const context = (kind: string) => ({ params: Promise.resolve({ kind }) });

describe("GET /api/exports/[kind]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.writeAuditEvent.mockResolvedValue({ error: null });
    mocks.loadClinicExportCutoff.mockResolvedValue("2026-09-29T00:00:00.000Z");
    mocks.countClinicExportRows.mockResolvedValue(2);
    mocks.reserveClinicExport.mockResolvedValue(undefined);
    mocks.createClinicExportStream.mockReturnValue(
      new ReadableStream({
        start: (controller) => {
          controller.enqueue(new TextEncoder().encode("patient_id\r\n"));
          controller.close();
        }
      })
    );
  });

  it("returns 403 and audits an assistant attempt", async () => {
    const supabase = {};
    mocks.getClinicAccess.mockResolvedValue({
      userId: "assistant-1",
      aal: "aal1",
      mfaOk: true,
      sessionActive: true,
      membership: { tenantId: "clinic-1", role: "assistant" },
      supabase
    });

    const response = await GET(request, context("patients"));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
    expect(mocks.writeAuditEvent).toHaveBeenCalledWith(supabase, {
      tenantId: "clinic-1",
      actorUserId: "assistant-1",
      eventType: "access.denied"
    });
    expect(mocks.createClinicExportStream).not.toHaveBeenCalled();
  });

  it("streams only the signed-in owner's tenant and sets download headers", async () => {
    const supabase = {};
    mocks.getClinicAccess.mockResolvedValue({
      userId: "owner-1",
      aal: "aal2",
      mfaOk: true,
      sessionActive: true,
      membership: { tenantId: "clinic-1", role: "owner" },
      supabase
    });

    const response = await GET(request, context("patients"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("Content-Disposition")).toMatch(
      /^attachment; filename="karon-patients-\d{4}-\d{2}-\d{2}\.csv"$/
    );
    expect(response.headers.get("X-Export-Row-Count")).toBe("2");
    expect(mocks.countClinicExportRows).toHaveBeenCalledWith(
      supabase,
      "clinic-1",
      "patients",
      "2026-09-29T00:00:00.000Z"
    );
    expect(mocks.reserveClinicExport).toHaveBeenCalledWith(
      supabase,
      "clinic-1",
      "owner-1",
      "patients",
      2
    );
    expect(mocks.createClinicExportStream).toHaveBeenCalledWith({
      supabase,
      tenantId: "clinic-1",
      actorUserId: "owner-1",
      kind: "patients",
      cutoff: "2026-09-29T00:00:00.000Z"
    });
  });

  it("rejects unsupported exports before querying clinic data", async () => {
    mocks.getClinicAccess.mockResolvedValue({
      userId: "owner-1",
      aal: "aal2",
      mfaOk: true,
      sessionActive: true,
      membership: { tenantId: "clinic-1", role: "owner" },
      supabase: {}
    });

    const response = await GET(request, context("charts"));

    expect(response.status).toBe(400);
    expect(mocks.countClinicExportRows).not.toHaveBeenCalled();
  });
});
