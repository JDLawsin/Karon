import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const SESSION_ID = "22222222-2222-4222-8222-222222222222";
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
const leave = vi.hoisted(() => ({
  result: { status: "blocked", pendingCount: 2 } as
    | { status: "left" }
    | { status: "blocked"; pendingCount: number }
}));
const toast = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/auth/clinic-session", () => ({
  useClinicSession: () => ({ userId: USER_ID })
}));
vi.mock("@/features/auth/staff-avatar-preference", () => ({
  useStaffAvatarPreference: () => ({
    resolvedSeed: USER_ID,
    resolvedStyle: "notionists-neutral",
    ready: true
  })
}));
vi.mock("@/lib/auth/leave-clinic-session", () => ({
  leaveClinicSession: vi.fn(async () => leave.result)
}));
vi.mock("@/lib/supabase/browser", () => ({ createBrowserSupabase: () => ({}) }));
vi.mock("@karon/design-system", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@karon/design-system")>()),
  showErrorToast: toast
}));

import ClinicStaff from "./clinic-staff";

describe("ClinicStaff current device", () => {
  beforeEach(() => {
    router.push.mockClear();
    router.refresh.mockClear();
    toast.mockClear();
    leave.result = { status: "blocked", pendingCount: 2 };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (!init?.method || init.method === "GET") {
          return Response.json({
            members: [],
            sessions: [
              {
                id: SESSION_ID,
                userId: USER_ID,
                email: "owner@example.com",
                lastActiveAt: "2026-09-22T01:00:00.000Z",
                revokedAt: null,
                isCurrent: true
              }
            ]
          });
        }

        return Response.json({ ok: true });
      })
    );
  });

  it("checks protected work before revoking the current device", async () => {
    render(<ClinicStaff section="devices" />);

    fireEvent.click(await screen.findByRole("button", { name: "Revoke device" }));
    fireEvent.click(screen.getByRole("button", { name: "Revoke and log out" }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        "Unsynced clinic work is protected. Use Sign out to export or discard it."
      )
    );
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();
  });
});
