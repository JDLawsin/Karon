import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { claims } from "../../../content/claims";
import { switchingComparison } from "../../../content/switching";
import SwitchingPage from "./switching-page";

vi.mock("../site-shell/sticky-cta", () => ({ default: () => null }));

describe("switching page", () => {
  it("renders one semantic table with a registry-backed Karon cell per task", () => {
    const { container } = render(<SwitchingPage />);
    const table = screen.getByRole("table", { name: "Karon compared with a notebook and Messenger" });
    const groups = table.querySelectorAll("tbody");

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("columnheader", { name: "Notebook and Messenger" }))
      .toHaveAttribute("id", "comparison-notebook-heading");
    expect(screen.getByRole("columnheader", { name: "Karon" }))
      .toHaveAttribute("id", "comparison-karon-heading");
    expect(groups).toHaveLength(switchingComparison.length);

    groups.forEach((group, index) => {
      const taskHeader = group.querySelector('th[scope="colgroup"]');
      const notebookCell = group.querySelector('[data-comparison-side="notebook"]');
      const karonCell = group.querySelector('[data-comparison-side="karon"]');
      const claimId = switchingComparison[index]?.karonClaimId;
      const taskHeaderId = `comparison-task-${index}`;

      expect(taskHeader).toHaveAttribute("colspan", "2");
      expect(taskHeader).toHaveAttribute("id", taskHeaderId);
      expect(notebookCell).toHaveAttribute("headers", `${taskHeaderId} comparison-notebook-heading`);
      expect(karonCell).toHaveAttribute("headers", `${taskHeaderId} comparison-karon-heading`);
      expect(karonCell?.querySelector(`[data-claim-id="${claimId}"]`)).not.toBeNull();
      if (claimId && claims[claimId].status !== "live") {
        expect(within(karonCell as HTMLElement).getByText("Building with founding clinics")).toBeVisible();
      }
    });

    expect(container.querySelectorAll("table")).toHaveLength(1);
  });

  it("labels the unavailable records move and checklist without a shipped import promise", () => {
    const { container } = render(<SwitchingPage />);
    const importClaim = container.querySelector('[data-claim-id="import"]');
    const checklist = screen.getByRole("heading", { name: "A weekend switching checklist" }).closest("section");

    expect(importClaim).not.toBeNull();
    expect(importClaim).toHaveAttribute("data-claim-status", "absent");
    expect(within(importClaim as HTMLElement).getByText("Coming before public launch")).toBeVisible();
    expect(within(checklist as HTMLElement).getByText("Preview")).toBeVisible();
    expect(container).not.toHaveTextContent(/import your patients|bring your list in/iu);
  });

  it("uses neutral notebook wording and names no software vendor", () => {
    render(<SwitchingPage />);

    expect(screen.getByText("Replies depend on who is holding the phone and can check the notebook.")).toBeVisible();
    expect(document.body).not.toHaveTextContent(/Dentrix|Open Dental|Curve Dental/iu);
  });
});
