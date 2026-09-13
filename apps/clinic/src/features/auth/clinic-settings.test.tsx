import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const search = vi.hoisted(() => ({ tab: null as string | null }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/settings",
  useSearchParams: () => ({
    get: (key: string) => (key === "tab" ? search.tab : null),
    toString: () => (search.tab ? `tab=${search.tab}` : "")
  })
}));

vi.mock("@/features/auth/update-password-form", () => ({
  default: () => <div>Password form</div>
}));

vi.mock("@/features/auth/clinic-details-form", () => ({
  default: () => <h2>Clinic details</h2>,
  clinicDetailsFormId: "clinic-details-form"
}));

vi.mock("@/features/google-calendar/clinic-booking-settings", () => ({
  default: () => <h2>Bookings</h2>
}));

vi.mock("@/features/staff/clinic-staff", () => ({
  default: ({ section }: { section: string }) => <div>{section}</div>
}));

vi.mock("@/features/auth/clinic-staff-avatar", () => ({
  default: () => <div>Avatar</div>
}));

import { ClinicSessionProvider } from "@/lib/auth/clinic-session";

import ClinicSettings from "./clinic-settings";

const renderSettings = (role: "assistant" | "owner") =>
  render(
    <ClinicSessionProvider
      membership={{
        tenantId: "11111111-1111-4111-8111-111111111111",
        role
      }}
      userId="22222222-2222-4222-8222-222222222222"
    >
      <ClinicSettings />
    </ClinicSessionProvider>
  );

describe("ClinicSettings", () => {
  beforeEach(() => {
    search.tab = null;
  });

  it("hides clinic tabs for assistants", () => {
    renderSettings("assistant");

    expect(screen.getByRole("heading", { name: "Settings" })).toBeTruthy();
    expect(screen.queryByRole("tab", { name: "Account" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "Clinic" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "Integrations" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "Members" })).toBeNull();
    expect(screen.getByText("Password form")).toBeTruthy();
    expect(screen.queryByText("Clinic details")).toBeNull();
  });

  it("shows account, clinic, integrations, and members tabs for owners", () => {
    renderSettings("owner");

    expect(screen.getByRole("tab", { name: "Account" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Clinic" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Integrations" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Members" })).toBeTruthy();
    expect(screen.getByText("Password form")).toBeTruthy();
  });

  it("opens the clinic tab from the query string", () => {
    search.tab = "clinic";
    renderSettings("owner");

    expect(screen.getByRole("tab", { name: "Clinic" })).toHaveAttribute(
      "data-active"
    );
    expect(screen.getByText("Clinic details")).toBeVisible();
    expect(screen.queryByText("Bookings")).toBeNull();
    expect(screen.queryByText("staff")).toBeNull();
  });

  it("opens the integrations tab from the query string", () => {
    search.tab = "integrations";
    renderSettings("owner");

    expect(screen.getByRole("tab", { name: "Integrations" })).toHaveAttribute(
      "data-active"
    );
    expect(screen.getByText("Bookings")).toBeVisible();
    expect(screen.queryByText("Clinic details")).toBeNull();
    expect(screen.queryByText("staff")).toBeNull();
  });

  it("opens the members tab from the query string", () => {
    search.tab = "members";
    renderSettings("owner");

    expect(screen.getByRole("tab", { name: "Members" })).toHaveAttribute(
      "data-active"
    );
    expect(screen.getByText("staff")).toBeVisible();
    expect(screen.queryByText("Clinic details")).toBeNull();
    expect(screen.queryByText("Bookings")).toBeNull();
  });
});
