"use client";

import { Alert, Button, cn, Input, Label } from "@karon/design-system";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { FieldPath } from "react-hook-form";
import type { z } from "zod";

import { tenantIdSchema } from "@/features/auth/auth-schemas";
import ClinicHoursFields from "@/features/auth/clinic-hours-fields";
import ClinicIdentityFields from "@/features/auth/clinic-identity-fields";
import ClinicLogoField from "@/features/auth/clinic-logo-field";
import { uploadClinicLogo } from "@/features/auth/clinic-logo";
import ClinicServicesFields from "@/features/auth/clinic-services-fields";
import { completeSignIn } from "@/features/auth/complete-sign-in";
import {
  MAX_STAFF_INVITES,
  ONBOARDING_STEPS,
  WORKING_DAYS,
  clinicOnboardingSchema,
  defaultOnboardingValues,
  onboardingHoursSchema,
  onboardingIdentitySchema,
  onboardingServicesSchema,
  onboardingStaffSchema,
  staffInviteEmails,
  stepForOnboardingIssues,
  toClinicProfile,
  type ClinicOnboarding
} from "@/features/auth/onboarding-schemas";
import { writeAuditEvent } from "@/lib/auth/audit";
import FieldError from "@/lib/forms/field-error";
import { markHydrated, useClinicForm } from "@/lib/forms/use-clinic-form";
import { createBrowserSupabase } from "@/lib/supabase/browser";

const STEP_SCHEMAS = [
  onboardingIdentitySchema,
  onboardingHoursSchema,
  onboardingStaffSchema,
  onboardingServicesSchema
] as const;

const formatDays = (days: number[]) =>
  WORKING_DAYS.filter((day) => days.includes(day.value))
    .map((day) => day.short)
    .join(", ");

