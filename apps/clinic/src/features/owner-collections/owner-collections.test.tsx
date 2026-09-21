import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  parseCollectionsDay,
  parseCollectionsReport,
  type CollectionsReport
} from "./owner-collections";
import OwnerCollectionsScreen from "./owner-collections-screen";

const report: CollectionsReport = {
  day: "2026-09-21",
  clinicToday: "2026-09-21",
  timezone: "Asia/Manila",
  currency: "PHP",
  paymentCount: 3,
  paidMinor: 150_000,
  outstandingMinor: 50_000,
  methods: {
    cash: 100_000,
    gcash: 50_000,
    maya: 0,
    card: 0,
    other: 0,
    unpaid: 50_000
  }
};

describe("owner collections", () => {
  it("parses the projector row without trusting RPC values", () => {
    expect(
      parseCollectionsReport({
        day: "2026-09-21",
        clinic_today: "2026-09-21",
        timezone: "Asia/Manila",
        currency: "PHP",
        payment_count: 3,
        paid_minor: "150000",
        outstanding_minor: 50_000,
        cash_minor: 100_000,
        gcash_minor: 50_000,
        maya_minor: 0,
        card_minor: 0,
        other_minor: 0
      })
    ).toEqual(report);
    expect(parseCollectionsDay("2026-02-29")).toBeNull();
    expect(parseCollectionsDay(["2026-09-20", "2026-09-21"])).toBeNull();
  });

  it("shows paid, outstanding, and only recorded methods", () => {
    render(<OwnerCollectionsScreen report={report} />);

    expect(screen.getByRole("heading", { name: "Daily collections" })).toBeVisible();
    expect(screen.getByText("₱1,500.00")).toBeVisible();
    expect(screen.getAllByText("₱500.00")).toHaveLength(3);
    expect(screen.getByText("Cash")).toBeVisible();
    expect(screen.getByText("GCash")).toBeVisible();
    expect(screen.getByText("Unpaid")).toBeVisible();
    expect(screen.queryByText("Maya")).not.toBeInTheDocument();
  });

  it("shows an honest empty state only when there are no payment records", () => {
    render(<OwnerCollectionsScreen report={{ ...report, paymentCount: 0 }} />);

    expect(screen.getByText("No collections for this day")).toBeVisible();
    expect(screen.queryByText("Paid")).not.toBeInTheDocument();
  });
});
