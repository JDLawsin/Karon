import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { featureFaqs, featureGroups } from "../../../content/features";
import FeaturesPage from "./features-page";

vi.mock("../site-shell/sticky-cta", () => ({ default: () => null }));

describe("what works today page", () => {
  it("renders the owner jobs, honest statuses, dates, and descriptive card links", () => {
    const { container } = render(<FeaturesPage />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(featureGroups.map(({ title }) => screen.getByRole("heading", { name: title }))).toHaveLength(4);
    expect(screen.getAllByText("Live now").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Building with founding clinics").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^Checked \d{4}-\d{2}-\d{2}$/u).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "See pricing for founding clinics" })).toHaveLength(4);
    expect(screen.getAllByRole("link", { name: "Apply as a founding clinic" }).length).toBeGreaterThanOrEqual(4);
    container.querySelectorAll("[data-feature-row]").forEach((row) => {
      expect(within(row as HTMLElement).getByRole("link", { name: "See pricing for this capability" })).toHaveAttribute("href", "/pricing");
      expect(within(row as HTMLElement).getByRole("link", { name: "Discuss this capability in a demo" })).toHaveAttribute("href", "/demo?intent=application");
    });
    expect(container.querySelector('[data-claim-id="google-calendar"]')).not.toBeInTheDocument();
    expect(container.innerHTML).not.toMatch(/oracle|proof|commit|apps\/clinic/iu);
  });

  it("renders a live-only changelog and mirrors three answers in FAQ schema", () => {
    const { container } = render(<FeaturesPage />);
    const shipped = screen.getByRole("heading", { name: "Recently shipped" }).closest("section");
    const schema = container.querySelector('script[type="application/ld+json"]');

    expect(shipped).not.toBeNull();
    expect(within(shipped as HTMLElement).getAllByRole("time")).toHaveLength(3);
    expect(featureFaqs).toHaveLength(3);
    featureFaqs.forEach(({ question, answer }) => {
      expect(screen.getByText(question)).toBeVisible();
      expect(screen.getByText(answer)).toBeVisible();
      expect(schema?.textContent).toContain(JSON.stringify(answer).slice(1, -1));
    });
  });
});
