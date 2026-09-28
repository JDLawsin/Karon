import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import EntitlementScreen from "./entitlement-screen";

describe("EntitlementScreen", () => {
  it("shows remaining trial days from the server snapshot", () => {
    render(
      <EntitlementScreen
        entitlement={{
          status: "trialing",
          source: "trial",
          startsAt: "2026-09-28T00:00:00.000Z",
          endsAt: "2026-10-05T00:00:00.000Z",
          daysRemaining: 7,
          hasAccess: true
        }}
        role="owner"
      />
    );

    expect(screen.getByRole("heading", { name: "Trial and Pay Karon" })).toBeVisible();
    expect(screen.getByText("Trial")).toBeVisible();
    expect(screen.getByRole("heading", { name: "7 days left" })).toBeVisible();
  });

  it("gives an expired assistant a doctor path and promises no local wipe", () => {
    render(
      <EntitlementScreen
        entitlement={{
          status: "expired",
          source: "trial",
          startsAt: "2026-09-01T00:00:00.000Z",
          endsAt: "2026-09-08T00:00:00.000Z",
          daysRemaining: 0,
          hasAccess: false
        }}
        role="assistant"
      />
    );

    expect(screen.getByText("Ask the doctor to continue the subscription.")).toBeVisible();
    expect(screen.getByText(/does not erase the local outbox/i)).toBeVisible();
  });

  it("labels manual access without offering public checkout", () => {
    render(
      <EntitlementScreen
        entitlement={{
          status: "active",
          source: "manual",
          startsAt: "2026-09-28T00:00:00.000Z",
          endsAt: "2026-12-31T00:00:00.000Z",
          daysRemaining: 95,
          hasAccess: true
        }}
        role="owner"
      />
    );

    expect(screen.getByText("Design partner access")).toBeVisible();
    expect(screen.getByText(/no public checkout is needed/i)).toBeVisible();
    expect(screen.queryByRole("button", { name: /pay/i })).toBeNull();
  });
});
