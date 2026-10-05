import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  cookieNotice,
  privacyNotice,
  processingAgreementNotice,
  termsNotice
} from "../../../content/legal";
import LegalPage from "./legal-page";

describe("KR-031 legal pages", () => {
  it("renders an anchored, pending-counsel privacy notice with a table of contents", () => {
    const notice = privacyNotice("privacy@example.test");
    render(<LegalPage {...notice} pageId="privacy" />);

    expect(screen.getByRole("heading", { level: 1, name: notice.title })).toBeVisible();
    expect(screen.getByText("Pending counsel review")).toBeVisible();
    expect(screen.getByText(notice.lastUpdated).closest("time")).toHaveAttribute("datetime", notice.lastUpdated);
    expect(screen.getByRole("navigation", { name: "On this page" })).toBeVisible();
    expect(screen.getAllByRole("link", { name: "Retention and deletion" })
      .every((link) => link.getAttribute("href") === "#retention")).toBe(true);
    expect(screen.getByRole("link", { name: "contact page" })).toHaveAttribute("href", "/contact");
    expect(screen.queryByText("privacy@example.test")).toBeNull();
    expect(screen.getByRole("link", { name: "Contact Karon" })).toHaveAttribute("href", "/contact");
  });

  it("covers the required marketing privacy facts without making a compliance claim", () => {
    const html = renderToStaticMarkup(<LegalPage {...privacyNotice("privacy@example.test")} pageId="privacy" />);

    expect(html).toContain("karon_utm");
    expect(html).toContain("Vercel Web Analytics");
    expect(html).toContain("Vercel Speed Insights");
    expect(html).toContain("Launch updates are a separate purpose");
    expect(html).toContain("Twelve months is only a team proposal");
    expect(html).toContain("Data Privacy Act of 2012");
    expect(html).toContain("clinic controls its patient information");
    expect(html).not.toMatch(/\b(?:compliant|certified|guaranteed|fully secure)\b/iu);
  });

  it("uses the configured privacy mailbox when one is available", () => {
    render(<LegalPage {...privacyNotice("privacy@example.com")} pageId="privacy" />);

    expect(screen.getByRole("link", { name: "privacy@example.com" }))
      .toHaveAttribute("href", "mailto:privacy@example.com");
  });

  it("keeps every notice free of em dashes and marks unresolved wording as pending", () => {
    const notices = [
      privacyNotice("privacy@example.test"),
      termsNotice,
      cookieNotice,
      processingAgreementNotice
    ];

    for (const [index, notice] of notices.entries()) {
      const html = renderToStaticMarkup(<LegalPage {...notice} pageId={`legal-${index}`} />);
      expect(html).not.toContain("—");
      expect(html).toContain("Pending counsel review");
    }
  });
});
