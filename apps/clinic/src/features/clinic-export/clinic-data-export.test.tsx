import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ClinicDataExport from "./clinic-data-export";

describe("ClinicDataExport", () => {
  it("shows the three owner export actions and secure handling notice", () => {
    render(<ClinicDataExport />);

    expect(screen.getByRole("heading", { name: "Export clinic data" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Export patients" })).toHaveAttribute(
      "href",
      "/api/exports/patients"
    );
    expect(screen.getByRole("link", { name: "Export appointments" })).toHaveAttribute(
      "href",
      "/api/exports/appointments"
    );
    expect(screen.getByRole("link", { name: "Export payments" })).toHaveAttribute(
      "href",
      "/api/exports/payments"
    );
    expect(screen.getByText(/Store downloaded files securely/i)).toBeVisible();
  });
});
