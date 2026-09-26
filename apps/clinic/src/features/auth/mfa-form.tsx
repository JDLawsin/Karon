"use client";

import { Alert, Button, Input, Label } from "@karon/design-system";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { totpSchema } from "@/features/auth/auth-schemas";
import { completeSignIn } from "@/features/auth/complete-sign-in";
import { formatTotpSecret } from "@/features/auth/format-totp-secret";
import { prepareTotpEnrollment } from "@/features/auth/prepare-totp-enrollment";
import { writeAuditEvent } from "@/lib/auth/audit";
import { leaveClinicSession } from "@/lib/auth/leave-clinic-session";
import FieldError from "@/lib/forms/field-error";
import { useClinicForm } from "@/lib/forms/use-clinic-form";
import { createBrowserSupabase } from "@/lib/supabase/browser";

const PLAY_STORE_AUTHENTICATOR =
  "https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2";
const APP_STORE_AUTHENTICATOR =
  "https://apps.apple.com/app/google-authenticator/id388497605";
const storeLinkClassName =
  "inline-flex min-h-(--control-min-height) items-center text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const MfaForm = () => {
  const router = useRouter();
  const [secret, setSecret] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useClinicForm(totpSchema, {
    defaultValues: { code: "" }
  });

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      const supabase = createBrowserSupabase();
      const { data, error: listError } = await supabase.auth.mfa.listFactors();

      if (cancelled) {
        return;
      }

      if (listError || !data) {
        setError("Owner MFA is not available on this clinic yet.");
        return;
      }

      const plan = prepareTotpEnrollment(data);

      if (plan.kind === "challenge") {
        setFactorId(plan.factorId);
        return;
      }

      setEnrolling(true);

      for (const dropId of plan.dropIds) {
        const { error: unenrollError } = await supabase.auth.mfa.unenroll({
          factorId: dropId
        });

        if (cancelled) {
          return;
        }

        if (unenrollError) {
          setError("Could not reset authenticator setup. Try again.");
          return;
        }
      }

      const { data: enrolled, error: enrollError } = await supabase.auth.mfa.enroll(
        {
          factorType: "totp",
          friendlyName: "Karon"
        }
      );

      if (cancelled) {
        return;
      }

      if (enrollError || !enrolled?.totp?.secret) {
        setError("Could not start authenticator setup. Try again.");
        return;
      }

      setFactorId(enrolled.id);
      setSecret(enrolled.totp.secret);
      setQrCode(enrolled.totp.qr_code ?? null);
      setUri(enrolled.totp.uri ?? null);
    };

    void start();
    return () => {
      cancelled = true;
    };
  }, []);

  const copySecret = async () => {
    if (!secret || typeof navigator.clipboard?.writeText !== "function") {
      return;
    }

    try {
      await navigator.clipboard.writeText(secret.replaceAll(" ", ""));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const onSubmit = handleSubmit(async ({ code }) => {
    setError(null);

    if (!factorId) {
      setError("Enter the 6-digit authenticator code.");
      return;
    }

    const supabase = createBrowserSupabase();
    const { data: challenge, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId });

    if (challengeError || !challenge) {
      setError("Could not start the authenticator check.");
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code
    });

    if (verifyError) {
      setError("That authenticator code is not valid.");
      return;
    }

    try {
      await fetch("/api/auth/device-trust?issue=1", { method: "POST" });
    } catch {
      // Cookie issue is best-effort; this aal2 session can still open the clinic.
    }

    const snapshot = await completeSignIn(supabase, "/mfa", null);

    if (enrolling && snapshot.membership && snapshot.userId) {
      await writeAuditEvent(supabase, {
        tenantId: snapshot.membership.tenantId,
        actorUserId: snapshot.userId,
        eventType: "auth.mfa_enrolled"
      });
    }

    router.push(snapshot.destination);
    router.refresh();
  });

  const signOut = async () => {
    const result = await leaveClinicSession(createBrowserSupabase());

    if (result.status === "blocked") {
      setError("Unsynced clinic work is protected on this device.");
      return;
    }

    router.push("/login");
    router.refresh();
  };

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <p className="text-muted-foreground">
        {secret
          ? "Scan this code with an authenticator app, or add it on this phone."
          : "Owners must confirm with an authenticator app before opening the clinic."}
      </p>
      {secret ? (
        <div className="flex min-w-0 flex-col gap-3">
          <p className="min-w-0 text-sm text-muted-foreground">
            No authenticator yet? Install Google Authenticator from the{" "}
            <a
              className={storeLinkClassName}
              href={PLAY_STORE_AUTHENTICATOR}
              rel="noopener noreferrer"
              target="_blank"
            >
              Play Store
            </a>{" "}
            or{" "}
            <a
              className={storeLinkClassName}
              href={APP_STORE_AUTHENTICATOR}
              rel="noopener noreferrer"
              target="_blank"
            >
              App Store
            </a>
            , then come back here.
          </p>
          {qrCode ? (
            <div className="mx-auto w-48 max-w-full rounded-md bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- SVG data URL from enroll */}
              <img
                alt="Authenticator setup QR code"
                className="aspect-square w-full"
                src={qrCode}
              />
            </div>
          ) : null}
          {uri?.startsWith("otpauth://totp/") ? (
            <Button asChild variant="outline">
              <a href={uri}>Add to authenticator app</a>
            </Button>
          ) : null}
          <details className="min-w-0 rounded-md border-(length:var(--surface-border-width)) border-border px-3">
            <summary className="flex min-h-(--control-min-height) cursor-pointer items-center text-sm font-medium">
              {"Can't scan?"}
            </summary>
            <div className="flex flex-col gap-2 pb-3">
              <p className="wrap-break-word font-mono text-sm">
                Authenticator key: {formatTotpSecret(secret)}
              </p>
              <Button
                onClick={() => {
                  void copySecret();
                }}
                type="button"
                variant="outline"
              >
                {copied ? "Copied" : "Copy key"}
              </Button>
            </div>
          </details>
        </div>
      ) : !error && !factorId ? (
        <p className="text-sm text-muted-foreground" role="status">
          Setting up authenticator…
        </p>
      ) : null}
      <div className="flex flex-col gap-2">
        <Label htmlFor="totp">Authenticator code</Label>
        <Input
          aria-describedby={errors.code ? "totp-error" : undefined}
          aria-invalid={Boolean(errors.code)}
          autoComplete="one-time-code"
          id="totp"
          inputMode="numeric"
          pattern="[0-9]*"
          {...register("code")}
        />
        <FieldError id="totp-error" message={errors.code?.message} />
      </div>
      {error ? (
        <Alert title="Could not confirm" variant="danger">
          {error}
        </Alert>
      ) : null}
      <Button disabled={isSubmitting} type="submit">
        Confirm code
      </Button>
      </form>
      <Button onClick={() => void signOut()} type="button" variant="outline">
        Sign out
      </Button>
    </div>
  );
};

export default MfaForm;
