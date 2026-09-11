import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PasswordField from "./password-field";

describe("PasswordField", () => {
  it("renders a native password input with an optional hint", () => {
    render(
      <PasswordField
        autoComplete="current-password"
        hint="At least 12 characters."
        id="password"
        name="password"
      />
    );

    const input = screen.getByLabelText("Password", { exact: true });

    expect(input).toHaveAttribute("type", "password");
    expect(screen.getByText("At least 12 characters.")).toBeVisible();
  });
});
