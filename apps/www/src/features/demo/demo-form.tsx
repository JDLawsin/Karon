"use client";

import { Button, Card, CardContent, CardHeader, Input } from "@karon/design-system";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { UTM_STORAGE_KEY } from "./attribution-capture";
import { trackLeadSubmitted } from "./lead-analytics";
import { countries, philippineProvinces } from "./lead-options";

type Intent = "application" | "demo";
type Props = {
  initialIntent: Intent;
  submissionId: string;
  responsePromise: string;
  contactEmail: string;
  turnstileSiteKey?: string;
};
type FieldErrors = Record<string, string>;
type TurnstileApi = {
  render: (element: HTMLElement, options: {
    sitekey: string;
    callback: (token: string) => void;
    "expired-callback": () => void;
    "error-callback": () => void;
  }) => string;
  remove: (id: string) => void;
};

declare global {
  interface Window { turnstile?: TurnstileApi }
}

const selectClass = "min-h-11 w-full rounded-md border-0 bg-(--input-fill) px-3 text-base text-foreground outline-none focus-visible:border-2 focus-visible:border-primary focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-2 aria-invalid:border-destructive";
const radioClass = "size-6 shrink-0 accent-primary";
const PRIVACY_NOTICE_VERSION = "2026-09-30";
const MARKETING_WORDING_VERSION = "2026-09-30";

