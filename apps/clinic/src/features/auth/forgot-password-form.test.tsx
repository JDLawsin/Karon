import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() })
}));

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
    auth: {
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null })
    }
  })
}));

import ForgotPasswordForm from "./forgot-password-form";

describe("ForgotPasswordForm", () => {
  it("asks for an email and a reset link", () => {
    render(<ForgotPasswordForm />);

    expect(screen.getByLabelText("Email")).toBeVisible();
    expect(screen.getByRole("button", { name: "Send reset link" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute(
      "href",
      "/login"
    );
  });

  it("shows a confirmation panel after sending a reset link", async () => {
    render(<ForgotPasswordForm />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "owner@clinic.test" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));

    const banner = await screen.findByRole("status");

    expect(banner).toHaveTextContent("Check your email");
    expect(banner).toHaveTextContent("Check your email for a reset link.");
    expect(
      screen.getByRole("button", { name: "Use a different email" })
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Send reset link" })
    ).toBeNull();
  });
});
