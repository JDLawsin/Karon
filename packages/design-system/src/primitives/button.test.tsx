import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "./button";

describe("Button", () => {
  it("renders an accessible clinic-sized control", () => {
    render(<Button type="button">Save visit</Button>);

    expect(
      screen.getByRole("button", { name: "Save visit" }).className
    ).toContain("min-h-[var(--control-min-height)]");
  });
});
