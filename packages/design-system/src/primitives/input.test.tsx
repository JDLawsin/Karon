import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Input } from "./input";

describe("Input", () => {
  it("renders a clinic-sized named field", () => {
    render(<Input aria-label="Email" type="email" />);

    expect(screen.getByRole("textbox", { name: "Email" }).className).toContain(
      "min-h-[var(--control-min-height)]"
    );
  });

  it("marks an invalid field with a danger border", () => {
    render(<Input aria-invalid aria-label="Email" type="email" />);

    expect(screen.getByRole("textbox", { name: "Email" }).className).toContain(
      "aria-invalid:border-destructive"
    );
  });
});
