"use client";

import { Button, Input, Label, StatusBadge } from "@karon/design-system";
import { useMemo, useState, type FormEvent } from "react";

import type { QuoteHistoryEntry } from "@/features/quotes/quote-history";
import {
  currencyInputStep,
  formatServicePrice,
  priceMajorToMinor,
  priceMinorToMajor
} from "@/features/services/service-money";
import type { ClinicServiceRow } from "@/features/services/service-schemas";
import type { QuoteLine } from "@/lib/sync/event-schema";

type AcceptQuoteInput = {
  lines: QuoteLine[];
  totalMinor: number;
  currency: string;
};

type Props = {
  services: ClinicServiceRow[];
  currencyCode: string | null;
  quotes: QuoteHistoryEntry[];
  canQuote: boolean;
  loadingServices: boolean;
  saving: boolean;
  serviceError?: string | null;
  onAccept: (input: AcceptQuoteInput) => Promise<void>;
};

const QuoteBuilder = ({
  services,
  currencyCode,
  quotes,
  canQuote,
  loadingServices,
  saving,
  serviceError,
  onAccept
}: Props) => {
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [inlinePrice, setInlinePrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const selectedService = services.find((service) => service.id === selectedServiceId);
  const selectedPriceMatchesClinic = Boolean(
    selectedService?.price_minor !== null &&
      selectedService?.price_minor !== undefined &&
      selectedService.currency_code === currencyCode
  );
  const totalMinor = useMemo(
    () => lines.reduce((total, line) => total + line.qty * line.amountMinor, 0),
    [lines]
  );

  const addLine = () => {
    if (!selectedService || !currencyCode) {
      setError("Choose a service before adding a line.");
      return;
    }

    let amountMinor = selectedService.price_minor;

    if (!selectedPriceMatchesClinic) {
      if (!inlinePrice.trim()) {
        setError(`Enter a price for ${selectedService.name} before adding it.`);
        return;
      }

      try {
        amountMinor = priceMajorToMinor(Number(inlinePrice), currencyCode);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Enter a valid price.");
        return;
      }
    }

    if (amountMinor === null) {
      setError(`Enter a price for ${selectedService.name} before adding it.`);
      return;
    }

    setLines((current) => {
      const existing = current.find((line) => line.serviceId === selectedService.id);

      if (existing) {
        return current.map((line) =>
          line.serviceId === selectedService.id
            ? { ...line, qty: Math.min(line.qty + 1, 99) }
            : line
        );
      }

      return [
        ...current,
        {
          serviceId: selectedService.id,
          serviceName: selectedService.name,
          qty: 1,
          amountMinor,
          currency: currencyCode
        }
      ];
    });
    setSelectedServiceId("");
    setInlinePrice("");
    setError(null);
  };

  const acceptQuote = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!currencyCode || lines.length === 0) {
      setError("Add at least one service before accepting the quote.");
      return;
    }

    try {
      setError(null);
      await onAccept({ lines, totalMinor, currency: currencyCode });
      setLines([]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the quote.");
    }
  };

  return (
    <section
      aria-labelledby="quote-heading"
      className="flex min-w-0 flex-col gap-5 rounded-lg border border-border bg-card p-4 sm:p-5"
    >
      <header className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold" id="quote-heading">
            Quote
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Editable services and prices in clinic currency
          </p>
        </div>
        <StatusBadge tone={canQuote ? "primary" : "neutral"}>
          {canQuote ? `Clinic currency ${currencyCode ?? "—"}` : "View only"}
        </StatusBadge>
      </header>

      {canQuote ? (
        <form className="flex min-w-0 flex-col gap-5" onSubmit={acceptQuote}>
          <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(10rem,0.45fr)_auto] md:items-end">
            <div className="flex min-w-0 flex-col gap-2">
              <Label htmlFor="quote-service">Service</Label>
              <select
                className="min-h-(--control-min-height) w-full min-w-0 rounded-md border border-input bg-background px-3 text-base text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                disabled={loadingServices || saving}
                id="quote-service"
                onChange={(event) => {
                  setSelectedServiceId(event.target.value);
                  setInlinePrice("");
                  setError(null);
                }}
                value={selectedServiceId}
              >
                <option value="">
                  {loadingServices ? "Loading services..." : "Choose a service"}
                </option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex min-w-0 flex-col gap-2">
              {selectedService && !selectedPriceMatchesClinic ? (
                <>
                  <Label htmlFor="quote-inline-price">
                    Price for {selectedService.name} ({currencyCode ?? "clinic currency"})
                  </Label>
                  <Input
                    disabled={saving || !currencyCode}
                    id="quote-inline-price"
                    inputMode="decimal"
                    min="0"
                    onChange={(event) => setInlinePrice(event.target.value)}
                    step={currencyCode ? currencyInputStep(currencyCode) : "any"}
                    type="number"
                    value={inlinePrice}
                  />
                </>
              ) : (
                <p className="min-h-(--control-min-height) content-center text-sm text-muted-foreground">
                  {selectedService && currencyCode && selectedService.price_minor !== null
                    ? formatServicePrice(selectedService.price_minor, currencyCode)
                    : "Choose a service to see its price."}
                </p>
              )}
            </div>

            <Button disabled={saving || loadingServices} onClick={addLine} type="button" variant="outline">
              Add line
            </Button>
          </div>

          {serviceError ? (
            <p className="text-sm text-destructive" role="alert">
              {serviceError}
            </p>
          ) : null}

          {lines.length === 0 ? (
            <p className="rounded-md bg-muted px-3 py-4 text-sm text-muted-foreground">
              No services added yet.
            </p>
          ) : (
            <ul className="flex min-w-0 flex-col gap-3">
              {lines.map((line) => (
                <li
                  className="grid min-w-0 grid-cols-1 gap-3 rounded-md border border-border p-3 sm:grid-cols-[minmax(0,1fr)_7rem_minmax(9rem,0.6fr)_auto] sm:items-end"
                  key={line.serviceId}
                >
                  <p className="wrap-anywhere self-center font-medium">{line.serviceName}</p>
                  <div className="flex min-w-0 flex-col gap-2">
                    <Label htmlFor={`quote-qty-${line.serviceId}`}>Quantity</Label>
                    <Input
                      aria-label={`${line.serviceName} quantity`}
                      disabled={saving}
                      id={`quote-qty-${line.serviceId}`}
                      inputMode="numeric"
                      max="99"
                      min="1"
                      onChange={(event) => {
                        const qty = Math.max(1, Math.min(99, Number(event.target.value)));
                        setLines((current) =>
                          current.map((item) =>
                            item.serviceId === line.serviceId ? { ...item, qty } : item
                          )
                        );
                      }}
                      type="number"
                      value={line.qty}
                    />
                  </div>
                  <div className="flex min-w-0 flex-col gap-2">
                    <Label htmlFor={`quote-price-${line.serviceId}`}>Unit price</Label>
                    <Input
                      aria-label={`${line.serviceName} unit price (${line.currency})`}
                      disabled={saving}
                      id={`quote-price-${line.serviceId}`}
                      inputMode="decimal"
                      min="0"
                      onChange={(event) => {
                        try {
                          const amountMinor = priceMajorToMinor(
                            Number(event.target.value),
                            line.currency
                          );
                          setLines((current) =>
                            current.map((item) =>
                              item.serviceId === line.serviceId
                                ? { ...item, amountMinor }
                                : item
                            )
                          );
                          setError(null);
                        } catch (caught) {
                          setError(
                            caught instanceof Error ? caught.message : "Enter a valid price."
                          );
                        }
                      }}
                      step={currencyInputStep(line.currency)}
                      type="number"
                      value={priceMinorToMajor(line.amountMinor, line.currency)}
                    />
                  </div>
                  <Button
                    aria-label={`Remove ${line.serviceName}`}
                    disabled={saving}
                    onClick={() =>
                      setLines((current) =>
                        current.filter((item) => item.serviceId !== line.serviceId)
                      )
                    }
                    type="button"
                    variant="ghost"
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex min-w-0 flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total · {currencyCode ?? "—"}</p>
              <p className="text-2xl font-semibold tabular-nums">
                {currencyCode ? formatServicePrice(totalMinor, currencyCode) : "—"}
              </p>
            </div>
            <Button disabled={saving} type="submit">
              {saving ? "Saving..." : "Accept quote"}
            </Button>
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Saves on this device first and syncs when a connection is available.
          </p>
        </form>
      ) : (
        <p className="rounded-md bg-muted px-3 py-3 text-sm text-muted-foreground">
          Move the visit to In chair to create a quote.
        </p>
      )}

      <section aria-labelledby="quote-history-heading" className="flex min-w-0 flex-col gap-3">
        <h3 className="font-semibold" id="quote-history-heading">
          Quote history
        </h3>
        {quotes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No accepted quotes yet.</p>
        ) : (
          <ol className="flex min-w-0 flex-col gap-3">
            {quotes.map((quote) => (
              <li className="flex min-w-0 flex-col gap-3 rounded-md border border-border p-3" key={quote.id}>
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <StatusBadge tone="success">Accepted</StatusBadge>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {new Intl.DateTimeFormat("en-PH", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      timeZone: "Asia/Manila"
                    }).format(new Date(quote.occurredAt))}
                  </span>
                </div>
                <ul className="flex min-w-0 flex-col gap-1">
                  {quote.lines.map((line) => (
                    <li className="flex min-w-0 flex-wrap justify-between gap-2 text-sm" key={line.serviceId}>
                      <span className="wrap-anywhere">
                        {line.serviceName} × <span className="tabular-nums">{line.qty}</span>
                      </span>
                      <span className="tabular-nums">
                        {formatServicePrice(line.qty * line.amountMinor, line.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="border-t border-border pt-2 text-right font-semibold tabular-nums">
                  Total {formatServicePrice(quote.totalMinor, quote.currency)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </section>
  );
};

export default QuoteBuilder;
export type { AcceptQuoteInput };
