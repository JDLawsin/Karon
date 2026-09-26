import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
const leave = vi.hoisted(() => ({
  result: { status: "blocked", pendingCount: 2 } as
    | { status: "left" }
    | { status: "blocked"; pendingCount: number }
}));

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/auth/leave-clinic-session", () => ({
  leaveClinicSession: vi.fn(async () => leave.result)
}));
vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabase: () => ({
    auth: {
      mfa: {
        listFactors: vi.fn(async () => ({
          data: { all: [], totp: [{ id: "factor-id", status: "verified" }] },
          error: null
        }))
      }
    }
  })
}));

import MfaForm from "./mfa-form";

describe("MfaForm", () => {
  beforeEach(() => {
    router.push.mockClear();
    router.refresh.mockClear();
    leave.result = { status: "blocked", pendingCount: 2 };
  });

  it("keeps the session when sign-out is blocked by pending clinic work", async () => {
    render(<MfaForm />);

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(
      await screen.findByText("Unsynced clinic work is protected on this device.")
    ).toBeVisible();
    await waitFor(() => expect(router.push).not.toHaveBeenCalled());
  });
});
