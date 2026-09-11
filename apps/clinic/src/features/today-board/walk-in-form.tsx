"use client";

import { Alert, Button, Input, Label } from "@karon/design-system";
import { useState } from "react";
import { z } from "zod";

import FieldError from "@/lib/forms/field-error";
import { markHydrated, useClinicForm } from "@/lib/forms/use-clinic-form";

const walkInSchema = z.object({
  name: z.string().trim().min(1, "Enter a name."),
  mobile: z.string().trim().min(1, "Enter a mobile.")
});

type WalkInDraft = z.infer<typeof walkInSchema>;

type Props = {
  isDuplicateMobile: (mobile: string) => boolean;
  onCancel: () => void;
  onSave: (draft: WalkInDraft) => Promise<void>;
};

const WalkInForm = ({ isDuplicateMobile, onCancel, onSave }: Props) => {
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting }
  } = useClinicForm(walkInSchema, {
    defaultValues: { name: "", mobile: "" }
  });
  const mobile = watch("mobile") ?? "";
  const duplicate = isDuplicateMobile(mobile);

  return (
    <form
      className="flex max-w-xl flex-col gap-4"
      method="post"
      onSubmit={handleSubmit(async (draft) => {
        setError(null);
        try {
          await onSave(draft);
        } catch {
          setError("Could not save on this device.");
        }
      })}
      ref={markHydrated}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="walk-in-name">Name</Label>
        <Input
          aria-describedby={errors.name ? "walk-in-name-error" : undefined}
          aria-invalid={Boolean(errors.name)}
          autoComplete="name"
          id="walk-in-name"
          {...register("name")}
        />
        <FieldError id="walk-in-name-error" message={errors.name?.message} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="walk-in-mobile">Mobile</Label>
        <Input
          aria-describedby={
            errors.mobile
              ? "walk-in-mobile-error"
              : duplicate
                ? "walk-in-mobile-duplicate"
                : undefined
          }
          aria-invalid={Boolean(errors.mobile)}
          autoComplete="tel"
          id="walk-in-mobile"
          inputMode="tel"
          {...register("mobile")}
        />
        <FieldError id="walk-in-mobile-error" message={errors.mobile?.message} />
      </div>
      {duplicate ? (
        <Alert id="walk-in-mobile-duplicate" title="This mobile is already on a patient" variant="info">
          You can still add.
        </Alert>
      ) : null}
      {error ? (
        <Alert title="Could not add patient" variant="danger">
          {error}
        </Alert>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button disabled={isSubmitting} type="submit">
          Add patient
        </Button>
        <Button onClick={onCancel} type="button" variant="outline">
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default WalkInForm;
