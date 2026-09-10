import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import KaronWordmark from "./karon-wordmark";

describe("KaronWordmark", () => {
  it("shows the product name and hides the nested mark from AT", () => {
    render(<KaronWordmark />);

    expect(screen.getByText("Karon")).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
  });
});
