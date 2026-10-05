import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { featureFaqs, featureGroups } from "../../../content/features";
import { securityControls, securityFaqs } from "../../../content/security";
import { switchingComparison } from "../../../content/switching";
import ProductPage from "./product-page";

vi.mock("../site-shell/sticky-cta", () => ({ default: () => null }));

describe("product page", () => {
  it("sells the live clinic workflow and keeps every capability status honest", () => {
    const { container } = render(<ProductPage />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "From booking request to today's chair." })).toBeVisible();
    expect(screen.getByText("Illustrative workflow · fake patient data")).toBeVisible();
    expect(screen.getAllByText("Live now").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Building with founding clinics").length).toBeGreaterThan(0);
    featureGroups.forEach(({ title }) => expect(screen.getByRole("heading", { name: title })).toBeVisible());
    expect(container.querySelector('[data-claim-id="google-calendar"]')).not.toBeInTheDocument();
    expect(container.innerHTML).not.toMatch(/oracle|proof|commit|apps\/clinic/iu);
  });

  it("keeps switching, security, and FAQ evidence on the same page", () => {
    const { container } = render(<ProductPage />);
    const table = screen.getByRole("table", { name: "Karon compared with a notebook and Messenger" });
    const security = screen.getByRole("heading", { name: "Trust should be plain enough to read" }).closest("section");
    const schema = container.querySelector('script[type="application/ld+json"]');

    expect(table.querySelectorAll("tbody")).toHaveLength(switchingComparison.length);
    expect(container.querySelector('[data-claim-id="import"]')).toHaveAttribute("data-claim-status", "absent");
    securityControls.forEach(({ claimId, explanation }) => {
      expect(within(security as HTMLElement).getByText(explanation)).toBeVisible();
      expect(security?.querySelector(`[data-claim-id="${claimId}"]`)).not.toBeNull();
    });
    [...featureFaqs, ...securityFaqs].forEach(({ question, answer }) => {
      expect(screen.getByText(question)).toBeVisible();
      expect(schema?.textContent).toContain(JSON.stringify(answer).slice(1, -1));
    });
    expect(screen.getByRole("link", { name: "Found a security issue? Here's how to report it." })).toHaveAttribute("href", "/.well-known/security.txt");
  });
});
