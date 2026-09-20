import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import CollectPayment from "./collect-payment";

const balance = {
  quoteId: "11111111-1111-4111-8111-111111111111",
  quoteTotalMinor: 280_000,
  paidMinor: 0,
  remainingMinor: 280_000,
  currency: "PHP",
};

describe("CollectPayment", () => {
  it("rejects zero cash and records a partial e-wallet payment", async () => {
    const onCollect = vi.fn().mockResolvedValue(undefined);
    render(
      <CollectPayment
        balance={balance}
        balanceError={null}
        balanceLoading={false}
        onCollect={onCollect}
        saving={false}
      />
    );

    const amount = screen.getByLabelText("Amount (PHP)");
    fireEvent.change(amount, { target: { value: "0" } });
    fireEvent.submit(amount.closest("form")!);
    expect(screen.getByRole("alert")).toHaveTextContent("greater than zero");

    fireEvent.click(screen.getByRole("button", { name: "GCash" }));
    fireEvent.change(screen.getByLabelText("Amount (PHP)"), {
      target: { value: "2000" }
    });
    expect(screen.getByText("₱800.00")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Record payment" }));

    expect(onCollect).toHaveBeenCalledWith({
      amountMinor: 200_000,
      currency: "PHP",
      method: "gcash"
    });
  });

  it("does not reduce the balance preview for an unpaid record", () => {
    render(
      <CollectPayment
        balance={balance}
        balanceError={null}
        balanceLoading={false}
        onCollect={vi.fn()}
        saving={false}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Unpaid" }));
    fireEvent.change(screen.getByLabelText("Amount (PHP)"), { target: { value: "800" } });

    expect(screen.getByText("₱2,800.00")).toBeVisible();
  });

  it("blocks collection while the authoritative balance is loading", () => {
    render(
      <CollectPayment
        balance={null}
        balanceError={null}
        balanceLoading
        onCollect={vi.fn()}
        saving={false}
      />
    );

    expect(screen.getByRole("status")).toHaveTextContent("Checking the remaining balance");
    expect(screen.queryByRole("button", { name: "Record payment" })).not.toBeInTheDocument();
  });
});
