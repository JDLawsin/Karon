import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Card, CardHeader, CardTitle } from "./card";

describe("Card", () => {
  it("groups with fill, not a hairline", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
        </CardHeader>
      </Card>
    );

    const card = screen.getByText("Password").closest("[data-slot='card']");

    expect(card?.className).toContain("bg-card");
    expect(card?.className).toContain("border-(length:var(--surface-border-width))");
    expect(card?.className).not.toContain("ring-1");
  });
});
