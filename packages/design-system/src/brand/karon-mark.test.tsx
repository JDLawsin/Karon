import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import KaronMark from "./karon-mark";

describe("KaronMark", () => {
  it("exposes an accessible name when used as the logo", () => {
    render(<KaronMark />);

    expect(screen.getByRole("img", { name: "Karon" })).toBeTruthy();
  });
});