const DemoForm = ({
  initialIntent,
  submissionId,
  responsePromise,
  contactEmail,
  turnstileSiteKey
}: Props) => {
  const [intent, setIntent] = useState<Intent>(initialIntent);
  const [country, setCountry] = useState("PH");
  const [messageLength, setMessageLength] = useState(0);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [heardSource, setHeardSource] = useState("");
  const [heardSaved, setHeardSaved] = useState(false);
  const renderedAt = useRef(0);
  const errorSummary = useRef<HTMLDivElement>(null);
  const successHeading = useRef<HTMLHeadingElement>(null);
  const turnstileContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    renderedAt.current = Date.now();
  }, []);

  useEffect(() => {
    if (!success) return;
    successHeading.current?.focus();
  }, [success]);

  useEffect(() => {
    if (Object.keys(errors).length === 0) return;
    errorSummary.current?.focus();
  }, [errors]);

  useEffect(() => {
    if (!turnstileSiteKey) return;
    let cancelled = false;
    let widgetId = "";

    const render = () => {
      if (cancelled || widgetId || !window.turnstile || !turnstileContainer.current) return;
      widgetId = window.turnstile.render(turnstileContainer.current, {
        sitekey: turnstileSiteKey,
        callback: setTurnstileToken,
        "expired-callback": () => setTurnstileToken(""),
        "error-callback": () => setTurnstileToken("")
      });
    };
    const existing = document.querySelector<HTMLScriptElement>("script[data-karon-lead-turnstile]");

    if (existing) {
      const interval = window.setInterval(render, 50);
      render();
      return () => {
        cancelled = true;
        window.clearInterval(interval);
        if (widgetId) window.turnstile?.remove(widgetId);
      };
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.dataset.karonLeadTurnstile = "true";
    script.addEventListener("load", render);
    document.head.append(script);

    return () => {
      cancelled = true;
      if (widgetId) window.turnstile?.remove(widgetId);
    };
  }, [turnstileSiteKey]);

  const errorFor = (field: string) => errors[field] ? (
    <p className="mt-1 text-sm font-semibold text-destructive" id={`${field}-error`}>{errors[field]}</p>
  ) : null;
  const describedBy = (field: string, hint?: string) =>
    [hint, errors[field] ? `${field}-error` : undefined].filter(Boolean).join(" ") || undefined;

  const attribution = () => {
    let utms: Record<string, string> = {};
    try {
      const stored = JSON.parse(sessionStorage.getItem(UTM_STORAGE_KEY) ?? "{}") as unknown;
      if (stored && typeof stored === "object" && !Array.isArray(stored)) {
        utms = Object.fromEntries(
          Object.entries(stored).filter((entry): entry is [string, string] =>
            typeof entry[1] === "string"
          )
        );
      }
    } catch {
      utms = {};
    }

    return {
      utmSource: utms.utm_source,
      utmMedium: utms.utm_medium,
      utmCampaign: utms.utm_campaign,
      utmTerm: utms.utm_term,
      utmContent: utms.utm_content,
      landingPath: window.__karonLanding?.landingPath ?? window.location.pathname,
      referrerDomain: window.__karonLanding?.referrerDomain
    };
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setPending(true);
    setErrors({});

    try {
      const payload = {
        submissionId,
        intent,
        name: data.get("name"),
        clinicName: data.get("clinicName"),
        country,
        province: data.get("province"),
        city: data.get("city"),
        email: data.get("email"),
        clinicSize: data.get("clinicSize"),
        role: data.get("role"),
        mobile: data.get("mobile"),
        ...(intent === "demo" ? { preferredTime: data.get("preferredTime") } : {}),
        message: data.get("message"),
        privacyAcknowledged: data.get("privacyAcknowledged") === "on",
        marketingOptIn: data.get("marketingOptIn") === "on",
        privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
        marketingWordingVersion: MARKETING_WORDING_VERSION,
        sourcePage: "/demo",
        renderedAt: renderedAt.current,
        turnstileToken: turnstileToken || undefined,
        website: data.get("website"),
        attribution: attribution()
      };
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json() as {
        error?: string;
        fieldErrors?: FieldErrors;
        submissionId?: string;
        intent?: Intent;
        clinicSize?: "1_chair" | "2_chairs" | "3_plus";
      };

      if (!response.ok) {
        const nextErrors = result.fieldErrors ?? { form: result.error ?? "Try again." };
        setErrors(nextErrors);
        return;
      }

      if (result.submissionId && result.intent && result.clinicSize) {
        trackLeadSubmitted({
          submissionId: result.submissionId,
          intent: result.intent,
          clinicSize: result.clinicSize
        });
      }
      setSuccess(true);
    } catch {
      setErrors({ form: "We could not send that yet. Try again or email us." });
    } finally {
      setPending(false);
    }
  };

  const saveHeardAbout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        submissionId,
        source: heardSource,
        other: data.get("heardOther")
      })
    });
    if (response.ok) setHeardSaved(true);
  };

  if (success) {
    return (
      <Card aria-live="polite" className="bg-background">
        <CardHeader>
          <h2 className="text-xl font-bold" ref={successHeading} tabIndex={-1}>Thank you. We received your {intent === "demo" ? "demo request" : "application"}.</h2>
        </CardHeader>
        <CardContent className="space-y-6">
          <p>Joshua will review it and reply {responsePromise}.</p>
          <form className="space-y-3" onSubmit={saveHeardAbout}>
            <label className="block font-semibold" htmlFor="heardSource">How did you hear about Karon? (optional)</label>
            <select className={selectClass} id="heardSource" onChange={(event) => setHeardSource(event.target.value)} value={heardSource}>
              <option value="">Choose an answer</option>
              <option value="search">Search</option>
              <option value="facebook">Facebook</option>
              <option value="colleague">A colleague</option>
              <option value="dental_group">Dental group</option>
              <option value="event">Event</option>
              <option value="other">Other</option>
            </select>
            {heardSource === "other" && <Input aria-label="Other source" maxLength={100} name="heardOther" required />}
            {heardSource && !heardSaved && <Button type="submit" variant="outline">Share answer</Button>}
            {heardSaved && <p className="text-sm font-semibold text-success" role="status">Answer saved.</p>}
          </form>
          <Link className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline" href="/features">See what works today</Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <form className="space-y-6" noValidate onSubmit={submit}>
      {Object.keys(errors).length > 0 && (
        <div aria-labelledby="error-summary-title" className="rounded-lg border-2 border-destructive bg-destructive-subtle p-4" ref={errorSummary} role="alert" tabIndex={-1}>
          <h2 className="font-bold" id="error-summary-title">Check the form</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {Object.entries(errors).map(([field, message]) => (
              <li key={field}>{field === "form" ? message : <a className="font-semibold underline" href={`#${field}`}>{message}</a>}</li>
            ))}
          </ul>
        </div>
      )}

      <fieldset aria-describedby={describedBy("clinicSize")} aria-invalid={Boolean(errors.clinicSize)} id="clinicSize">
        <legend className="mb-2 font-bold">What would you like to do?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(["application", "demo"] as const).map((value) => (
            <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-border bg-background px-3 has-checked:border-primary has-checked:ring-2 has-checked:ring-ring" key={value}>
              <input checked={intent === value} className={radioClass} name="intent" onChange={() => setIntent(value)} type="radio" value={value} />
              <span className="font-semibold">{value === "application" ? "Apply as a founding clinic" : "Book a demo"}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div><label className="mb-1 block font-semibold" htmlFor="name">Name</label><Input aria-describedby={describedBy("name")} aria-invalid={Boolean(errors.name)} autoComplete="name" id="name" maxLength={100} name="name" required />{errorFor("name")}</div>
      <div><label className="mb-1 block font-semibold" htmlFor="clinicName">Clinic name</label><Input aria-describedby={describedBy("clinicName")} aria-invalid={Boolean(errors.clinicName)} autoComplete="organization" id="clinicName" maxLength={120} name="clinicName" required />{errorFor("clinicName")}</div>
      <div><label className="mb-1 block font-semibold" htmlFor="country">Country</label><select aria-describedby={describedBy("country")} aria-invalid={Boolean(errors.country)} autoComplete="country" className={selectClass} id="country" name="country" onChange={(event) => setCountry(event.target.value)} required value={country}>{countries.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select>{errorFor("country")}</div>
      <div><label className="mb-1 block font-semibold" htmlFor="province">State or province (optional)</label>{country === "PH" ? <select autoComplete="address-level1" className={selectClass} id="province" name="province"><option value="">Choose a province</option>{philippineProvinces.map((province) => <option key={province}>{province}</option>)}</select> : <Input autoComplete="address-level1" id="province" maxLength={100} name="province" />}{errorFor("province")}</div>
      <div><label className="mb-1 block font-semibold" htmlFor="city">City or municipality</label><Input aria-describedby={describedBy("city")} aria-invalid={Boolean(errors.city)} autoComplete="address-level2" id="city" maxLength={100} name="city" required />{errorFor("city")}</div>
      <div><label className="mb-1 block font-semibold" htmlFor="email">Email</label><Input aria-describedby={describedBy("email")} aria-invalid={Boolean(errors.email)} autoComplete="email" id="email" maxLength={254} name="email" required type="email" />{errorFor("email")}</div>

      <fieldset>
        <legend className="mb-2 font-bold">Chairs</legend>
        <div className="grid grid-cols-3 gap-2">
          {(["1_chair", "2_chairs", "3_plus"] as const).map((value, index) => <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-background px-2 has-checked:border-primary has-checked:ring-2 has-checked:ring-ring" key={value}><input className={radioClass} name="clinicSize" required type="radio" value={value} /><span className="font-semibold">{index === 2 ? "3 or more" : index + 1}</span></label>)}
        </div>
        {errorFor("clinicSize")}
      </fieldset>

      <div><label className="mb-1 block font-semibold" htmlFor="role">Role</label><select aria-describedby={describedBy("role")} aria-invalid={Boolean(errors.role)} className={selectClass} defaultValue="" id="role" name="role" required><option disabled value="">Choose your role</option><option value="owner_dentist">Owner dentist</option><option value="associate_dentist">Associate dentist</option><option value="clinic_manager">Clinic manager</option><option value="assistant_front_desk">Assistant or front desk</option><option value="other">Other</option></select>{errorFor("role")}</div>
      <div><label className="mb-1 block font-semibold" htmlFor="mobile">Mobile (optional)</label><Input aria-describedby={describedBy("mobile")} aria-invalid={Boolean(errors.mobile)} autoComplete="tel" id="mobile" maxLength={40} name="mobile" type="tel" />{errorFor("mobile")}</div>

      {intent === "demo" && <div aria-live="polite"><label className="mb-1 block font-semibold" htmlFor="preferredTime">Preferred time (optional)</label><select aria-describedby={describedBy("preferredTime")} aria-invalid={Boolean(errors.preferredTime)} className={selectClass} defaultValue="" id="preferredTime" name="preferredTime"><option disabled value="">Choose a time</option><option value="weekday_morning">Weekday morning</option><option value="weekday_lunch">Weekday lunch</option><option value="weekday_evening">Weekday evening</option><option value="saturday">Saturday</option></select>{errorFor("preferredTime")}</div>}

      <div>
        <label className="mb-1 block font-semibold" htmlFor="message">Anything we should know before we reply? (optional)</label>
        <p className="mb-2 text-sm text-muted-foreground" id="message-hint">Please don&apos;t include patient details.</p>
        <textarea aria-describedby={describedBy("message", "message-hint message-counter")} aria-invalid={Boolean(errors.message)} className={`${selectClass} min-h-32 py-3`} id="message" maxLength={500} name="message" onChange={(event) => setMessageLength(event.target.value.length)} />
        <div className="mt-1 flex items-start justify-between gap-3"><div>{errorFor("message")}</div><span aria-live={messageLength === 500 ? "polite" : "off"} className="text-sm tabular-nums text-muted-foreground" id="message-counter">{messageLength} / 500</span></div>
      </div>

      <label className="flex min-h-11 cursor-pointer items-start gap-3"><input aria-describedby={describedBy("privacyAcknowledged")} aria-invalid={Boolean(errors.privacyAcknowledged)} className={`${radioClass} mt-1`} id="privacyAcknowledged" name="privacyAcknowledged" required type="checkbox" /><span>I have read the <Link className="font-semibold text-primary underline" href="/legal/privacy">privacy notice</Link> and understand how Karon will use my details.</span></label>
      {errorFor("privacyAcknowledged")}
      <label className="flex min-h-11 cursor-pointer items-start gap-3"><input className={`${radioClass} mt-1`} id="marketingOptIn" name="marketingOptIn" type="checkbox" /><span>Send me launch updates</span></label>

      <div aria-hidden="true" className="absolute -left-[9999px]"><label htmlFor="website">Website</label><input autoComplete="off" id="website" name="website" tabIndex={-1} /></div>
      {turnstileSiteKey && <div className="min-h-16 min-w-0" ref={turnstileContainer} />}
      {errors.form && <p className="font-semibold text-destructive">{errors.form} <a className="underline" href={`mailto:${contactEmail}`}>Email us instead</a>.</p>}
      <Button className="w-full sm:w-auto" disabled={pending || Boolean(turnstileSiteKey && !turnstileToken)} type="submit">{pending ? "Sending…" : intent === "demo" ? "Request a demo" : "Send my application"}</Button>
    </form>
  );
};

export default DemoForm;
