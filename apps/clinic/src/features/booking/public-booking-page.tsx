"use client";

import {
  Alert,
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  Button,
  Input,
  KaronMark,
  Label,
  Skeleton,
  ThemeToggle,
  cn
} from "@karon/design-system";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { formatBookingDateChip, formatClinicTimezone } from "@/features/booking/booking-clinic-display";
import PublicBookingBackdrop from "@/features/booking/public-booking-backdrop";
import PublicBookingClinicCard from "@/features/booking/public-booking-clinic-card";
import {
  bookingApiErrorSchema,
  bookingIdempotencyKeySchema,
  publicBookingPageSchema,
  type PublicBookingPagePayload
} from "@/features/booking/booking-schemas";

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "error-callback"?: () => void;
      "expired-callback"?: () => void;
    }
  ) => string;
  remove: (widgetId: string) => void;
};

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";

const readPage = (value: unknown): PublicBookingPagePayload | null => {
  const parsed = publicBookingPageSchema.safeParse(value);

  return parsed.success ? parsed.data : null;
};

const bookingIdempotencyKey = (slug: string) => {
  const storageKey = `karon-book-idempotency:${slug}`;

  try {
    const existing = sessionStorage.getItem(storageKey);
    const parsed = bookingIdempotencyKeySchema.safeParse(existing);

    if (parsed.success) {
      return parsed.data;
    }

    const next = crypto.randomUUID();
    sessionStorage.setItem(storageKey, next);

    return next;
  } catch {
    return crypto.randomUUID();
  }
};

const windowTurnstile = () =>
  (window as unknown as { turnstile?: TurnstileApi }).turnstile;

const chipClassName = (selected: boolean) =>
  cn(
    "min-h-(--control-min-height) shrink-0 rounded-md border-(length:var(--surface-border-width)) px-3 text-sm font-medium transition-[color,background-color,border-color,transform] duration-(--motion-duration) hover:scale-(--control-hover-scale) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
    selected
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-background text-foreground"
  );

const firstServiceId = (page: PublicBookingPagePayload | null) =>
  page?.services.length === 1 ? (page.services[0]?.id ?? "") : "";

const bookingDateWindowSize = () => {
  if (typeof window === "undefined") {
    return 3;
  }

  if (window.matchMedia("(min-width: 1024px)").matches) {
    return 7;
  }

  if (window.matchMedia("(min-width: 640px)").matches) {
    return 5;
  }

  return 3;
};

const bookingDateWindowStart = (dates: string[], selected: string, size: number) => {
  const index = dates.indexOf(selected);

  if (index < 0) {
    return 0;
  }

  return Math.max(0, Math.min(index - Math.floor(size / 2), dates.length - size));
};

type Props = {
  slug: string;
  initialPage: PublicBookingPagePayload | null;
};

