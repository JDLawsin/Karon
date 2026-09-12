import { Button, Input, Label } from "@karon/design-system";
import { useState } from "react";
import type { FieldErrors } from "react-hook-form";

import {
  MAX_SERVICES,
  SUGGESTED_SERVICES,
  type ClinicOnboarding
} from "@/features/auth/onboarding-schemas";
import FieldError from "@/lib/forms/field-error";

type Props = {
  idPrefix: string;
  services: ClinicOnboarding["services"];
  onChange: (services: ClinicOnboarding["services"]) => void;
  errors: FieldErrors<ClinicOnboarding>;
};

const ClinicServicesFields = ({ idPrefix, services, onChange, errors }: Props) => {
  const [draft, setDraft] = useState("");
  const inputId = `${idPrefix}-service`;
  const atCap = services.length >= MAX_SERVICES;

  const addNamed = (name: string) => {
    const trimmed = name.trim();

    if (!trimmed || atCap) {
      return;
    }

    if (services.some((service) => service.name.toLowerCase() === trimmed.toLowerCase())) {
      setDraft("");
      return;
    }

    onChange([...services, { id: crypto.randomUUID(), name: trimmed }]);
    setDraft("");
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Add a few now. You can edit them later.
      </p>
      <div className="flex flex-wrap gap-2">
        {SUGGESTED_SERVICES.map((name) => {
          const added = services.some(
            (service) => service.name.toLowerCase() === name.toLowerCase()
          );
          return (
            <Button
              disabled={added || atCap}
              key={name}
              onClick={() => addNamed(name)}
              type="button"
              variant="outline"
            >
              {added ? name : `Add ${name}`}
            </Button>
          );
        })}
      </div>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Label htmlFor={inputId}>Service name</Label>
          <Input
            disabled={atCap}
            id={inputId}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addNamed(draft);
              }
            }}
            value={draft}
          />
        </div>
        <Button
          disabled={atCap || !draft.trim()}
          onClick={() => addNamed(draft)}
          type="button"
          variant="outline"
        >
          Add service
        </Button>
      </div>
      {services.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {services.map((service) => (
            <li
              className="flex min-w-0 items-center justify-between gap-2 rounded-md border-(length:var(--surface-border-width)) border-border bg-card px-3 py-2"
              key={service.id}
            >
              <span className="min-w-0 wrap-anywhere text-sm">{service.name}</span>
              <Button
                onClick={() =>
                  onChange(services.filter((row) => row.id !== service.id))
                }
                type="button"
                variant="ghost"
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No services yet.</p>
      )}
      <FieldError id={`${inputId}-error`} message={errors.services?.message} />
    </div>
  );
};

export default ClinicServicesFields;
