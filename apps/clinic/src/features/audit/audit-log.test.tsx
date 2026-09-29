import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AuditLog from "./audit-log";
import { parseAuditEvents } from "./audit-log-data";

const events = parseAuditEvents([
  {
    id: "11111111-1111-4111-8111-111111111111",
    tenant_id: "22222222-2222-4222-8222-222222222222",
    actor_user_id: "33333333-3333-4333-8333-333333333333",
    event_type: "appointment.set",
    record_id: "44444444-4444-4444-8444-444444444444",
    metadata: {
      patient_id: "55555555-5555-4555-8555-555555555555",
      status: "confirmed"
    },
    created_at: "2026-09-29T03:15:00.000Z"
  }
]);

describe("audit log", () => {
  it("parses only bounded metadata values from the database edge", () => {
    expect(events).toHaveLength(1);
    expect(() =>
      parseAuditEvents([
        {
          ...events[0],
          metadata: { note: "x".repeat(501) }
        }
      ])
    ).toThrow();
  });

  it("shows the recent action, actor, tenant, entity, and non-SPI summary", () => {
    render(
      <AuditLog
        events={events}
        locale="en-PH"
        timezone="Asia/Manila"
      />
    );

    expect(screen.getByRole("heading", { name: "Recent audit activity" })).toBeVisible();
    expect(screen.getByText("Appointment set")).toBeVisible();
    expect(screen.getByText("33333333-3333-4333-8333-333333333333")).toBeVisible();
    expect(screen.getByText("22222222-2222-4222-8222-222222222222")).toBeVisible();
    expect(screen.getByText("44444444-4444-4444-8444-444444444444")).toBeVisible();
    expect(screen.getByText("Patient 55555555-5555-4555-8555-555555555555 · Status confirmed")).toBeVisible();
    expect(screen.getByText("Sep 29, 2026, 11:15 AM")).toBeVisible();
  });

  it("shows an honest empty state", () => {
    render(
      <AuditLog events={[]} locale="en-PH" timezone="Asia/Manila" />
    );

    expect(screen.getByText("No audit activity yet")).toBeVisible();
  });
});
