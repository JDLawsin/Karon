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
      signInWithPassword: vi.fn().mockResolvedValue({
        error: { message: "Invalid login" }
      }),
      signInWithOtp: vi.fn(),
      signInWithOAuth: vi.fn()
    }
  })
}));

import LoginForm from "./login-form";

describe("LoginForm", () => {
  it("offers password, magic-link, and Google sign-in", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText("Email")).toBeVisible();
    expect(screen.getByLabelText("Password", { exact: true })).toBeVisible();
    expect(screen.getByRole("button", { name: "Log in" })).toBeVisible();
    expect(screen.getByLabelText("Password", { exact: true })).toHaveAttribute(
      "type",
      "password"
    );
    expect(screen.getByRole("button", { name: "Email me a link" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Continue with Google" })
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Forgot password?" })
    ).toHaveAttribute("href", "/forgot-password");
  });

  it("shows a danger banner when password sign-in fails", async () => {
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "owner@clinic.test" }
    });
    fireEvent.change(screen.getByLabelText("Password", { exact: true }), {
      target: { value: "password1" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    const banner = await screen.findByRole("alert");

    expect(banner).toHaveTextContent("Could not log in");
    expect(banner).toHaveTextContent("Could not log in with those details.");
  });
});
