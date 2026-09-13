import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn(async () => ({ data: true }));
const authUser = vi.hoisted(() => ({ idleLockEnabled: true as boolean }));

vi.mock("next/link", () => ({
  default: ({
    children,
    href
  }: {
    children: string;
    href: string;
  }) => <a href={href}>{children}</a>
}));

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabase: () => ({
    rpc,
    auth: {
      getUser: async () => ({
        data: {
          user: { user_metadata: { idle_lock_enabled: authUser.idleLockEnabled } }
        }
      })
    }
  })
}));

vi.mock("@/lib/auth/audit", () => ({
  writeAuditEvent: vi.fn(async () => {})
}));

vi.mock("@/lib/auth/leave-clinic-session", () => ({
  leaveClinicSession: vi.fn(async () => {})
}));

import { IDLE_LOCK_ENABLED_EVENT, IDLE_WARN_MS, notifyIdleLockEnabled } from "./idle-lock";
import IdleLockGate from "./idle-lock-gate";

const membership = {
  tenantId: "11111111-1111-4111-8111-111111111111" as const,
  role: "owner" as const
};
const userId = "22222222-2222-4222-8222-222222222222";

describe("IdleLockGate", () => {
  beforeEach(() => {
    authUser.idleLockEnabled = true;
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    rpc.mockClear();
  });

  it("locks immediately when the clinic session is already inactive", async () => {
    render(
      <IdleLockGate membership={membership} sessionActive={false} userId={userId}>
        Board
      </IdleLockGate>
    );

    expect(
      await screen.findByRole("heading", { name: "Session locked" })
    ).toBeVisible();
  });

  it("keeps a warned session when the user is still clicking", async () => {
    sessionStorage.setItem(
      `karon-idle-last-active:${userId}`,
      String(Date.now() - IDLE_WARN_MS)
    );

    render(
      <IdleLockGate membership={membership} sessionActive userId={userId}>
        Board
      </IdleLockGate>
    );

    expect(
      await screen.findByRole("heading", { name: "Stay signed in?" })
    ).toBeVisible();
    expect(screen.getByText("Don't want this security feature?")).toBeVisible();
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "href",
      "/settings"
    );

    window.dispatchEvent(new Event("pointerdown"));

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Stay signed in?" })
      ).not.toBeInTheDocument();
    });
    expect(
      screen.queryByRole("heading", { name: "Session locked" })
    ).not.toBeInTheDocument();
  });

  it("does not warn when idle lock is off on the account", async () => {
    authUser.idleLockEnabled = false;
    sessionStorage.setItem(
      `karon-idle-last-active:${userId}`,
      String(Date.now() - IDLE_WARN_MS)
    );

    render(
      <IdleLockGate membership={membership} sessionActive userId={userId}>
        Board
      </IdleLockGate>
    );

    await waitFor(() => {
      expect(rpc).toHaveBeenCalled();
    });
    expect(
      screen.queryByRole("heading", { name: "Stay signed in?" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Session locked" })
    ).not.toBeInTheDocument();
  });

  it("stops warning when the account turns idle lock off", async () => {
    sessionStorage.setItem(
      `karon-idle-last-active:${userId}`,
      String(Date.now() - IDLE_WARN_MS)
    );

    render(
      <IdleLockGate membership={membership} sessionActive userId={userId}>
        Board
      </IdleLockGate>
    );

    expect(
      await screen.findByRole("heading", { name: "Stay signed in?" })
    ).toBeVisible();

    window.dispatchEvent(
      new CustomEvent(IDLE_LOCK_ENABLED_EVENT, { detail: false })
    );

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Stay signed in?" })
      ).not.toBeInTheDocument();
    });
    expect(
      screen.queryByRole("heading", { name: "Session locked" })
    ).not.toBeInTheDocument();
  });

  it("stops warning when another tab turns idle lock off", async () => {
    sessionStorage.setItem(
      `karon-idle-last-active:${userId}`,
      String(Date.now() - IDLE_WARN_MS)
    );

    render(
      <IdleLockGate membership={membership} sessionActive userId={userId}>
        Board
      </IdleLockGate>
    );

    expect(
      await screen.findByRole("heading", { name: "Stay signed in?" })
    ).toBeVisible();

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: IDLE_LOCK_ENABLED_EVENT,
        newValue: "0"
      })
    );

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Stay signed in?" })
      ).not.toBeInTheDocument();
    });
    expect(
      screen.queryByRole("heading", { name: "Session locked" })
    ).not.toBeInTheDocument();
  });

  it("writes the idle lock preference for other tabs", () => {
    notifyIdleLockEnabled(false);
    expect(localStorage.getItem(IDLE_LOCK_ENABLED_EVENT)).toBe("0");
    notifyIdleLockEnabled(true);
    expect(localStorage.getItem(IDLE_LOCK_ENABLED_EVENT)).toBe("1");
  });

  it("touches the clinic session while idle lock preference is loading", async () => {
    render(
      <IdleLockGate membership={membership} sessionActive userId={userId}>
        Board
      </IdleLockGate>
    );

    await waitFor(() => {
      expect(rpc).toHaveBeenCalled();
    });
    expect(
      screen.queryByRole("heading", { name: "Session locked" })
    ).not.toBeInTheDocument();
  });
});
