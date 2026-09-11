import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() })
}));

import UpdatePasswordForm from "./update-password-form";

describe("UpdatePasswordForm", () => {
  it("asks for a new password after recovery", () => {
    render(<UpdatePasswordForm passwordRecovery />);

    expect(screen.getByLabelText("New password")).toBeVisible();
    expect(screen.getByLabelText("Confirm password")).toBeVisible();
    expect(screen.queryByLabelText("Current password")).toBeNull();
    expect(screen.getByRole("button", { name: "Update password" })).toBeVisible();
  });

  it("asks for the current password on a logged-in change", () => {
    render(<UpdatePasswordForm passwordRecovery={false} />);

    expect(screen.getByLabelText("Current password")).toBeVisible();
    expect(screen.getByLabelText("New password")).toBeVisible();
    expect(screen.getByLabelText("Confirm password")).toBeVisible();
    expect(screen.getByRole("button", { name: "Update password" })).toBeVisible();
  });
});
