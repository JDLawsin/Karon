"use client";

import {
  Button,
  cn,
  DrawerClose,
  DrawerFooter,
  Input,
  Label
} from "@karon/design-system";
import { useEffect } from "react";

import type { DentalServiceSuggestion } from "@/features/services/service-catalog";
import ServiceIconPicker from "@/features/services/service-icon-picker";
import ServiceNameField from "@/features/services/service-name-field";
import {
  currencyInputStep,
  priceMinorToMajor
} from "@/features/services/service-money";
import {
  serviceFormSchema,
  type ClinicServiceRow,
  type ServiceFormValues
} from "@/features/services/service-schemas";
import { isServiceIconKey } from "@/features/services/service-icons";
import { ServicePreviewCard } from "@/features/services/service-visual";
import FieldError from "@/lib/forms/field-error";
import { markHydrated, useClinicForm } from "@/lib/forms/use-clinic-form";

type Props = {
  currencyCode: string;
  readOnly?: boolean;
  service?: ClinicServiceRow | null;
  onSave: (values: ServiceFormValues) => Promise<void>;
};

const formatTimestamp = (iso: string) =>
  new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(iso));

const fieldClassName =
  "min-h-(--control-min-height) w-full min-w-0 rounded-md border-(length:var(--input-border-width)) border-input bg-(--input-fill) px-3 py-2 text-base text-foreground shadow-none outline-none transition-[color,background-color,border-color] duration-(--motion-duration) focus-visible:border-2 focus-visible:border-primary focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-2 aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive";

const ServiceForm = ({ currencyCode, readOnly = false, service, onSave }: Props) => {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useClinicForm(serviceFormSchema, {
    defaultValues: {
      name: "",
      description: "",
      icon: undefined,
      priceMajor: undefined,
      durationMinutes: undefined
    }
  });
  const name = watch("name");
  const description = watch("description");
  const icon = watch("icon");
  const iconKey = icon && isServiceIconKey(icon) ? icon : null;
  const priceCurrencyCode = service?.currency_code ?? currencyCode;
  const historicalCurrency =
    service?.currency_code !== null &&
    service?.currency_code !== undefined &&
    service.currency_code !== currencyCode;

  useEffect(() => {
    reset({
      name: service?.name ?? "",
      description: service?.description ?? "",
      icon: service?.icon && isServiceIconKey(service.icon) ? service.icon : undefined,
      priceMajor:
        service?.price_minor === null || service?.price_minor === undefined
          ? undefined
          : priceMinorToMajor(service.price_minor, priceCurrencyCode),
      durationMinutes: service?.duration_minutes ?? undefined
    });
  }, [priceCurrencyCode, reset, service]);

  const applySuggestion = (suggestion: DentalServiceSuggestion) => {
    setValue("name", suggestion.name, { shouldDirty: true, shouldValidate: true });
    setValue("description", suggestion.description, {
      shouldDirty: true,
      shouldValidate: true
    });
    setValue("icon", suggestion.icon, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      method="post"
      onSubmit={handleSubmit(onSave)}
      ref={markHydrated}
    >
      <div className="karon-scroll-region-y flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-4">
        <ServicePreviewCard
          description={description}
          footer={
            service ? (
              <dl className="grid min-w-0 grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Created</dt>
                  <dd className="tabular-nums">{formatTimestamp(service.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Updated</dt>
                  <dd className="tabular-nums">{formatTimestamp(service.updated_at)}</dd>
                </div>
              </dl>
            ) : null
          }
          iconKey={iconKey}
          name={name}
        />

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="service-name">Name</Label>
            <ServiceNameField
              describedBy={errors.name ? "service-name-error" : undefined}
              disabled={readOnly || isSubmitting}
              id="service-name"
              invalid={Boolean(errors.name)}
              key={service?.id ?? "create"}
              onChange={(next) =>
                setValue("name", next, { shouldDirty: true, shouldValidate: true })
              }
              onSelectSuggestion={applySuggestion}
              value={name}
            />
            <p className="text-xs text-muted-foreground">
              Pick a common service to fill description and icon, or type a custom name.
            </p>
            <FieldError id="service-name-error" message={errors.name?.message} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="service-description">Description</Label>
            <textarea
              aria-describedby={
                errors.description ? "service-description-error" : undefined
              }
              aria-invalid={Boolean(errors.description)}
              className={cn(fieldClassName, "min-h-24 resize-y")}
              disabled={readOnly || isSubmitting}
              id="service-description"
              placeholder="Short note for staff and patients (optional)"
              rows={3}
              {...register("description")}
            />
            <FieldError
              id="service-description-error"
              message={errors.description?.message}
            />
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-2">
              <Label htmlFor="service-price">Price ({priceCurrencyCode})</Label>
              <Input
                aria-describedby={errors.priceMajor ? "service-price-error" : undefined}
                aria-invalid={Boolean(errors.priceMajor)}
                disabled={readOnly || isSubmitting}
                id="service-price"
                inputMode="decimal"
                min={0}
                readOnly={historicalCurrency}
                step={currencyInputStep(priceCurrencyCode)}
                type="number"
                {...register("priceMajor", { valueAsNumber: true })}
              />
              <FieldError id="service-price-error" message={errors.priceMajor?.message} />
              {historicalCurrency ? (
                <p className="text-sm text-muted-foreground">
                  This service is priced in {priceCurrencyCode}. Change the clinic
                  currency back to {priceCurrencyCode} before editing its price.
                </p>
              ) : null}
            </div>

            <div className="flex min-w-0 flex-col gap-2">
              <Label htmlFor="service-duration">Default duration (minutes)</Label>
              <Input
                aria-describedby={
                  errors.durationMinutes ? "service-duration-error" : undefined
                }
                aria-invalid={Boolean(errors.durationMinutes)}
                disabled={readOnly || isSubmitting}
                id="service-duration"
                inputMode="numeric"
                max={1440}
                min={1}
                step={1}
                type="number"
                {...register("durationMinutes", { valueAsNumber: true })}
              />
              <FieldError
                id="service-duration-error"
                message={errors.durationMinutes?.message}
              />
            </div>
          </div>

          {readOnly ? (
            <p className="text-sm text-muted-foreground">
              Only the clinic owner can update service details, prices, and duration.
            </p>
          ) : null}

          <div className="flex flex-col gap-2">
            <Label>Icon</Label>
            <ServiceIconPicker
              disabled={readOnly || isSubmitting}
              onChange={(next) =>
                setValue("icon", next, { shouldDirty: true, shouldValidate: true })
              }
              value={iconKey ?? undefined}
            />
            <FieldError id="service-icon-error" message={errors.icon?.message} />
          </div>
        </div>
      </div>
      <DrawerFooter>
        {readOnly ? null : (
          <Button disabled={isSubmitting} type="submit">
            {service ? "Save changes" : "Add service"}
          </Button>
        )}
        <DrawerClose render={<Button type="button" variant="outline" />}>
          {readOnly ? "Close" : "Cancel"}
        </DrawerClose>
      </DrawerFooter>
    </form>
  );
};

export default ServiceForm;
