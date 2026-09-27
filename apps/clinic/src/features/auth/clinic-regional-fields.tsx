import { Input, Label } from "@karon/design-system";
import type { FieldErrors, UseFormRegister } from "react-hook-form";

import type { ClinicDetails } from "@/features/auth/onboarding-schemas";
import { DEFAULT_CLINIC_REGIONAL_SETTINGS } from "@/lib/clinic/regional-settings";
import FieldError from "@/lib/forms/field-error";

const CURRENCY_CODES = [
  "PHP",
  ...Intl.supportedValuesOf("currency").filter((code) => code !== "PHP")
];

const TIME_ZONES = [
  DEFAULT_CLINIC_REGIONAL_SETTINGS.timezone,
  "UTC",
  ...Intl.supportedValuesOf("timeZone").filter(
    (zone) =>
      zone !== DEFAULT_CLINIC_REGIONAL_SETTINGS.timezone && zone !== "UTC"
  )
];

const selectClassName =
  "h-[var(--control-min-height)] min-h-[var(--control-min-height)] w-full min-w-0 rounded-md border-(length:var(--input-border-width)) border-input bg-(--input-fill) px-3 text-base text-foreground shadow-none outline-none transition-[color,background-color,border-color] duration-(--motion-duration) focus-visible:border-2 focus-visible:border-primary focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-2 aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive";

type Props = {
  idPrefix: string;
  register: UseFormRegister<ClinicDetails>;
  errors: FieldErrors<ClinicDetails>;
};

const ClinicRegionalFields = ({ idPrefix, register, errors }: Props) => {
  const currencyId = `${idPrefix}-currency`;
  const localeId = `${idPrefix}-locale`;
  const timezoneId = `${idPrefix}-timezone`;

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-2">
        <Label htmlFor={currencyId}>Currency (ISO 4217)</Label>
        <select
          aria-describedby={errors.currencyCode ? `${currencyId}-error` : undefined}
          aria-invalid={Boolean(errors.currencyCode)}
          className={selectClassName}
          id={currencyId}
          {...register("currencyCode")}
        >
          {CURRENCY_CODES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
        <FieldError
          id={`${currencyId}-error`}
          message={errors.currencyCode?.message}
        />
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <Label htmlFor={localeId}>Locale</Label>
        <Input
          aria-describedby={errors.locale ? `${localeId}-error` : `${localeId}-hint`}
          aria-invalid={Boolean(errors.locale)}
          autoComplete="off"
          id={localeId}
          placeholder="en-PH"
          {...register("locale")}
        />
        <p className="text-sm text-muted-foreground" id={`${localeId}-hint`}>
          Use a BCP 47 language tag, such as en-PH or en-SG.
        </p>
        <FieldError id={`${localeId}-error`} message={errors.locale?.message} />
      </div>
      <div className="flex min-w-0 flex-col gap-2 sm:col-span-2">
        <Label htmlFor={timezoneId}>Time zone (IANA)</Label>
        <select
          aria-describedby={errors.timezone ? `${timezoneId}-error` : undefined}
          aria-invalid={Boolean(errors.timezone)}
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
      <p className="text-sm text-muted-foreground sm:col-span-2">
        One active currency per clinic. Changing it does not convert historical amounts.
      </p>
    </div>
  );
};

export default ClinicRegionalFields;
