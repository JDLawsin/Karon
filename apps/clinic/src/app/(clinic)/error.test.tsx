import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ClinicError from "./error";

describe("clinic error recovery", () => {
  it("keeps clinic recovery actions available without exposing the error", () => {
    const reset = vi.fn();

    render(<ClinicError error={new Error("Private patient detail")} reset={reset} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Something went wrong" })
    ).toBeTruthy();
    expect(screen.queryByText("Private patient detail")).toBeNull();
    expect(
      screen.getByRole("link", { name: "Return to Today" }).getAttribute("href")
    ).toBe("/today");

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledOnce();
  });
});
