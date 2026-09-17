import { describe, expect, it } from "vitest";

import {
  applyLiveInboxChange,
  parseInboxRows,
  reconcileInboxRows,
  type InboxRow
} from "./booking-inbox-live";

const tenantId = "11111111-1111-4111-8111-111111111111";
const row = {
  id: "22222222-2222-4222-8222-222222222222",
  tenant_id: tenantId,
  name: "Fake Booking",
  mobile: "09170000000",
  service_name: "Checkup",
  note: null,
  starts_at: "2026-09-18T02:00:00.000Z",
  status: "pending"
};

describe("live booking inbox", () => {
  it("parses trusted fields and orders pending rows", () => {
    expect(
      parseInboxRows([
        { ...row, id: "33333333-3333-4333-8333-333333333333", starts_at: "2026-09-18T03:00:00.000Z" },
        row,
        { id: "invalid" }
      ]).map((item) => item.id)
    ).toEqual([
      "22222222-2222-4222-8222-222222222222",
      "33333333-3333-4333-8333-333333333333"
    ]);
  });

  it("adds a tenant pending event once and removes it after acceptance", () => {
    const inserted = applyLiveInboxChange([], row, tenantId);

    expect(inserted.added?.id).toBe(row.id);
    expect(applyLiveInboxChange(inserted.rows, row, tenantId).added).toBeNull();
    expect(
      applyLiveInboxChange(inserted.rows, { ...row, status: "accepted" }, tenantId)
        .rows
    ).toEqual([]);
  });

  it("ignores cross-tenant events even if a channel is misconfigured", () => {
    expect(
      applyLiveInboxChange([], row, "99999999-9999-4999-8999-999999999999")
    ).toEqual({ rows: [], added: null });
  });

  it("does not signal rows already seen during catch-up", () => {
    const parsed = parseInboxRows([row]);
    const current: InboxRow[] = [];

    expect(reconcileInboxRows(current, parsed, new Set([row.id])).added).toEqual([]);
    expect(reconcileInboxRows(current, parsed, new Set()).added).toEqual(parsed);
  });
});
