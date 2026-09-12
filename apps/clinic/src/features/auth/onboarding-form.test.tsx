import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() })
}));

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabase: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } })
    }
  })
}));

import OnboardingForm from "./onboarding-form";

describe("OnboardingForm", () => {
  it("clears a step error after the field is filled and after a valid continue", () => {
    render(<OnboardingForm />);

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(
      screen.getByText("Enter a clinic name of at least 2 characters.")
    ).toBeVisible();

    fireEvent.change(screen.getByLabelText("Clinic name"), {
      target: { value: "Sunrise Dental" }
    });
    expect(
      screen.queryByText("Enter a clinic name of at least 2 characters.")
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Clinic phone"), {
      target: { value: "09171234567" }
    });
    fireEvent.change(screen.getByLabelText("Clinic email"), {
      target: { value: "clinic@example.com" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByText(/step 2 of 5/i)).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByLabelText("Clinic name")).toHaveValue("Sunrise Dental");
    expect(
      screen.queryByText("Enter a clinic name of at least 2 characters.")
    ).not.toBeInTheDocument();
  });
});
