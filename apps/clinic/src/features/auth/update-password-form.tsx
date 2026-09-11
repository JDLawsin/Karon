"use client";

import { Alert, Button } from "@karon/design-system";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  PASSWORD_HINT,
  changePasswordSchema,
  updatePasswordSchema
} from "@/features/auth/auth-schemas";
import { completeSignIn } from "@/features/auth/complete-sign-in";
import PasswordField from "@/features/auth/password-field";
import { resolveAuthDestination } from "@/features/auth/resolve-auth-destination";
import { writeAuditEvent } from "@/lib/auth/audit";
import FieldError from "@/lib/forms/field-error";
import { markHydrated, useClinicForm } from "@/lib/forms/use-clinic-form";
import { createBrowserSupabase } from "@/lib/supabase/browser";

type Props = {
  passwordRecovery: boolean;
};

const UpdatePasswordForm = ({ passwordRecovery }: Props) => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const schema = passwordRecovery ? updatePasswordSchema : changePasswordSchema;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useClinicForm(schema, {
    defaultValues: passwordRecovery
      ? { password: "", confirm: "" }
      : { currentPassword: "", password: "", confirm: "" }
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const supabase = createBrowserSupabase();

    if (!passwordRecovery) {
      const currentPassword =
        "currentPassword" in values ? values.currentPassword : undefined;

      if (!currentPassword) {
        setError("Could not update your password.");
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email;

      if (!email) {
        setError("Could not update your password.");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword
      });

      if (signInError) {
        setError("Could not update your password.");
        return;
      }
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: values.password
    });

    if (updateError) {
      setError("Could not update your password.");
      return;
    }

    await supabase.rpc("revoke_trusts_after_password_change");

    const snapshot = await completeSignIn(supabase, "/login", null);
    const destination =
      resolveAuthDestination({
        pathname: "/login",
        userId: snapshot.userId,
        aal: snapshot.aal,
        membership: snapshot.membership,
        sessionActive: snapshot.sessionActive,
        deviceTrusted: snapshot.deviceTrusted,
        passwordRecovery: false
      }) ?? "/today";

    if (snapshot.membership && snapshot.userId) {
      try {
        await writeAuditEvent(supabase, {
          tenantId: snapshot.membership.tenantId,
          actorUserId: snapshot.userId,
          eventType: "auth.password_changed"
        });
      } catch {
        // Password is already saved; do not block leaving this screen.
      }
    }

    router.push(destination);
    router.refresh();
  });

  return (
    <form
      className="flex flex-col gap-4"
      method="post"
      onSubmit={onSubmit}
      ref={markHydrated}
    >
      {passwordRecovery ? null : (
        <div className="flex flex-col gap-2">
          <PasswordField
            aria-describedby={
              "currentPassword" in errors && errors.currentPassword
                ? "current-password-error"
                : undefined
            }
            aria-invalid={Boolean(
              "currentPassword" in errors && errors.currentPassword
            )}
            autoComplete="current-password"
            disabled={isSubmitting}
            id="currentPassword"
            label="Current password"
            {...register("currentPassword")}
          />
          <FieldError
            id="current-password-error"
            message={
              "currentPassword" in errors ? errors.currentPassword?.message : undefined
            }
          />
        </div>
      )}
      <div className="flex flex-col gap-2">
        <PasswordField
          aria-describedby={errors.password ? "password-error" : undefined}
          aria-invalid={Boolean(errors.password)}
          autoComplete="new-password"
          disabled={isSubmitting}
          hint={PASSWORD_HINT}
          id="password"
          label="New password"
          {...register("password")}
        />
        <FieldError id="password-error" message={errors.password?.message} />
      </div>
      <div className="flex flex-col gap-2">
        <PasswordField
          aria-describedby={errors.confirm ? "confirm-error" : undefined}
          aria-invalid={Boolean(errors.confirm)}
          autoComplete="new-password"
          disabled={isSubmitting}
          id="confirm"
          label="Confirm password"
          {...register("confirm")}
        />
        <FieldError id="confirm-error" message={errors.confirm?.message} />
      </div>
      {error ? (
        <Alert title="Could not update your password" variant="danger">
          {error}
        </Alert>
      ) : null}
      <Button disabled={isSubmitting} type="submit">
        Update password
      </Button>
    </form>
  );
};

export default UpdatePasswordForm;
