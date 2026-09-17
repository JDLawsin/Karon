import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusBadge } from "./status-badge";

describe("StatusBadge", () => {
  it("renders the status word with a role tone", () => {
    render(<StatusBadge tone="warning">Late</StatusBadge>);

    const badge = screen.getByText("Late");

    expect(badge.textContent).toBe("Late");
    expect(badge.className).toContain("bg-warning-subtle");
  });

  it("uses the primary role for an in-chair status", () => {
    render(<StatusBadge tone="primary">In chair</StatusBadge>);

    expect(screen.getByText("In chair").className).toContain("bg-primary");
  });
});
