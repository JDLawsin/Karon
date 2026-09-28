import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ErrorPage from "./error";

describe("route error recovery", () => {
  it("lets the user retry or return to Karon without exposing the error", () => {
    const reset = vi.fn();

    render(<ErrorPage error={new Error("Private patient detail")} reset={reset} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Something went wrong" })
    ).toBeTruthy();
    expect(screen.queryByText("Private patient detail")).toBeNull();
    expect(screen.getByRole("link", { name: "Go to Karon" }).getAttribute("href")).toBe(
      "/"
    );

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledOnce();
  });
});
