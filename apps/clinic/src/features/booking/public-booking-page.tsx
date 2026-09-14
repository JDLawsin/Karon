"use client";

import { Alert, Button, Input, KaronWordmark, Label, ThemeToggle } from "@karon/design-system";
import { useEffect, useRef, useState } from "react";

import {
  bookingApiErrorSchema,
  bookingIdempotencyKeySchema,
  publicBookingPageSchema
} from "@/features/booking/booking-schemas";

type Service = {
  id: string;
  name: string;
};

type Slot = {
  clock: string;
  startsAt: string;
  label: string;
};

type PagePayload = {
  clinicName: string;
  timezone: string;
  services: Service[];
  dates: string[];
  date: string | null;
  slots: Slot[];
};

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

const readPage = (value: unknown): PagePayload | null => {
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

const selectClassName =
  "min-h-(--control-min-height) w-full min-w-0 rounded-md border-(length:var(--surface-border-width)) border-border bg-background px-3 text-sm";

type Props = {
  slug: string;
};

const PublicBookingPage = ({ slug }: Props) => {
  const [page, setPage] = useState<PagePayload | null>(null);
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [note, setNote] = useState("");
  const [website, setWebsite] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const turnstileRef = useRef<HTMLDivElement>(null);

  const load = async (nextDate?: string, brickOnFail = true) => {
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
    setStartsAt((current) =>
      json.slots.some((slot) => slot.startsAt === current) ? current : ""
    );

    return true;
  };

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(`/api/book/${encodeURIComponent(slug)}`);

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setMissing(true);
          setPage(null);
          return;
        }

        const json = readPage(await response.json().catch(() => null));

        if (!json) {
          setMissing(true);
          setPage(null);
          return;
        }

        setPage(json);
        setDate(json.date ?? "");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !page || done || missing) {
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

      if (widgetId) {
        windowTurnstile()?.remove(widgetId);
      }
    };
  }, [page, done, missing]);

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
      setError(json.success ? json.data.error : "Could not send that booking.");
      if (response.status === 409 && date) {
        await load(date, false);
      }
      return;
    }

    setDone(true);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full min-w-0 max-w-md flex-col gap-8 bg-background px-4 py-8 sm:px-6 sm:py-16">
      <header className="flex w-full min-w-0 items-center justify-between gap-4">
        <KaronWordmark />
        <ThemeToggle />
      </header>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading booking times…</p>
      ) : missing || !page ? (
        <>
          <h1 className="text-2xl tracking-(--heading-tracking) [font-weight:var(--heading-weight)]">
            Booking unavailable
          </h1>
          <p className="text-sm text-muted-foreground">
            This booking link is not available.
          </p>
        </>
      ) : done ? (
        <>
          <h1 className="text-2xl tracking-(--heading-tracking) [font-weight:var(--heading-weight)]">
            Request sent
          </h1>
          <p className="text-sm text-muted-foreground">
            {page.clinicName} has your booking request. They will confirm the visit.
          </p>
        </>
      ) : (
        <form
          className="relative flex min-w-0 flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <h1 className="text-2xl tracking-(--heading-tracking) [font-weight:var(--heading-weight)]">
            Book at {page.clinicName}
          </h1>
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
              <div className="flex min-w-0 flex-col gap-2">
                <Label htmlFor="book-date">Date</Label>
                <select
                  className={selectClassName}
                  disabled={pending}
                  id="book-date"
                  onChange={(event) => {
                    void onDateChange(event.target.value);
                  }}
                  value={date}
                >
                  {page.dates.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex min-w-0 flex-col gap-2">
                <Label htmlFor="book-time">Time ({page.timezone.replaceAll("_", " ")})</Label>
                <select
                  className={selectClassName}
                  disabled={pending || page.slots.length === 0}
                  id="book-time"
                  onChange={(event) => setStartsAt(event.target.value)}
                  value={startsAt}
                >
                  <option value="">Choose a time</option>
                  {page.slots.map((slot) => (
                    <option key={slot.startsAt} value={slot.startsAt}>
                      {slot.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex min-w-0 flex-col gap-2">
                <Label htmlFor="book-service">Service</Label>
                <select
                  className={selectClassName}
                  disabled={pending}
                  id="book-service"
                  onChange={(event) => setServiceId(event.target.value)}
                  value={serviceId}
                >
                  <option value="">Choose a service</option>
                  {page.services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>
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
              {TURNSTILE_SITE_KEY ? (
                <div className="min-h-16 w-full min-w-0" ref={turnstileRef} />
              ) : null}
              {error ? <Alert title={error} variant="danger" /> : null}
              <Button
                disabled={
                  pending ||
                  !startsAt ||
                  !serviceId ||
                  name.trim().length === 0 ||
                  mobile.trim().length === 0 ||
                  Boolean(TURNSTILE_SITE_KEY && !turnstileToken)
                }
                type="submit"
              >
                Send booking request
              </Button>
            </>
          )}
        </form>
      )}
    </main>
  );
};

export default PublicBookingPage;
