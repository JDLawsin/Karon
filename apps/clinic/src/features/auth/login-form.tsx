"use client";

import { Alert, Button, Input, Label } from "@karon/design-system";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import AuthProviderButtons from "@/features/auth/auth-provider-buttons";
import { googleOAuthStart, magicLinkRedirect } from "@/features/auth/auth-redirects";
import { loginCredentialsSchema } from "@/features/auth/auth-schemas";
import { completeSignIn } from "@/features/auth/complete-sign-in";
import PasswordField from "@/features/auth/password-field";
import FieldError from "@/lib/forms/field-error";
import { markHydrated, useClinicForm } from "@/lib/forms/use-clinic-form";
import { createBrowserSupabase } from "@/lib/supabase/browser";

const loginErrorTitle = (message: string) =>
  message === "Could not send a sign-in link."
    ? "Could not send a link"
    : "Could not log in";

const LoginForm = () => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    getValues,
    trigger,
    formState: { errors, isSubmitting }
  } = useClinicForm(loginCredentialsSchema, {
    defaultValues: { email: "", password: "" }
  });

  const finishSignIn = async () => {
    const supabase = createBrowserSupabase();
    const { destination } = await completeSignIn(supabase, "/login");
    router.push(destination);
    router.refresh();
  };

  const onPassword = handleSubmit(async ({ email, password }) => {
    setError(null);
    setInfo(null);
    const supabase = createBrowserSupabase();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      setError("Could not log in with those details.");
      return;
    }

    await finishSignIn();
  });

  const onMagicLink = async () => {
    setError(null);
    setInfo(null);
    const emailOk = await trigger("email");

    if (!emailOk) {
      return;
    }

    const supabase = createBrowserSupabase();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: getValues("email"),
      options: { emailRedirectTo: magicLinkRedirect(window.location.origin) }
    });

    if (otpError) {
      setError("Could not send a sign-in link.");
      return;
    }

    setInfo("Check your email for a sign-in link.");
  };

  const onGoogle = async () => {
    setError(null);
    setInfo(null);
    const supabase = createBrowserSupabase();
    const { error: oauthError } = await supabase.auth.signInWithOAuth(
      googleOAuthStart(window.location.origin)
    );

    if (oauthError) {
      setError("Google sign-in is not available on this clinic yet.");
    }
  };

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
        <>
          <form
            className="flex flex-col gap-4"
            method="post"
            onSubmit={onPassword}
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
            <div className="flex flex-col gap-2">
              <PasswordField
                aria-describedby={errors.password ? "password-error" : undefined}
                aria-invalid={Boolean(errors.password)}
                autoComplete="current-password"
                disabled={isSubmitting}
                id="password"
                {...register("password")}
              />
              <FieldError id="password-error" message={errors.password?.message} />
            </div>
            <p>
              <Link
                className="inline-flex min-h-(--control-min-height) items-center text-sm text-primary underline-offset-4 hover:underline"
                href="/forgot-password"
              >
                Forgot password?
              </Link>
            </p>
            {error ? (
              <Alert title={loginErrorTitle(error)} variant="danger">
                {error}
              </Alert>
            ) : null}
            <Button disabled={isSubmitting} type="submit">
              Log in
            </Button>
          </form>
          <AuthProviderButtons
            onGoogle={onGoogle}
            onMagicLink={onMagicLink}
            pending={isSubmitting}
          />
        </>
      )}
      <p className="text-sm text-muted-foreground">
        New clinic?{" "}
        <Link
          className="inline-flex min-h-(--control-min-height) items-center text-sm text-primary underline-offset-4 hover:underline"
          href="/signup"
        >
          Create a clinic
        </Link>
      </p>
    </div>
  );
};

export default LoginForm;
