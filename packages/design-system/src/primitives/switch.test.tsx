import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Switch } from "./switch";

describe("Switch", () => {
  it("renders a named clinic-sized control", () => {
    render(<Switch aria-label="Auto-confirm bookings" />);

    const control = screen.getByRole("switch", { name: "Auto-confirm bookings" });
    const track = control.closest("[data-slot='switch']") ?? control;

    expect(track.className).toContain("after:h-(--control-min-height)");
    expect(track.className).toContain("data-checked:bg-primary");
  });
});
