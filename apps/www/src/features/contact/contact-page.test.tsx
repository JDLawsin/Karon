import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ContactPage from "./contact-page";

describe("contact page", () => {
  it("offers a direct email without asking for patient details", () => {
    const { container } = render(
      <ContactPage contactEmail="hello@example.test" responsePromise="within one business day" />
    );

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 2, name: "Start with an email" })).toBeVisible();
    expect(screen.getByText("hello@example.test")).toBeVisible();
    expect(screen.getByRole("link", { name: "Write an email" })).toHaveAttribute(
      "href",
      "mailto:hello@example.test?subject=A%20question%20for%20Karon"
    );
    expect(screen.getByText(/reply within one business day/iu)).toBeVisible();
    expect(container).toHaveTextContent("Please do not include patient names");
    expect(container.querySelector("form")).toBeNull();
  });

  it("keeps a working request path when direct email is not configured", () => {
    render(<ContactPage />);

    expect(screen.getByRole("heading", { level: 2, name: "Send us a request" })).toBeVisible();
    expect(screen.getByText(/direct email address is still being set up/iu)).toBeVisible();
    expect(screen.getByRole("link", { name: "Send a request" }))
      .toHaveAttribute("href", "/demo?intent=demo");
    expect(screen.queryByRole("link", { name: "Write an email" })).toBeNull();
  });

  it("does not invent a response time when none is configured", () => {
    render(<ContactPage contactEmail="hello@example.test" />);

    expect(screen.getByText("Send your note directly to the Karon team.")).toBeVisible();
    expect(document.body).not.toHaveTextContent(/business day|hours?|minutes?/iu);
  });
});
