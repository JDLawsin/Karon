"use client";

import { Alert, Button, Input, Label } from "@karon/design-system";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { clinicOnboardingSchema, tenantIdSchema } from "@/features/auth/auth-schemas";
import { completeSignIn } from "@/features/auth/complete-sign-in";
import { writeAuditEvent } from "@/lib/auth/audit";
import FieldError from "@/lib/forms/field-error";
import { markHydrated, useClinicForm } from "@/lib/forms/use-clinic-form";
import { createBrowserSupabase } from "@/lib/supabase/browser";

const OnboardingForm = () => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useClinicForm(clinicOnboardingSchema, {
    defaultValues: { name: "" }
  });

  const onSubmit = handleSubmit(async ({ name }) => {
    setError(null);
    const supabase = createBrowserSupabase();
    const { data: createdId, error: createError } = await supabase.rpc(
      "create_clinic",
      { p_name: name }
    );
    const tenantId = tenantIdSchema.safeParse(createdId);

    if (createError || !tenantId.success) {
      setError("Could not create that clinic. You may already belong to one.");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();

    if (userData.user) {
      await writeAuditEvent(supabase, {
        tenantId: tenantId.data,
        actorUserId: userData.user.id,
        eventType: "auth.signup"
      });
    }

    const { destination } = await completeSignIn(supabase, "/onboarding", null);
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
      <div className="flex flex-col gap-2">
        <Label htmlFor="clinic-name">Clinic name</Label>
        <Input
          aria-describedby={errors.name ? "clinic-name-error" : undefined}
          aria-invalid={Boolean(errors.name)}
          autoComplete="organization"
          id="clinic-name"
          {...register("name")}
        />
        <FieldError id="clinic-name-error" message={errors.name?.message} />
      </div>
      {error ? (
        <Alert title="Could not create that clinic" variant="danger">
          {error}
        </Alert>
      ) : null}
      <Button disabled={isSubmitting} type="submit">
        Create clinic
      </Button>
    </form>
  );
};

export default OnboardingForm;
