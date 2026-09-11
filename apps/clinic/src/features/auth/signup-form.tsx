"use client";

import { Alert, Button, Input, Label } from "@karon/design-system";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import AuthProviderButtons from "@/features/auth/auth-provider-buttons";
import { googleOAuthStart, magicLinkRedirect } from "@/features/auth/auth-redirects";
import {
  PASSWORD_HINT,
  signupCredentialsSchema
} from "@/features/auth/auth-schemas";
import { completeSignIn } from "@/features/auth/complete-sign-in";
import { interpretSignUpResult } from "@/features/auth/interpret-sign-up-result";
import PasswordField from "@/features/auth/password-field";
import FieldError from "@/lib/forms/field-error";
import { markHydrated, useClinicForm } from "@/lib/forms/use-clinic-form";
import { createBrowserSupabase } from "@/lib/supabase/browser";

const signupErrorTitle = (message: string) => {
  if (message.startsWith("An account with this email")) {
    return "Account already exists";
  }

  if (message === "Could not send a sign-in link.") {
    return "Could not send a link";
  }

  return "Could not create that account";
};

const SignupForm = () => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    getValues,
    trigger,
    formState: { errors, isSubmitting }
  } = useClinicForm(signupCredentialsSchema, {
    defaultValues: { email: "", password: "" }
  });

  const onPassword = handleSubmit(async ({ email, password }) => {
    setError(null);
    setInfo(null);
    const supabase = createBrowserSupabase();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: magicLinkRedirect(window.location.origin) }
    });

    const outcome = interpretSignUpResult({
      user: data.user,
      session: data.session,
      error: signUpError
    });

    if (outcome.kind === "failed") {
      setError("Could not create that account.");
      return;
    }

    if (outcome.kind === "alreadyRegistered") {
      setError("An account with this email already exists. Log in instead.");
      return;
    }

    if (outcome.kind === "needsConfirm") {
      setInfo("Check your email to confirm this account.");
      return;
    }

    const { destination } = await completeSignIn(supabase, "/signup", null);
    router.push(destination);
    router.refresh();
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
                autoComplete="new-password"
                disabled={isSubmitting}
                hint={PASSWORD_HINT}
                id="password"
                {...register("password")}
              />
              <FieldError id="password-error" message={errors.password?.message} />
            </div>
            {error ? (
              <Alert title={signupErrorTitle(error)} variant="danger">
                {error}
              </Alert>
            ) : null}
            <Button disabled={isSubmitting} type="submit">
              Create account
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
        Already have an account?{" "}
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

export default SignupForm;
