"use client";

import { Button, DrawerFooter, Input, Label } from "@karon/design-system";
import { useState } from "react";
import { z } from "zod";

import type { PatientDraft } from "@/features/patients/local";
import type { PatientSearchRow } from "@/features/patients/patient-search";
import FieldError from "@/lib/forms/field-error";
import { markHydrated, useClinicForm } from "@/lib/forms/use-clinic-form";

const patientFormSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(120, "Use 120 characters or fewer."),
  mobile: z
    .string()
    .trim()
    .min(7, "Enter a valid mobile.")
    .max(20, "Use 20 characters or fewer."),
  email: z
    .union([
      z.literal(""),
      z.string().trim().email("Enter a valid email.").max(254, "Use 254 characters or fewer.")
    ])
    .optional()
});

type Props = {
  onCreate: (draft: PatientDraft) => Promise<string>;
  onFindDuplicates: (mobile: string) => Promise<PatientSearchRow[]>;
  onMerge: (patientId: string, draft: PatientDraft) => Promise<string>;
  onComplete: (patientId: string) => void;
  onSkip: () => void;
};

const PatientForm = ({
  onCreate,
  onFindDuplicates,
  onMerge,
  onComplete,
  onSkip
}: Props) => {
  const [pendingDraft, setPendingDraft] = useState<PatientDraft | null>(null);
  const [duplicates, setDuplicates] = useState<PatientSearchRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useClinicForm(patientFormSchema, {
    defaultValues: { name: "", mobile: "", email: "" }
  });
  const finish = (patientId: string) => {
    setPendingDraft(null);
    setDuplicates([]);
    reset();
    onComplete(patientId);
  };

  const save = async (operation: () => Promise<string>) => {
    setError(null);
    setSaving(true);

    try {
      finish(await operation());
    } catch {
      setError("Could not save on this device.");
    } finally {
      setSaving(false);
    }
  };

  const busy = isSubmitting || saving;

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      method="post"
      onSubmit={handleSubmit(async (values) => {
        const draft: PatientDraft = {
          name: values.name,
          mobile: values.mobile,
          ...(values.email ? { email: values.email } : {})
        };
        const matches = await onFindDuplicates(draft.mobile);

        if (matches.length > 0) {
          setPendingDraft(draft);
          setDuplicates(matches);
          return;
        }

        await save(() => onCreate(draft));
      })}
      ref={markHydrated}
    >
      <div className="karon-scroll-region-y flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-2 pr-1">
        <div className="flex flex-col gap-2">
          <Label htmlFor="patient-name">Full name</Label>
          <Input
            aria-describedby={errors.name ? "patient-name-error" : undefined}
            aria-invalid={Boolean(errors.name)}
            autoComplete="name"
            id="patient-name"
            {...register("name")}
          />
          <FieldError id="patient-name-error" message={errors.name?.message} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="patient-mobile">Mobile</Label>
          <Input
            aria-describedby={errors.mobile ? "patient-mobile-error" : undefined}
            aria-invalid={Boolean(errors.mobile)}
            autoComplete="tel"
            id="patient-mobile"
            inputMode="tel"
            {...register("mobile")}
          />
          <FieldError id="patient-mobile-error" message={errors.mobile?.message} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="patient-email">Email (optional)</Label>
          <Input
            aria-describedby={errors.email ? "patient-email-error" : undefined}
            aria-invalid={Boolean(errors.email)}
            autoComplete="email"
            id="patient-email"
            type="email"
            {...register("email")}
          />
          <FieldError id="patient-email-error" message={errors.email?.message} />
        </div>

        {pendingDraft ? (
          <div
            className="flex min-w-0 flex-col gap-3 rounded-lg border border-warning bg-warning-subtle p-4 text-warning-foreground"
            role="status"
          >
            <div>
              <p className="font-medium">This mobile is already on a patient</p>
              <p className="mt-1 text-sm">
                Shared family phones are allowed. Choose how to continue.
              </p>
            </div>
            {duplicates.map((patient) => (
              <div className="flex min-w-0 flex-col gap-2 rounded-md bg-card p-3" key={patient.id}>
                <div className="min-w-0">
                  <p className="wrap-anywhere font-medium text-foreground">{patient.name}</p>
                  <p className="text-sm tabular-nums text-muted-foreground">
                    {patient.mobile}
                  </p>
                </div>
                <Button
                  aria-label={`Merge with ${patient.name}`}
                  disabled={busy}
                  onClick={() => {
                    void save(() => onMerge(patient.id, pendingDraft));
                  }}
                  type="button"
                  variant="outline"
                >
                  Merge
                </Button>
              </div>
            ))}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                disabled={busy}
                onClick={() => {
                  void save(() => onCreate(pendingDraft));
                }}
                type="button"
              >
                Create anyway
              </Button>
              <Button disabled={busy} onClick={onSkip} type="button" variant="outline">
                Skip
              </Button>
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <DrawerFooter>
        <Button disabled={busy || Boolean(pendingDraft)} type="submit">
          Create patient
        </Button>
        <Button disabled={busy} onClick={onSkip} type="button" variant="outline">
          Cancel
        </Button>
      </DrawerFooter>
    </form>
  );
};

export default PatientForm;