const formatAddress = (values: ClinicOnboarding) => {
  const parts = [
    values.line1,
    values.barangay,
    values.city,
    values.province,
    values.postalCode
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Not added";
};

const OnboardingForm = () => {
  const router = useRouter();
  const headingRef = useRef<HTMLParagraphElement>(null);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const {
    register,
    getValues,
    setValue,
    setError: setFieldError,
    clearErrors,
    watch,
    formState: { errors }
  } = useClinicForm(clinicOnboardingSchema, {
    defaultValues: defaultOnboardingValues()
  });
  const values = watch();
  const current = ONBOARDING_STEPS[step];

  useEffect(() => {
    const id = window.setTimeout(() => {
      void createBrowserSupabase()
        .auth.getUser()
        .then(({ data }) => {
          const email = data.user?.email;
          if (email && !getValues("email")) {
            setValue("email", email);
          }
        });
    }, 0);

    return () => window.clearTimeout(id);
  }, [getValues, setValue]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    const sub = watch((_values, { name }) => {
      if (name) {
        clearErrors(name);
      }
    });

    return () => sub.unsubscribe();
  }, [clearErrors, watch]);

  const applyIssues = (zodError: z.ZodError) => {
    clearErrors();
    for (const issue of zodError.issues) {
      const path = issue.path.join(".") as FieldPath<ClinicOnboarding>;
      if (path) {
        setFieldError(path, { type: "manual", message: issue.message });
      }
    }
  };

  const goNext = () => {
    setError(null);
    const schema = STEP_SCHEMAS[step];

    if (!schema) {
      return;
    }

    const parsed = schema.safeParse(getValues());

    if (!parsed.success) {
      applyIssues(parsed.error);
      return;
    }

    clearErrors();
    setStep((currentStep) => currentStep + 1);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (step < ONBOARDING_STEPS.length - 1) {
      goNext();
    }
  };

  const createClinic = async () => {
    if (pending) {
      return;
    }

    setError(null);
    setInfo(null);
    const parsed = clinicOnboardingSchema.safeParse(getValues());

    if (!parsed.success) {
      applyIssues(parsed.error);
      setStep(stepForOnboardingIssues(parsed.error.issues));
      return;
    }

    setPending(true);
    const supabase = createBrowserSupabase();

    try {
      const { data: createdId, error: createError } = await supabase.rpc(
        "create_clinic",
        { p_name: parsed.data.name, p_profile: toClinicProfile(parsed.data) }
      );
      const tenantId = tenantIdSchema.safeParse(createdId);

      if (createError || !tenantId.success) {
        setError("Could not create that clinic. You may already belong to one.");
        return;
      }

      let inviteFailed = false;

      try {
        if (logoFile) {
          await uploadClinicLogo(supabase, tenantId.data, logoFile);
        }

        const emails = staffInviteEmails(parsed.data);

        for (const email of emails) {
          try {
            const response = await fetch("/api/members", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ email })
            });

            if (!response.ok) {
              inviteFailed = true;
            }
          } catch {
            inviteFailed = true;
          }
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
      } catch {
        setInfo(
          inviteFailed
            ? "Clinic is created. Some invites could not be sent. Open Today or refresh this page."
            : "Clinic is created. Open Today or refresh this page."
        );
      }
    } catch {
      setError("Could not create that clinic. You may already belong to one.");
    } finally {
      setPending(false);
    }
  };

  const staffEmails = values.staffEmails ?? [""];
  const invites = staffInviteEmails(values);

  return (
    <form
      aria-busy={pending}
      className="flex flex-col gap-6"
      method="post"
      onSubmit={onSubmit}
      ref={markHydrated}
    >
      <nav aria-label="Setup steps">
        <ol className="flex min-w-0 gap-1">
          {ONBOARDING_STEPS.map((item, index) => {
            const active = index === step;
            const done = index < step;
            return (
              <li className="min-w-0 flex-1" key={item.id}>
                <span
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "flex min-h-(--control-min-height) items-center justify-center rounded-md text-sm font-medium",
                    active
                      ? "bg-primary text-primary-foreground"
                      : done
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  <span aria-hidden>{index + 1}</span>
                  <span className="sr-only">
                    {item.label}
                    {active ? ", current step" : done ? ", completed" : ""}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </nav>
      <p
        className="text-sm text-muted-foreground outline-none"
        ref={headingRef}
        tabIndex={-1}
      >
        Step {step + 1} of {ONBOARDING_STEPS.length}. {current?.blurb}
      </p>

      {step === 0 ? (
        <div className="flex flex-col gap-4">
          <ClinicIdentityFields
            errors={errors}
            idPrefix="onboarding"
            register={register}
          />
          <ClinicLogoField
            error={logoError}
            file={logoFile}
            id="onboarding-logo"
            onFileChange={(file, nextError) => {
              setLogoFile(file);
              setLogoError(nextError);
            }}
            remoteUrl={null}
          />
        </div>
      ) : null}

      {step === 1 ? (
        <ClinicHoursFields
          errors={errors}
          idPrefix="onboarding"
          register={register}
          setValue={setValue}
          watch={watch}
        />
      ) : null}

      {step === 2 ? (
        <div className="flex flex-col gap-4">
          {staffEmails.map((_, index) => {
            const id = `onboarding-staff-${index}`;
            const message = errors.staffEmails?.[index]?.message;
            return (
              <div className="flex min-w-0 flex-col gap-2" key={id}>
                <Label htmlFor={id}>Assistant email</Label>
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
                  <Input
                    aria-describedby={message ? `${id}-error` : undefined}
                    aria-invalid={Boolean(message)}
                    autoComplete="email"
                    className="min-w-0 flex-1"
                    id={id}
                    inputMode="email"
                    type="email"
                    {...register(`staffEmails.${index}`)}
                  />
                  {staffEmails.length > 1 ? (
                    <Button
                      onClick={() =>
                        setValue(
                          "staffEmails",
                          staffEmails.filter((_, emailIndex) => emailIndex !== index)
                        )
                      }
                      type="button"
                      variant="outline"
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground">Role: Assistant</p>
                <FieldError id={`${id}-error`} message={message} />
              </div>
            );
          })}
          {staffEmails.length < MAX_STAFF_INVITES ? (
            <Button
              onClick={() => setValue("staffEmails", [...staffEmails, ""])}
              type="button"
              variant="outline"
            >
              Add another
            </Button>
          ) : null}
        </div>
      ) : null}

      {step === 3 ? (
        <ClinicServicesFields
          errors={errors}
          idPrefix="onboarding"
          onChange={(services) => setValue("services", services)}
          services={values.services ?? []}
        />
      ) : null}

      {step === 4 ? (
        <dl className="flex flex-col gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Clinic</dt>
            <dd className="wrap-anywhere font-medium">{values.name || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Contact</dt>
            <dd className="wrap-anywhere">{values.phone}</dd>
            <dd className="wrap-anywhere">{values.email}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Address</dt>
            <dd className="wrap-anywhere">{formatAddress(values)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Logo</dt>
            <dd>{logoFile ? logoFile.name : "Not added"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Hours</dt>
            <dd>
              {formatDays(values.days)} · {values.open.slice(0, 5)}–
              {values.close.slice(0, 5)} ({values.timezone.replaceAll("_", " ")})
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Staff invites</dt>
            <dd className="wrap-anywhere">
              {invites.length > 0 ? invites.join(", ") : "None"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Services</dt>
            <dd className="wrap-anywhere">
              {values.services.length > 0
                ? values.services.map((service) => service.name).join(", ")
                : "None"}
            </dd>
          </div>
        </dl>
      ) : null}

      {error ? (
        <Alert title="Could not create that clinic" variant="danger">
          {error}
        </Alert>
      ) : null}
      {pending ? (
        <Alert title="Creating your clinic" variant="info">
          Preparing the clinic and any staff invites. Stay on this page.
        </Alert>
      ) : null}
      {info ? <Alert title={info} variant="info" /> : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        {step > 0 ? (
          <Button
            disabled={pending}
            onClick={() => setStep((currentStep) => currentStep - 1)}
            type="button"
            variant="outline"
          >
            Back
          </Button>
        ) : (
          <span className="hidden sm:block" />
        )}
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
          {step === 2 || step === 3 ? (
            <Button
              disabled={pending}
              onClick={() => setStep((currentStep) => currentStep + 1)}
              type="button"
              variant="outline"
            >
              Skip
            </Button>
          ) : null}
          {step < ONBOARDING_STEPS.length - 1 ? (
            <Button disabled={pending} key="continue" onClick={goNext} type="button">
              Continue
            </Button>
          ) : (
            <Button
              aria-busy={pending}
              disabled={pending}
              key="create"
              onClick={() => {
                void createClinic();
              }}
              type="button"
            >
              {pending ? (
                <>
                  <LoaderCircle aria-hidden className="animate-spin" />
                  Creating clinic
                </>
              ) : (
                "Create clinic"
              )}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
};

export default OnboardingForm;
