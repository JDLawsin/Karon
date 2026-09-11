import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sync = vi.hoisted(() => ({
  online: false,
  pendingCount: 1
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() })
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>
}));

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabase: vi.fn()
}));

vi.mock("@/lib/sync/use-clinic-sync", () => ({
  useClinicSync: () => ({ online: sync.online, pendingCount: sync.pendingCount })
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
    ThemeToggle: () => null
  };
});

import ClinicShell from "./clinic-shell";

const renderShell = () =>
  render(
    <ClinicShell
      membership={{
        tenantId: "11111111-1111-4111-8111-111111111111",
        role: "assistant"
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
});
