import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { claimText } from "../../../content/claims";
import AboutPage from "./about-page";

vi.mock("../site-shell/sticky-cta", () => ({ default: () => null }));

describe("about page", () => {
  it("tells the founder story and labels the composite before the passage", () => {
    const { container } = render(<AboutPage />);
    const figure = container.querySelector("figure");
    const caption = within(figure as HTMLElement).getByText("An illustrative morning, based on clinics we spoke with");
    const passage = figure?.querySelector("blockquote");

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByText(claimText("entity-sentence"))).toBeVisible();
    expect(caption.compareDocumentPosition(passage as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(passage).toHaveTextContent("Messenger");
    expect(passage).toHaveTextContent("paper appointment book");
    expect(passage).toHaveTextContent("GCash screenshot");
    expect(passage).toHaveTextContent("Wi-Fi drops");
  });

  it("defines Karon as now with cited sources and no unapproved founder details", () => {
    const { container } = render(<AboutPage />);
    const story = container.querySelector("article");

    expect(within(story as HTMLElement).getByText("now")).toBeVisible();
    expect(within(story as HTMLElement).getByRole("link", { name: "Wiktionary's Cebuano entry" }))
      .toHaveAttribute("href", "https://en.wiktionary.org/wiki/karon");
    expect(within(story as HTMLElement).getByRole("link", { name: "Binisaya dictionary" }))
      .toHaveAttribute("href", "https://www.binisaya.com/cebuano/karon");
    expect(story).not.toHaveTextContent(/\btoday\b/iu);
    expect(container).not.toHaveTextContent(/Joshua|customers? served|clinics? served|funded|funding|validated/iu);
    expect(container.querySelector("img, [role='img']")).toBeNull();
    expect(container.textContent).not.toContain("—");
  });
});
