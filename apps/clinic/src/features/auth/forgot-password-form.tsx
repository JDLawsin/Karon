"use client";

import { Alert, Button, Input, Label } from "@karon/design-system";
import Link from "next/link";
import { useState } from "react";

import { forgotPasswordSchema } from "@/features/auth/auth-schemas";
import { magicLinkRedirect } from "@/features/auth/auth-redirects";
import FieldError from "@/lib/forms/field-error";
import { markHydrated, useClinicForm } from "@/lib/forms/use-clinic-form";
import { createBrowserSupabase } from "@/lib/supabase/browser";

const ForgotPasswordForm = () => {
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useClinicForm(forgotPasswordSchema, {
    defaultValues: { email: "" }
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setError(null);
    setInfo(null);
    const supabase = createBrowserSupabase();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: magicLinkRedirect(window.location.origin) }
    );

    if (resetError) {
      setError("Could not send a reset link.");
      return;
    }

    setInfo("Check your email for a reset link.");
  });

  return (
    <div className="flex flex-col gap-6">
      {info ? (
        <>
          <Alert title="Check your email" variant="info">
            {info}
          </Alert>
          <Button
            onClick={() => {
              setInfo(null);
            }}
            type="button"
            variant="outline"
          >
            Use a different email
          </Button>
        </>
      ) : (
        <form
          className="flex flex-col gap-4"
          method="post"
          onSubmit={onSubmit}
          ref={markHydrated}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              aria-describedby={errors.email ? "email-error" : undefined}
              aria-invalid={Boolean(errors.email)}
              autoComplete="email"
              id="email"
              inputMode="email"
              type="email"
              {...register("email")}
            />
            <FieldError id="email-error" message={errors.email?.message} />
          </div>
          {error ? (
            <Alert title="Could not send a reset link" variant="danger">
              {error}
            </Alert>
          ) : null}
          <Button disabled={isSubmitting} type="submit">
            Send reset link
          </Button>
        </form>
      )}
      <p className="text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link
          className="inline-flex min-h-(--control-min-height) items-center text-sm text-primary underline-offset-4 hover:underline"
          href="/login"
        >
          Log in
        </Link>
      </p>
    </div>
  );
};

export default ForgotPasswordForm;
