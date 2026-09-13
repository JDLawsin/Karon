import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn(async () => ({ data: true }));

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabase: () => ({
    rpc
  })
}));

vi.mock("@/lib/auth/audit", () => ({
  writeAuditEvent: vi.fn(async () => {})
}));

vi.mock("@/lib/auth/leave-clinic-session", () => ({
  leaveClinicSession: vi.fn(async () => {})
}));

import { IDLE_WARN_MS } from "./idle-lock";
import IdleLockGate from "./idle-lock-gate";

const membership = {
  tenantId: "11111111-1111-4111-8111-111111111111" as const,
  role: "owner" as const
};
const userId = "22222222-2222-4222-8222-222222222222";

describe("IdleLockGate", () => {
  afterEach(() => {
    sessionStorage.clear();
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
});
