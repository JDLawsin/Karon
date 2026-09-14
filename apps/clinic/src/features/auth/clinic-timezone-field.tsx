import { Label } from "@karon/design-system";
import type { FieldErrors, UseFormRegister } from "react-hook-form";

import type { ClinicDetails } from "@/features/auth/onboarding-schemas";
import FieldError from "@/lib/forms/field-error";

const TIME_ZONES =
  typeof Intl !== "undefined" && "supportedValuesOf" in Intl
    ? [
        "Asia/Manila",
        ...Intl.supportedValuesOf("timeZone").filter((zone) => zone !== "Asia/Manila")
      ]
    : ["Asia/Manila", "UTC"];

const selectClassName =
  "h-[var(--control-min-height)] min-h-[var(--control-min-height)] w-full min-w-0 rounded-md border-(length:var(--input-border-width)) border-input bg-(--input-fill) px-3 text-base text-foreground shadow-none outline-none transition-[color,background-color,border-color] duration-(--motion-duration) focus-visible:border-2 focus-visible:border-primary focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-2 aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive";

type Props = {
  idPrefix: string;
  register: UseFormRegister<ClinicDetails>;
  errors: FieldErrors<ClinicDetails>;
  hideLabel?: boolean;
};

const ClinicTimezoneField = ({
  idPrefix,
  register,
  errors,
  hideLabel = false
}: Props) => {
  const timezoneId = `${idPrefix}-timezone`;

  return (
    <div className="flex flex-col gap-2">
      {hideLabel ? null : <Label htmlFor={timezoneId}>Timezone</Label>}
      <select
        aria-describedby={errors.timezone ? `${timezoneId}-error` : undefined}
        aria-invalid={Boolean(errors.timezone)}
        aria-label={hideLabel ? "Timezone" : undefined}
        className={selectClassName}
        id={timezoneId}
        {...register("timezone")}
      >
        {TIME_ZONES.map((zone) => (
          <option key={zone} value={zone}>
            {zone.replaceAll("_", " ")}
          </option>
        ))}
      </select>
      <FieldError id={`${timezoneId}-error`} message={errors.timezone?.message} />
    </div>
  );
};

export default ClinicTimezoneField;
