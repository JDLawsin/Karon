import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sync = vi.hoisted(() => ({
  online: false,
  pendingCount: 1
}));
const leave = vi.hoisted(() => ({
  result: { status: "left" } as
    | { status: "left" }
    | { status: "blocked"; pendingCount: number }
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/today"
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabase: () => ({
    auth: {
      getSession: async () => ({ data: { session: null } }),
      getUser: async () => ({ data: { user: { user_metadata: {} } } }),
      updateUser: async () => ({ error: null })
    }
  })
}));

vi.mock("@/lib/sync/use-clinic-sync", () => ({
  useClinicSync: () => ({ online: sync.online, pendingCount: sync.pendingCount })
}));

vi.mock("@/lib/auth/leave-clinic-session", () => ({
  leaveClinicSession: vi.fn(async () => leave.result)
}));

vi.mock("@/features/auth/idle-lock-gate", () => ({
  default: ({ children }: { children: React.ReactNode }) => children
}));

vi.mock("@karon/design-system", async () => {
  const actual = await vi.importActual<typeof import("@karon/design-system")>(
    "@karon/design-system"
  );
  return {
    ...actual,
    ThemeToggle: () => null,
    useTheme: () => ({
      preference: "system" as const,
      resolved: "light" as const,
      setPreference: vi.fn()
    })
  };
});

import ClinicShell from "./clinic-shell";

const renderShell = (role: "assistant" | "owner" = "assistant") =>
  render(
    <ClinicShell
      appVersion="0.1.0"
      membership={{
        tenantId: "11111111-1111-4111-8111-111111111111",
        role
      }}
      userId="22222222-2222-4222-8222-222222222222"
    >
      Board
    </ClinicShell>
  );

describe("ClinicShell", () => {
  beforeEach(() => {
    sync.online = false;
    sync.pendingCount = 1;
    leave.result = { status: "left" };
  });

  it("shows an info banner when the outbox cannot sync", () => {
    renderShell();

    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent("Saved on this device. Will sync when online.");
    expect(banner.className).toContain("bg-info-subtle");
  });

  it("shows a syncing banner when online with a queued outbox", () => {
    sync.online = true;
    sync.pendingCount = 2;
    renderShell();

    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent("Saved on this device. Syncing.");
    expect(banner).not.toHaveTextContent("Will sync when online.");
    expect(banner.className).toContain("bg-info-subtle");
  });

  it("hides the sync banner when online and drained", () => {
    sync.online = true;
    sync.pendingCount = 0;
    renderShell();

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("keeps owner jobs off the assistant shell", async () => {
    renderShell();

    expect(screen.getByRole("link", { name: "Today" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Today's collections" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Clinic" })).toBeNull();
    expect(screen.getByRole("link", { name: "Settings" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Password" })).toBeNull();
    expect(screen.getByRole("button", { name: "Account menu" })).toBeTruthy();
    expect(
      await screen.findByRole("img", { name: "Assistant avatar" })
    ).toBeTruthy();
    expect(screen.getByText("Jobs")).toBeTruthy();
    expect(screen.getByText("Account")).toBeTruthy();
  });

  it("shows owner jobs", async () => {
    renderShell("owner");

    expect(screen.getByRole("link", { name: "Today" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Today's collections" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Clinic" })).toBeNull();
    expect(screen.getByRole("link", { name: "Settings" })).toBeTruthy();
    expect(await screen.findByRole("img", { name: "Owner avatar" })).toBeTruthy();
  });

  it("reserves a phone chrome action slot", () => {
    renderShell();

    expect(document.getElementById("clinic-chrome-actions")).toBeTruthy();
  });

  it("shows the app version and a desktop collapse control", () => {
    renderShell();

    expect(screen.getByText("Version 0.1.0")).toBeTruthy();
    expect(
      screen.getAllByRole("button", { name: "Toggle sidebar" }).length
    ).toBeGreaterThan(0);
    expect(document.querySelector('[data-slot="sidebar"]')).toHaveAttribute(
      "data-variant",
      "inset"
    );
    expect(document.querySelector('[data-slot="sidebar-inset"]')?.className).toContain(
      "rounded-lg"
    );
  });

  it("blocks sign-out with export and stay options while work is pending", async () => {
    leave.result = { status: "blocked", pendingCount: 2 };
    renderShell();

    const accountMenu = screen.getByRole("button", { name: "Account menu" });
    fireEvent.pointerDown(accountMenu, { button: 0, pointerType: "mouse" });
    fireEvent.click(accountMenu);
    fireEvent.click(await screen.findByRole("menuitem", { name: "Sign out" }));

    expect(
      await screen.findByRole("heading", { name: "Unsynced work is protected" })
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Export pending work" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Stay signed in" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Discard pending work..." }));
    expect(
      screen.getByRole("heading", { name: "Discard 2 pending changes?" })
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Discard and sign out" })).toBeVisible();
  });

  it("collapses the desktop rail when the toggle is pressed", () => {
    renderShell();

    const trigger = document.querySelector('[data-slot="sidebar-trigger"]');
    expect(trigger).toBeTruthy();
    fireEvent.click(trigger as HTMLButtonElement);

    expect(document.querySelector('[data-slot="sidebar"]')).toHaveAttribute(
      "data-collapsible",
      "icon"
    );
    expect(document.querySelector('[data-slot="sidebar"]')).toHaveAttribute(
      "data-variant",
      "inset"
    );
  });
});
