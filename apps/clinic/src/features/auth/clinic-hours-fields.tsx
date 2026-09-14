import { cn, Input, Label } from "@karon/design-system";
import type {
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch
} from "react-hook-form";

import {
  WORKING_DAYS,
  type ClinicDetails
} from "@/features/auth/onboarding-schemas";
import FieldError from "@/lib/forms/field-error";

type Props = {
  idPrefix: string;
  register: UseFormRegister<ClinicDetails>;
  watch: UseFormWatch<ClinicDetails>;
  setValue: UseFormSetValue<ClinicDetails>;
  errors: FieldErrors<ClinicDetails>;
};

const ClinicHoursFields = ({
  idPrefix,
  register,
  watch,
  setValue,
  errors
}: Props) => {
  const openId = `${idPrefix}-open`;
  const closeId = `${idPrefix}-close`;
  const days = watch("days") ?? [];

  const toggleDay = (day: number) => {
    const next = days.includes(day)
      ? days.filter((value) => value !== day)
      : [...days, day].sort((left, right) => left - right);
    setValue("days", next, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex min-w-0 flex-col gap-2">
        <legend className="text-sm font-medium text-foreground">Working days</legend>
        <div className="flex flex-wrap gap-2">
          {WORKING_DAYS.map((day) => {
            const selected = days.includes(day.value);
            return (
              <label
                className={cn(
                  "inline-flex min-h-(--control-min-height) min-w-0 cursor-pointer items-center gap-2 rounded-md px-3 text-sm",
                  selected
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-foreground"
                )}
                key={day.value}
              >
                <input
                  checked={selected}
                  className="size-4 accent-primary"
                  onChange={() => toggleDay(day.value)}
                  type="checkbox"
                  value={day.value}
                />
                <span>{day.short}</span>
                <span className="sr-only">{day.label}</span>
              </label>
            );
          })}
        </div>
        <FieldError id={`${idPrefix}-days-error`} message={errors.days?.message} />
      </fieldset>
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor={openId}>Opens</Label>
          <Input
            aria-describedby={errors.open ? `${openId}-error` : undefined}
            aria-invalid={Boolean(errors.open)}
            id={openId}
            type="time"
            {...register("open")}
          />
          <FieldError id={`${openId}-error`} message={errors.open?.message} />
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor={closeId}>Closes</Label>
          <Input
            aria-describedby={errors.close ? `${closeId}-error` : undefined}
            aria-invalid={Boolean(errors.close)}
            id={closeId}
            type="time"
            {...register("close")}
          />
          <FieldError id={`${closeId}-error`} message={errors.close?.message} />
        </div>
      </div>
    </div>
  );
};

export default ClinicHoursFields;
