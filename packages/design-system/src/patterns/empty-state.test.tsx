import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
  it("renders a page heading and body", () => {
    render(
      <EmptyState title="Today">Today&apos;s board is next.</EmptyState>
    );

    expect(screen.getByRole("heading", { level: 1, name: "Today" })).toBeTruthy();
    expect(screen.getByText("Today's board is next.")).toBeTruthy();
  });
});
