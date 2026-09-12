"use client";

import {
  Alert,
  Button,
  DrawerClose,
  DrawerFooter,
  Input,
  Label
} from "@karon/design-system";
import { useState } from "react";
import { z } from "zod";

import {
  clinicLocalParts,
  startsAtFromClinicLocal
} from "@/features/today-board/project-today-board";
import FieldError from "@/lib/forms/field-error";
import { markHydrated, useClinicForm } from "@/lib/forms/use-clinic-form";

const walkInSchema = z.object({
  name: z.string().trim().min(1, "Enter a name."),
  mobile: z.string().trim().min(1, "Enter a mobile."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a date."),
  time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Enter a time.")
});

type WalkInDraft = {
  name: string;
  mobile: string;
  startsAt: string;
};

type Props = {
  isDuplicateMobile: (mobile: string) => boolean;
  onSave: (draft: WalkInDraft) => Promise<void>;
};

const WalkInForm = ({ isDuplicateMobile, onSave }: Props) => {
  const [error, setError] = useState<string | null>(null);
  const defaults = clinicLocalParts(new Date());
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting }
  } = useClinicForm(walkInSchema, {
    defaultValues: { name: "", mobile: "", date: defaults.date, time: defaults.time }
  });
  const mobile = watch("mobile") ?? "";
  const duplicate = isDuplicateMobile(mobile);

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      method="post"
      onSubmit={handleSubmit(async (draft) => {
        setError(null);
        try {
          await onSave({
            name: draft.name,
            mobile: draft.mobile,
            startsAt: startsAtFromClinicLocal(draft.date, draft.time)
          });
        } catch {
          setError("Could not save on this device.");
        }
      })}
      ref={markHydrated}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
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
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="walk-in-date">Date</Label>
            <Input
              aria-describedby={errors.date ? "walk-in-date-error" : undefined}
              aria-invalid={Boolean(errors.date)}
              id="walk-in-date"
              type="date"
              {...register("date")}
            />
            <FieldError id="walk-in-date-error" message={errors.date?.message} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="walk-in-time">Time</Label>
            <Input
              aria-describedby={errors.time ? "walk-in-time-error" : undefined}
              aria-invalid={Boolean(errors.time)}
              id="walk-in-time"
              type="time"
              {...register("time")}
            />
            <FieldError id="walk-in-time-error" message={errors.time?.message} />
          </div>
        </div>
        {duplicate ? (
          <Alert
            id="walk-in-mobile-duplicate"
            title="This mobile is already on a patient"
            variant="info"
          >
            You can still add.
          </Alert>
        ) : null}
        {error ? (
          <Alert title="Could not add patient" variant="danger">
            {error}
          </Alert>
        ) : null}
      </div>
      <DrawerFooter>
        <Button disabled={isSubmitting} type="submit">
          Add patient
        </Button>
        <DrawerClose render={<Button type="button" variant="outline" />}>
          Cancel
        </DrawerClose>
      </DrawerFooter>
    </form>
  );
};

export default WalkInForm;
