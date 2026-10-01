import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { claims } from "../../../content/claims";
import { securityControls, securityFaqs } from "../../../content/security";
import SecurityPage from "./security-page";

describe("security page", () => {
  it("renders only the four live, proven security controls without internal proof", () => {
    const { container } = render(<SecurityPage />);
    const controls = screen.getByRole("heading", { name: "Controls available today" }).closest("section");

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(securityControls).toHaveLength(4);
    securityControls.forEach(({ claimId, explanation }) => {
      const claim = claims[claimId];

      expect(claim.status).toBe("live");
      expect("proof" in claim).toBe(true);
      expect(within(controls as HTMLElement).getByText(claim.text)).toBeVisible();
      expect(within(controls as HTMLElement).getByText(explanation)).toBeVisible();
    });
    expect(container.innerHTML).not.toMatch(/oracle|proof|commit|apps\/clinic|[0-9a-f]{7,40}/iu);
    expect(container.querySelector("img, [role='img']")).toBeNull();
  });

  it("links to security.txt and mirrors native FAQ answers in FAQPage schema", () => {
    const { container } = render(<SecurityPage />);
    const disclosure = screen.getByRole("link", { name: "Found a security issue? Here's how to report it." });
    const schema = container.querySelector('script[type="application/ld+json"]');

    expect(disclosure).toHaveAttribute("href", "/.well-known/security.txt");
    expect(securityFaqs.length).toBeGreaterThanOrEqual(3);
    expect(securityFaqs.map(({ claimId }) => claimId))
      .toEqual(securityControls.map(({ claimId }) => claimId));
    securityFaqs.forEach(({ question, answer }) => {
      const summary = screen.getByText(question);

      expect(summary.closest("details")).not.toBeNull();
      expect(screen.getAllByText(answer).length).toBeGreaterThan(0);
      expect(schema?.textContent).toContain(JSON.stringify(answer).slice(1, -1));
    });
  });

  it("contains no prohibited or counsel-dependent wording", () => {
    const { container } = render(<SecurityPage />);

    expect(container).not.toHaveTextContent(/HIPAA|GDPR|NPC compliant|NPC registered|certified|bank[ -]level|military[ -]grade|unhackable|100% secure/iu);
    expect(container).not.toHaveTextContent(/\bprocessing\b|\bDPA\b|\bretention\b/iu);
  });
});