const PublicBookingPage = ({ slug, initialPage }: Props) => {
  const [page, setPage] = useState<PublicBookingPagePayload | null>(initialPage);
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(!initialPage);
  const [date, setDate] = useState(initialPage?.date ?? "");
  const [startsAt, setStartsAt] = useState("");
  const [serviceId, setServiceId] = useState(firstServiceId(initialPage));
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [note, setNote] = useState("");
  const [website, setWebsite] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dateWindowSize, setDateWindowSize] = useState(3);
  const turnstileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => setDateWindowSize(bookingDateWindowSize());

    update();
    window.addEventListener("resize", update);

    return () => window.removeEventListener("resize", update);
  }, []);

  const load = useCallback(
    async (nextDate?: string, brickOnFail = true) => {
      const params = nextDate ? `?date=${encodeURIComponent(nextDate)}` : "";
      const response = await fetch(`/api/book/${encodeURIComponent(slug)}${params}`);
      const json = response.ok ? readPage(await response.json().catch(() => null)) : null;

      if (!json) {
        if (brickOnFail) {
          setMissing(true);
          setPage(null);
        } else {
          setError("Could not load times for that day.");
        }

        return false;
      }

      setMissing(false);
      setError(null);
      setPage(json);
      setDate(json.date ?? "");
      setServiceId((current) =>
        json.services.some((service) => service.id === current)
          ? current
          : firstServiceId(json)
      );
      setStartsAt((current) =>
        json.slots.some((slot) => slot.startsAt === current) ? current : ""
      );

      return true;
    },
    [slug]
  );

  useEffect(() => {
    if (initialPage) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        await load();
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialPage, load]);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !confirmOpen || done || missing) {
      return;
    }

    const container = turnstileRef.current;

    if (!container) {
      return;
    }

    let widgetId: string | null = null;
    let cancelled = false;

    const render = () => {
      const api = windowTurnstile();

      if (cancelled || !api || widgetId || !turnstileRef.current) {
        return;
      }

      widgetId = api.render(turnstileRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token) => setTurnstileToken(token),
        "error-callback": () => setTurnstileToken(""),
        "expired-callback": () => setTurnstileToken("")
      });
    };

    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-karon-turnstile]"
    );
    let script = existing;

    if (windowTurnstile()) {
      render();
    } else if (script) {
      script.addEventListener("load", render);
    } else {
      script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.dataset.karonTurnstile = "true";
      script.addEventListener("load", render);
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      script?.removeEventListener("load", render);
      setTurnstileToken("");

      if (widgetId) {
        windowTurnstile()?.remove(widgetId);
      }
    };
  }, [confirmOpen, done, missing]);

  const onDateChange = async (next: string) => {
    setStartsAt("");
    setPending(true);
    setError(null);
    await load(next, false);
    setPending(false);
  };

  const submit = async () => {
    setError(null);
    setPending(true);
    const response = await fetch(`/api/book/${encodeURIComponent(slug)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": bookingIdempotencyKey(slug)
      },
      body: JSON.stringify({
        name,
        mobile,
        startsAt,
        serviceId,
        website,
        ...(TURNSTILE_SITE_KEY ? { turnstileToken } : {}),
        ...(note.trim() ? { note: note.trim() } : {})
      })
    });
    const json = bookingApiErrorSchema.safeParse(await response.json().catch(() => null));
    setPending(false);

    if (!response.ok) {
      setConfirmOpen(false);
      setError(json.success ? json.data.error : "Could not send that booking.");
      if (response.status === 409 && date) {
        await load(date, false);
      }
      return;
    }

    setConfirmOpen(false);
    setDone(true);
  };

  const selectedService = page?.services.find((service) => service.id === serviceId);
  const selectedSlot = page?.slots.find((slot) => slot.startsAt === startsAt);
  const whenLabel =
    date && selectedSlot
      ? `${formatBookingDateChip(date)} · ${selectedSlot.label}`
      : "";
  const canReview =
    Boolean(startsAt && serviceId && name.trim() && mobile.trim()) && !pending;
  const bookableDates = page?.dates ?? [];
  const selectedDateIndex = bookableDates.indexOf(date);
  const visibleDateCount = Math.min(dateWindowSize, bookableDates.length);
  const dateWindowStart = bookingDateWindowStart(bookableDates, date, visibleDateCount);
  const visibleDates = bookableDates.slice(
    dateWindowStart,
    dateWindowStart + visibleDateCount
  );

  return (
    <>
      <PublicBookingBackdrop />
      <main className="relative mx-auto flex min-h-screen w-full min-w-0 max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
        <header className="flex min-w-0 justify-end">
          <ThemeToggle />
        </header>
        {loading ? (
        <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:items-start lg:gap-12">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex items-start gap-3">
              <Skeleton className="size-16 rounded-md" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-2/3 rounded-md" />
          </div>
          <div className="flex min-w-0 flex-col gap-3">
            <Skeleton className="h-12 w-full rounded-md" />
            <Skeleton className="h-12 w-2/3 rounded-md" />
            <Skeleton className="h-12 w-full rounded-md" />
          </div>
        </div>
      ) : missing || !page ? (
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="text-2xl tracking-(--heading-tracking) font-(--heading-weight)">
            Booking unavailable
          </h1>
          <p className="text-sm text-muted-foreground">
            This booking link is not available.
          </p>
        </div>
      ) : (
        <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:items-start lg:gap-12">
          <div className="min-w-0 lg:sticky lg:top-8">
            <PublicBookingClinicCard page={page} />
          </div>
          {done ? (
            <section className="flex min-w-0 flex-col gap-3">
              <h2 className="text-xl tracking-(--heading-tracking) font-(--heading-weight)">
                Request sent
              </h2>
              <p className="text-sm text-muted-foreground">
                This is a request. {page.clinicName} will confirm.
              </p>
              <dl className="flex min-w-0 flex-col gap-2 text-sm">
                {whenLabel ? (
                  <div>
                    <dt className="text-muted-foreground">When</dt>
                    <dd>{whenLabel}</dd>
                  </div>
                ) : null}
                {selectedService ? (
                  <div>
                    <dt className="text-muted-foreground">Service</dt>
                    <dd>{selectedService.name}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-muted-foreground">Name</dt>
                  <dd>{name}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Mobile</dt>
                  <dd>{mobile}</dd>
                </div>
              </dl>
              {page.phone ? (
                <p className="text-sm text-muted-foreground">
                  Need to talk first? Call{" "}
                  <a
                    className="font-medium text-primary"
                    href={`tel:${page.phone.replace(/[^\d+]/g, "")}`}
                  >
                    {page.phone}
                  </a>
                  .
                </p>
              ) : null}
            </section>
          ) : (
            <form
              className="relative flex min-w-0 flex-col gap-6"
              onSubmit={(event) => {
                event.preventDefault();
                if (canReview) {
                  setConfirmOpen(true);
                }
              }}
            >
              {page.services.length === 0 ? (
                <Alert title="This clinic has not listed services yet." />
              ) : page.dates.length === 0 ? (
                <Alert title="No bookable days in the next two weeks." />
              ) : (
                <>
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute left-[-10000px] top-auto h-px w-px overflow-hidden"
                  >
                    <label htmlFor="book-website">Company website</label>
                    <input
                      autoComplete="off"
                      id="book-website"
                      name="website"
                      tabIndex={-1}
                      onChange={(event) => setWebsite(event.target.value)}
                      value={website}
                    />
                  </div>
                  <fieldset className="flex min-w-0 flex-col gap-2">
                    <legend className="text-sm font-medium">Service</legend>
                    <div className="flex min-w-0 flex-wrap gap-2">
                      {page.services.map((service) => (
                        <button
                          aria-pressed={serviceId === service.id}
                          className={chipClassName(serviceId === service.id)}
                          disabled={pending}
                          key={service.id}
                          onClick={() => setServiceId(service.id)}
                          type="button"
                        >
                          {service.name}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset className="flex min-w-0 flex-col gap-2">
                    <legend className="text-sm font-medium">Date</legend>
                    <div className="flex min-w-0 items-center gap-1">
                      <Button
                        aria-label="Previous day"
                        className="size-11 min-h-11 shrink-0 self-center px-0 [&_svg]:size-5"
                        disabled={pending || selectedDateIndex <= 0}
                        onClick={() => {
                          const previous = bookableDates[selectedDateIndex - 1];

                          if (previous) {
                            void onDateChange(previous);
                          }
                        }}
                        type="button"
                        variant="ghost"
                      >
                        <ChevronLeft />
                      </Button>
                      <div
                        aria-label="Bookable days"
                        className={cn(
                          "grid min-w-0 flex-1 gap-2",
                          visibleDateCount >= 7
                            ? "grid-cols-7"
                            : visibleDateCount >= 5
                              ? "grid-cols-5"
                              : "grid-cols-3"
                        )}
                        role="group"
                      >
                        {visibleDates.map((value) => (
                          <button
                            aria-pressed={date === value}
                            className={cn(chipClassName(date === value), "w-full")}
                            disabled={pending}
                            key={value}
                            onClick={() => {
                              if (value !== date) {
                                void onDateChange(value);
                              }
                            }}
                            type="button"
                          >
                            {formatBookingDateChip(value)}
                          </button>
                        ))}
                      </div>
                      <Button
                        aria-label="Next day"
                        className="size-11 min-h-11 shrink-0 self-center px-0 [&_svg]:size-5"
                        disabled={
                          pending ||
                          selectedDateIndex < 0 ||
                          selectedDateIndex >= bookableDates.length - 1
                        }
                        onClick={() => {
                          const next = bookableDates[selectedDateIndex + 1];

                          if (next) {
                            void onDateChange(next);
                          }
                        }}
                        type="button"
                        variant="ghost"
                      >
                        <ChevronRight />
                      </Button>
                    </div>
                  </fieldset>
                  <fieldset className="flex min-w-0 flex-col gap-2">
                    <legend className="text-sm font-medium">Time</legend>
                    <p className="text-xs text-muted-foreground">
                      {formatClinicTimezone(page.timezone)}
                    </p>
                    {page.slots.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No times left this day.
                      </p>
                    ) : (
                      <div className="flex min-w-0 flex-wrap gap-2">
                        {page.slots.map((slot) => (
                          <button
                            aria-pressed={startsAt === slot.startsAt}
                            className={chipClassName(startsAt === slot.startsAt)}
                            disabled={pending}
                            key={slot.startsAt}
                            onClick={() => setStartsAt(slot.startsAt)}
                            type="button"
                          >
                            {slot.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </fieldset>
                  <div className="flex min-w-0 flex-col gap-2">
                    <Label htmlFor="book-name">Name</Label>
                    <Input
                      autoComplete="name"
                      disabled={pending}
                      id="book-name"
                      onChange={(event) => setName(event.target.value)}
                      value={name}
                    />
                  </div>
                  <div className="flex min-w-0 flex-col gap-2">
                    <Label htmlFor="book-mobile">Mobile</Label>
                    <Input
                      autoComplete="tel"
                      disabled={pending}
                      id="book-mobile"
                      inputMode="tel"
                      onChange={(event) => setMobile(event.target.value)}
                      value={mobile}
                    />
                  </div>
                  <div className="flex min-w-0 flex-col gap-2">
                    <Label htmlFor="book-note">Note or reason</Label>
                    <textarea
                      className="min-h-24 w-full min-w-0 rounded-md border-(length:var(--surface-border-width)) border-border bg-background px-3 py-2 text-sm"
                      disabled={pending}
                      id="book-note"
                      maxLength={500}
                      onChange={(event) => setNote(event.target.value)}
                      value={note}
                    />
                  </div>
                  {error ? <Alert title={error} variant="danger" /> : null}
                  <Button disabled={!canReview} type="submit">
                    Review booking
                  </Button>
                  <AlertDialog
                    onOpenChange={(open) => {
                      if (!pending) {
                        setConfirmOpen(open);
                      }
                    }}
                    open={confirmOpen}
                  >
                    <AlertDialogContent className="max-h-[min(90dvh,40rem)] overflow-y-auto">
                      <AlertDialogTitle>Check your booking</AlertDialogTitle>
                      <AlertDialogDescription>
                        This is a request. {page.clinicName} will confirm.
                      </AlertDialogDescription>
                      <dl className="mt-4 flex min-w-0 flex-col gap-3 text-sm">
                        <div>
                          <dt className="text-muted-foreground">Clinic</dt>
                          <dd>{page.clinicName}</dd>
                        </div>
                        {whenLabel ? (
                          <div>
                            <dt className="text-muted-foreground">When</dt>
                            <dd>{whenLabel}</dd>
                          </div>
                        ) : null}
                        {selectedService ? (
                          <div>
                            <dt className="text-muted-foreground">Service</dt>
                            <dd>{selectedService.name}</dd>
                          </div>
                        ) : null}
                        <div>
                          <dt className="text-muted-foreground">Name</dt>
                          <dd>{name}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Mobile</dt>
                          <dd>{mobile}</dd>
                        </div>
                        {note.trim() ? (
                          <div>
                            <dt className="text-muted-foreground">Note</dt>
                            <dd className="wrap-anywhere">{note.trim()}</dd>
                          </div>
                        ) : null}
                        {page.address ? (
                          <div>
                            <dt className="text-muted-foreground">Where</dt>
                            <dd className="wrap-anywhere">{page.address}</dd>
                          </div>
                        ) : null}
                      </dl>
                      {TURNSTILE_SITE_KEY ? (
                        <div className="mt-4 min-h-16 w-full min-w-0" ref={turnstileRef} />
                      ) : null}
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={pending}>Go back</AlertDialogCancel>
                        <Button
                          disabled={
                            pending || Boolean(TURNSTILE_SITE_KEY && !turnstileToken)
                          }
                          onClick={() => {
                            void submit();
                          }}
                          type="button"
                        >
                          Send request
                        </Button>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </form>
          )}
        </div>
      )}
      <footer className="mt-auto flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
        <KaronMark aria-hidden="true" className="size-4" />
        <span>Powered by Karon</span>
      </footer>
      </main>
    </>
  );
};

export default PublicBookingPage;
