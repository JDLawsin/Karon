import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageHeader } from "./page-header";

describe("PageHeader", () => {
  it("renders a page heading, description, and actions", () => {
    render(
      <PageHeader description="12 Sep" title="Today">
        <button type="button">Add patient</button>
      </PageHeader>
    );

    expect(screen.getByRole("heading", { level: 1, name: "Today" })).toBeTruthy();
    expect(screen.getByText("12 Sep")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add patient" })).toBeTruthy();
  });
});
