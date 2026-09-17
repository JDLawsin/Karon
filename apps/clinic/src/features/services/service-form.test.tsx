import { render, screen } from "@testing-library/react";
import { Drawer, DrawerContent, DrawerTitle } from "@karon/design-system";
import { describe, expect, it, vi } from "vitest";

import ServiceForm from "./service-form";

const historicalService = {
  id: "11111111-1111-4111-8111-111111111111",
  tenant_id: "22222222-2222-4222-8222-222222222222",
  name: "Cleaning",
  description: null,
  icon: null,
  price_minor: 150_000,
  currency_code: "PHP",
  duration_minutes: 45,
  created_at: "2026-09-14T00:00:00.000Z",
  updated_at: "2026-09-14T00:00:00.000Z",
  created_by: "33333333-3333-4333-8333-333333333333",
  updated_by: "33333333-3333-4333-8333-333333333333"
};

describe("ServiceForm", () => {
  it("does not relabel or reprice a historical service currency", () => {
    render(
      <Drawer open>
        <DrawerContent>
          <DrawerTitle>Service details</DrawerTitle>
          <ServiceForm
            currencyCode="USD"
            onSave={vi.fn(async () => {})}
            service={historicalService}
          />
        </DrawerContent>
      </Drawer>
    );

    expect(screen.getByLabelText("Price (PHP)")).toHaveAttribute("readonly");
    expect(screen.getByLabelText("Price (PHP)")).toBeEnabled();
    expect(
      screen.getByText(
        "This service is priced in PHP. Change the clinic currency back to PHP before editing its price."
      )
    ).toBeVisible();
    expect(screen.getByLabelText("Default duration (minutes)")).toBeEnabled();
  });
});
