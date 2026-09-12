import { Input, Label } from "@karon/design-system";
import type { FieldErrors, UseFormRegister } from "react-hook-form";

import type { ClinicOnboarding } from "@/features/auth/onboarding-schemas";
import FieldError from "@/lib/forms/field-error";

type Props = {
  idPrefix: string;
  register: UseFormRegister<ClinicOnboarding>;
  errors: FieldErrors<ClinicOnboarding>;
};

const ClinicIdentityFields = ({ idPrefix, register, errors }: Props) => {
  const nameId = `${idPrefix}-name`;
  const phoneId = `${idPrefix}-phone`;
  const emailId = `${idPrefix}-email`;
  const line1Id = `${idPrefix}-line1`;
  const barangayId = `${idPrefix}-barangay`;
  const cityId = `${idPrefix}-city`;
  const provinceId = `${idPrefix}-province`;
  const postalId = `${idPrefix}-postal`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={nameId}>Clinic name</Label>
        <Input
          aria-describedby={errors.name ? `${nameId}-error` : undefined}
          aria-invalid={Boolean(errors.name)}
          autoComplete="organization"
          id={nameId}
          {...register("name")}
        />
        <FieldError id={`${nameId}-error`} message={errors.name?.message} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={phoneId}>Clinic phone</Label>
        <Input
          aria-describedby={errors.phone ? `${phoneId}-error` : undefined}
          aria-invalid={Boolean(errors.phone)}
          autoComplete="tel"
          id={phoneId}
          inputMode="tel"
          type="tel"
          {...register("phone")}
        />
        <FieldError id={`${phoneId}-error`} message={errors.phone?.message} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={emailId}>Clinic email</Label>
        <Input
          aria-describedby={errors.email ? `${emailId}-error` : undefined}
          aria-invalid={Boolean(errors.email)}
          autoComplete="email"
          id={emailId}
          inputMode="email"
          type="email"
          {...register("email")}
        />
        <FieldError id={`${emailId}-error`} message={errors.email?.message} />
      </div>
      <fieldset className="flex min-w-0 flex-col gap-4">
        <legend className="text-sm font-medium text-foreground">
          Address <span className="font-normal text-muted-foreground">(optional)</span>
        </legend>
        <div className="flex flex-col gap-2">
          <Label htmlFor={line1Id}>Street / building</Label>
          <Input
            aria-describedby={errors.line1 ? `${line1Id}-error` : undefined}
            aria-invalid={Boolean(errors.line1)}
            autoComplete="address-line1"
            id={line1Id}
            {...register("line1")}
          />
          <FieldError id={`${line1Id}-error`} message={errors.line1?.message} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={barangayId}>Barangay</Label>
          <Input
            aria-describedby={errors.barangay ? `${barangayId}-error` : undefined}
            aria-invalid={Boolean(errors.barangay)}
            id={barangayId}
            {...register("barangay")}
          />
          <FieldError id={`${barangayId}-error`} message={errors.barangay?.message} />
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-2">
            <Label htmlFor={cityId}>City / municipality</Label>
            <Input
              aria-describedby={errors.city ? `${cityId}-error` : undefined}
              aria-invalid={Boolean(errors.city)}
              autoComplete="address-level2"
              id={cityId}
              {...register("city")}
            />
            <FieldError id={`${cityId}-error`} message={errors.city?.message} />
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <Label htmlFor={provinceId}>Province</Label>
            <Input
              aria-describedby={errors.province ? `${provinceId}-error` : undefined}
              aria-invalid={Boolean(errors.province)}
              autoComplete="address-level1"
              id={provinceId}
              {...register("province")}
            />
            <FieldError id={`${provinceId}-error`} message={errors.province?.message} />
          </div>
        </div>
        <div className="flex max-w-48 flex-col gap-2">
          <Label htmlFor={postalId}>Postal code</Label>
          <Input
            aria-describedby={errors.postalCode ? `${postalId}-error` : undefined}
            aria-invalid={Boolean(errors.postalCode)}
            autoComplete="postal-code"
            id={postalId}
            inputMode="numeric"
            {...register("postalCode")}
          />
          <FieldError id={`${postalId}-error`} message={errors.postalCode?.message} />
        </div>
      </fieldset>
    </div>
  );
};

export default ClinicIdentityFields;
