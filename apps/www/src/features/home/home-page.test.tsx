import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { homepageFaqs } from "../../../content/homepage";
import HomePage from "./home-page";

vi.mock("../site-shell/sticky-cta", () => ({ default: () => null }));

describe("marketing homepage", () => {
  it("renders the honest fallback headline, live workflow, roadmap, and CTA order", () => {
    const { container } = render(<HomePage headlineId="headline-one-inbox" />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Every booking lands in one inbox, not in your Messenger chats." })).toBeVisible();
    expect(screen.getByRole("heading", { name: "How a day works" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "What founding clinics are shaping next" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Questions small clinics ask first" })).toBeVisible();
    expect(screen.getAllByRole("link", { name: "Apply as a founding clinic" }).length).toBeGreaterThan(0);
    expect(container.querySelector('[data-claim-id="booking-link"]')).toHaveAttribute("data-claim-status", "live");
    expect(container.querySelector('[data-claim-id="import"]')).toHaveAttribute("data-claim-status", "absent");
    expect(container.querySelectorAll('[data-home-section="trust"] [data-claim-status="live"]')).toHaveLength(4);
    expect(screen.getByText("Illustrative Karon Today preview using fake patient data.")).toBeInTheDocument();
    expect(screen.getByText(/· Claims checked/)).toBeVisible();
    expect(container.querySelector('[role="img"]')).not.toBeInTheDocument();
    expect([...container.querySelectorAll("[data-home-section]")].map((section) =>
      section.getAttribute("data-home-section")
    )).toEqual(["hero", "live-workflow", "roadmap", "trust", "pricing", "faq", "final-cta"]);
  });

  it("keeps FAQ answers within the approved answer-first length and mirrors them in JSON-LD", () => {
    const { container } = render(<HomePage headlineId="headline-one-inbox" />);
    const schema = container.querySelector('script[type="application/ld+json"]');
    const schemaText = schema?.textContent ?? "";

    homepageFaqs.forEach(({ question, answer }) => {
      const wordCount = answer.split(/\s+/u).length;
      expect(wordCount).toBeGreaterThanOrEqual(40);
      expect(wordCount).toBeLessThanOrEqual(60);
      expect(screen.getByText(question)).toBeVisible();
      expect(screen.getByText(answer)).toBeInTheDocument();
      expect(schemaText).toContain(JSON.stringify(answer).slice(1, -1));
    });
  });
});
