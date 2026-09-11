import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Alert } from "./alert";

describe("Alert", () => {
  it("renders a danger banner as an alert with its title", () => {
    render(
      <Alert title="Could not log in" variant="danger">
        Could not log in with those details.
      </Alert>
    );

    const banner = screen.getByRole("alert");

    expect(banner.textContent).toContain("Could not log in");
    expect(banner.textContent).toContain("Could not log in with those details.");
    expect(banner.className).toContain("bg-destructive-subtle");
  });

  it("renders an info banner as status", () => {
    render(
      <Alert title="Check your email" variant="info">
        Check your email for a sign-in link.
      </Alert>
    );

    const banner = screen.getByRole("status");

    expect(banner.textContent).toContain("Check your email");
    expect(banner.className).toContain("bg-info-subtle");
  });
});
