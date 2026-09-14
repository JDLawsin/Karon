"use client";

import { Button, cn } from "@karon/design-system";

import {
  SERVICE_ICON_OPTIONS,
  serviceIconKeys,
  serviceIconLabel,
  type ServiceIconKey
} from "@/features/services/service-icons";

type Props = {
  value?: ServiceIconKey;
  onChange: (value: ServiceIconKey | undefined) => void;
  disabled?: boolean;
};

const ServiceIconPicker = ({ value, onChange, disabled = false }: Props) => (
  <div className="flex flex-col gap-3">
    <div className="rounded-lg border-(length:var(--surface-border-width)) border-border bg-muted/30 p-3">
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
        {serviceIconKeys.map((key) => {
          const Icon = SERVICE_ICON_OPTIONS[key];
          const selected = value === key;

          return (
            <Button
              aria-label={serviceIconLabel(key)}
              aria-pressed={selected}
              className={cn(
                "size-11 min-h-11 min-w-11 px-0 hover:scale-100",
                selected
                  ? "border-primary bg-primary text-primary-foreground ring-2 ring-ring ring-offset-2 ring-offset-background"
                  : "border-border bg-background text-foreground hover:bg-muted"
              )}
              disabled={disabled}
              key={key}
              onClick={() => onChange(selected ? undefined : key)}
              type="button"
              variant="outline"
            >
              <Icon aria-hidden className="size-5" />
            </Button>
          );
        })}
      </div>
    </div>
    {value ? (
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-muted-foreground">
          Selected: {serviceIconLabel(value)}
        </p>
        <Button
          disabled={disabled}
          onClick={() => onChange(undefined)}
          type="button"
          variant="ghost"
        >
          Clear icon
        </Button>
      </div>
    ) : (
      <p className="text-sm text-muted-foreground">
        Optional. Pick an icon patients will recognize on booking.
      </p>
    )}
  </div>
);

export default ServiceIconPicker;
