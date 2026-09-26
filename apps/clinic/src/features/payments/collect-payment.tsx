"use client";

import { Button, Input, Label, StatusBadge } from "@karon/design-system";
import { useState, type FormEvent } from "react";

import type { CollectBalance } from "@/features/payments/payment-balance";
import {
  currencyInputStep,
  formatServicePrice,
  priceMajorToMinor,
  priceMinorToMajor
} from "@/features/services/service-money";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/sync/event-schema";

type CollectInput = {
  amountMinor: number;
  currency: string;
  method: PaymentMethod;
};

type Props = {
  balance: CollectBalance | null;
  balanceError: string | null;
  balanceLoading: boolean;
  saving: boolean;
  onCollect: (input: CollectInput) => Promise<void>;
};

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Cash",
  gcash: "GCash",
  maya: "Maya",
  card: "Card",
  other: "Other",
  unpaid: "Unpaid"
};

const CollectPayment = ({
  balance,
  balanceError,
  balanceLoading,
  saving,
  onCollect
}: Props) => {
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (balanceLoading || balanceError || !balance) {
    return (
      <section
        aria-labelledby="collect-heading"
        className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:p-5"
      >
        <h2 className="text-xl font-semibold" id="collect-heading">
          Collect
        </h2>
        <p
          className="rounded-md bg-muted px-3 py-3 text-sm text-muted-foreground"
          role={balanceError ? "alert" : "status"}
        >
          {balanceLoading
            ? "Checking the remaining balance..."
            : balanceError ?? "Accept a quote for this visit before collecting payment."}
        </p>
      </section>
    );
  }

  const parsedAmount = Number(amount);
  let amountMinor = 0;

  try {
    amountMinor = amount.trim() ? priceMajorToMinor(parsedAmount, balance.currency) : 0;
  } catch {
    amountMinor = 0;
  }

  const previewRemaining =
    method === "unpaid"
      ? balance.remainingMinor
      : Math.max(balance.remainingMinor - amountMinor, 0);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const nextAmountMinor = priceMajorToMinor(Number(amount), balance.currency);

      if (nextAmountMinor <= 0) {
        setError("Enter an amount greater than zero.");
        return;
      }

      if (nextAmountMinor > balance.remainingMinor) {
        setError("Enter an amount no greater than the remaining balance.");
        return;
      }

      setError(null);
      await onCollect({ amountMinor: nextAmountMinor, currency: balance.currency, method });
      setAmount("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not record the payment.");
    }
  };

  return (
    <section
      aria-labelledby="collect-heading"
      className="flex min-w-0 flex-col gap-5 rounded-lg border border-border bg-card p-4 sm:p-5"
    >
      <header className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold" id="collect-heading">
            Collect
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Quote total {formatServicePrice(balance.quoteTotalMinor, balance.currency)}
          </p>
        </div>
        <StatusBadge tone={balance.remainingMinor === 0 ? "success" : "neutral"}>
          {balance.remainingMinor === 0 ? "Paid" : "Balance open"}
        </StatusBadge>
      </header>

      {balance.remainingMinor > 0 ? (
        <form className="flex min-w-0 flex-col gap-5" onSubmit={submit}>
          <fieldset className="flex min-w-0 flex-col gap-2">
            <legend className="text-sm font-medium">Payment method</legend>
            <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {PAYMENT_METHODS.map((value) => (
                <Button
                  aria-pressed={method === value}
                  className={
                    method === value ? "bg-muted text-foreground ring-2 ring-primary" : undefined
                  }
                  disabled={saving}
                  key={value}
                  onClick={() => {
                    setMethod(value);
                    setError(null);
                  }}
                  type="button"
                  variant="outline"
                >
                  {METHOD_LABEL[value]}
                </Button>
              ))}
            </div>
          </fieldset>

          <p className="text-xs text-muted-foreground">
            GCash and Maya are e-wallet methods; the payment record stays provider-neutral.
          </p>

          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,0.6fr)] sm:items-end">
            <div className="flex min-w-0 flex-col gap-2">
              <Label htmlFor="collect-amount">Amount ({balance.currency})</Label>
              <Input
                disabled={saving}
                id="collect-amount"
                inputMode="decimal"
                max={priceMinorToMajor(balance.remainingMinor, balance.currency)}
                min={currencyInputStep(balance.currency)}
                onChange={(event) => {
                  setAmount(event.target.value);
                  setError(null);
                }}
                step={currencyInputStep(balance.currency)}
                type="number"
                value={amount}
              />
            </div>
            <div className="rounded-md bg-muted px-4 py-3 sm:text-right">
              <p className="text-sm text-muted-foreground">Remaining</p>
              <p className="text-xl font-semibold tabular-nums">
                {formatServicePrice(previewRemaining, balance.currency)}
              </p>
            </div>
          </div>

          <Button disabled={saving} type="submit">
            {saving ? "Recording..." : "Record payment"}
          </Button>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Saves on this device first and syncs with the same payment ID.
          </p>
        </form>
      ) : (
        <div className="rounded-md bg-success-subtle px-4 py-4 text-success" role="status">
          <p className="font-semibold">Paid in full</p>
          <p className="mt-1 text-sm tabular-nums">
            {formatServicePrice(balance.quoteTotalMinor, balance.currency)} collected
          </p>
        </div>
      )}
    </section>
  );
};

export default CollectPayment;
export type { CollectInput };
