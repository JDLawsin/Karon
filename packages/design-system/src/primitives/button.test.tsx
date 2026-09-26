import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "./button";

describe("Button", () => {
  it("renders an accessible clinic-sized control", () => {
    render(<Button type="button">Save visit</Button>);

    const className = screen.getByRole("button", { name: "Save visit" }).className;

    expect(className).toContain("min-h-[var(--control-min-height)]");
    expect(className).toContain("hover:bg-primary-hovered");
    expect(className).not.toContain("min-h-10");
  });

  it("uses the destructive role for irreversible actions", () => {
    render(
      <Button type="button" variant="destructive">
        Discard pending work
      </Button>
    );

    expect(
      screen.getByRole("button", { name: "Discard pending work" }).className
    ).toContain("bg-destructive");
  });
});
