import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { claims } from "../../../content/claims";
import { pricingCompetitorClaimId, pricingFaqs } from "../../../content/pricing";
import PricingPage from "./pricing-page";

vi.mock("../site-shell/sticky-cta", () => ({ default: () => null }));

describe("pricing page", () => {
  it("shows one honest design-partner plan with live inclusions and sourced context", () => {
    const { container } = render(<PricingPage />);
    const pricingSection = screen.getByRole("region", { name: "Karon Clinic" });

    expect(within(pricingSection).getAllByTestId("pricing-card")).toHaveLength(1);
    expect(within(pricingSection).getByText("Karon Clinic")).toBeVisible();
    expect(within(pricingSection).getByText("Founding-clinic pricing")).toBeVisible();
    expect(within(pricingSection).getByText("Confirmed with you before you join.")).toBeVisible();
    expect(within(pricingSection).getByText("No public list price yet.")).toBeVisible();
    expect(within(pricingSection).queryByText(/₱\s*\d/iu)).toBeNull();
    expect(within(pricingSection).getByText("Public signup opens after our founding clinics finish testing the full patient visit.")).toBeVisible();
    expect(within(pricingSection).getByRole("link", { name: "Book a demo" })).toHaveAttribute("href", "/demo?intent=demo");
    expect(within(pricingSection).queryByText(/every staff account included/iu)).toBeNull();
    expect(within(pricingSection).queryByText(/per clinic per month/iu)).toBeNull();
    expect(within(pricingSection).getByRole("link", { name: "ClinicPH pricing" })).toHaveAttribute(
      "href",
      "https://www.clinicph.health/pricing"
    );
    const competitor = claims[pricingCompetitorClaimId];
    const competitorDate = new Intl.DateTimeFormat("en-PH", {
      dateStyle: "long",
      timeZone: "UTC"
    }).format(new Date(`${competitor.asOf}T00:00:00Z`));
    expect(within(pricingSection).getByText(competitorDate).closest("time"))
      .toHaveAttribute("datetime", competitor.asOf);

    const included = within(pricingSection).getByRole("list", { name: "Included today" });
    expect(included.querySelectorAll('[data-claim-status="live"]')).toHaveLength(4);
    expect(included.querySelector('[data-claim-status="building"]')).toBeNull();
    expect(container.innerHTML).not.toMatch(/chair loop|countdown|only \d+ left|₱699|USD/iu);
  });

  it("answers pricing questions and emits safe design-partner schema", () => {
    const { container } = render(<PricingPage />);
    const schemas = [...container.querySelectorAll('script[type="application/ld+json"]')]
      .map(({ textContent }) => JSON.parse(textContent ?? "{}") as { [key: string]: unknown });
    const software = schemas.find((schema) => schema["@type"] === "SoftwareApplication");
    const faq = schemas.find((schema) => schema["@type"] === "FAQPage");

    pricingFaqs.forEach(({ question, answer }) => {
      expect(screen.getByText(question)).toBeVisible();
      expect(screen.getByText(answer)).toBeInTheDocument();
    });
    expect(screen.getByText("Pricing in other currencies on request.")).toBeVisible();
    expect(software).not.toHaveProperty("offers");
    expect(software).not.toHaveProperty("aggregateRating");
    expect(software).not.toHaveProperty("review");
    expect(faq).toBeDefined();
  });
});
