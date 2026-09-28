import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ClinicEvent } from "@/lib/sync/event-schema";

import OpeningBalanceSummary from "./opening-balance-summary";

const event: ClinicEvent = {
  id: "10000000-0000-4000-8000-000000000001",
  tenantId: "10000000-0000-4000-8000-000000000002",
  actorUserId: "10000000-0000-4000-8000-000000000003",
  recordId: "10000000-0000-4000-8000-000000000004",
  occurredAt: "2026-09-28T01:00:00.000Z",
  type: "opening_balance.noted",
  payload: {
    patientId: "10000000-0000-4000-8000-000000000004",
    amountMinor: 120_000,
    currency: "PHP",
    note: "Starting amount from the old system"
  }
};

describe("OpeningBalanceSummary", () => {
  it("labels imported notes as not reconciled accounts receivable", () => {
    render(
      <OpeningBalanceSummary
        events={[event]}
        locale="en-PH"
        patientId="10000000-0000-4000-8000-000000000004"
      />
    );

    expect(screen.getByRole("heading", { name: "Opening balance" })).toBeVisible();
    expect(screen.getByText("Not reconciled")).toBeVisible();
    expect(screen.getByText("₱1,200.00")).toBeVisible();
    expect(screen.getByText("Starting amount from the old system")).toBeVisible();
    expect(screen.getByText(/not accounts receivable/i)).toBeVisible();
  });

  it("renders nothing when the patient has no opening balance notes", () => {
    const { container } = render(
      <OpeningBalanceSummary
        events={[]}
        locale="en-PH"
        patientId="10000000-0000-4000-8000-000000000004"
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
