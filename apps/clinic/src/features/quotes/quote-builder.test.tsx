import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import QuoteBuilder from "./quote-builder";

const services = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    tenant_id: "22222222-2222-4222-8222-222222222222",
    name: "Cleaning",
    description: null,
    icon: null,
    price_minor: 150_000,
    currency_code: "PHP",
    duration_minutes: 45,
    created_at: "2026-09-20T00:00:00.000Z",
    updated_at: "2026-09-20T00:00:00.000Z",
    created_by: "33333333-3333-4333-8333-333333333333",
    updated_by: "33333333-3333-4333-8333-333333333333"
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    tenant_id: "22222222-2222-4222-8222-222222222222",
    name: "Consultation",
    description: null,
    icon: null,
    price_minor: null,
    currency_code: null,
    duration_minutes: null,
    created_at: "2026-09-20T00:00:00.000Z",
    updated_at: "2026-09-20T00:00:00.000Z",
    created_by: "33333333-3333-4333-8333-333333333333",
    updated_by: "33333333-3333-4333-8333-333333333333"
  }
];

const renderBuilder = (onAccept = vi.fn().mockResolvedValue(undefined)) => {
  render(
    <QuoteBuilder
      canQuote
      currencyCode="PHP"
      loadingServices={false}
      onAccept={onAccept}
      quotes={[]}
      saving={false}
      services={services}
    />
  );

  return onAccept;
};

describe("QuoteBuilder", () => {
  it("rejects accepting an empty quote", () => {
    const onAccept = renderBuilder();

    fireEvent.click(screen.getByRole("button", { name: "Accept quote" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Add at least one service before accepting the quote."
    );
    expect(onAccept).not.toHaveBeenCalled();
  });

  it("requires an inline price before adding an unpriced service", () => {
    renderBuilder();
    fireEvent.change(screen.getByLabelText("Service"), {
      target: { value: services[1]!.id }
    });
    fireEvent.click(screen.getByRole("button", { name: "Add line" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter a price for Consultation before adding it."
    );
    expect(screen.queryByText("Quantity")).not.toBeInTheDocument();
  });

  it("edits quantity and unit price before accepting the calculated total", async () => {
    const onAccept = renderBuilder();
    fireEvent.change(screen.getByLabelText("Service"), {
      target: { value: services[0]!.id }
    });
    fireEvent.click(screen.getByRole("button", { name: "Add line" }));
    fireEvent.change(screen.getByLabelText("Cleaning quantity"), {
      target: { value: "2" }
    });
    fireEvent.change(screen.getByLabelText("Cleaning unit price (PHP)"), {
      target: { value: "1600" }
    });
    expect(screen.getByText("₱3,200.00")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Accept quote" }));

    expect(onAccept).toHaveBeenCalledWith({
      currency: "PHP",
      lines: [
        {
          serviceId: services[0]!.id,
          serviceName: "Cleaning",
          qty: 2,
          amountMinor: 160_000,
          currency: "PHP"
        }
      ],
      totalMinor: 320_000
    });
  });
});
