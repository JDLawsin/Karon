import { Button, Label } from "@karon/design-system";
import { useEffect, useMemo } from "react";

import { parseLogoFile } from "@/features/auth/onboarding-schemas";
import FieldError from "@/lib/forms/field-error";

type Props = {
  id: string;
  file: File | null;
  remoteUrl: string | null;
  error: string | null;
  onFileChange: (file: File | null, error: string | null) => void;
};

const ClinicLogoField = ({ id, file, remoteUrl, error, onFileChange }: Props) => {
  const localUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(
    () => () => {
      if (localUrl) {
        URL.revokeObjectURL(localUrl);
      }
    },
    [localUrl]
  );

  const preview = localUrl ?? remoteUrl;

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>
        Logo <span className="font-normal text-muted-foreground">(optional)</span>
      </Label>
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
        {preview ? (
          // next/image is for known remote hosts; object URLs are local previews.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt="Clinic logo preview"
            className="size-16 shrink-0 rounded-md border-(length:var(--surface-border-width)) border-border object-cover"
            height={64}
            src={preview}
            width={64}
          />
        ) : (
          <div
            aria-hidden
            className="size-16 shrink-0 rounded-md border-(length:var(--surface-border-width)) border-dashed border-border bg-muted"
          />
        )}
        <div className="flex min-w-0 flex-col gap-2">
          <input
            accept="image/png,image/jpeg,image/webp"
            className="min-h-(--control-min-height) w-full min-w-0 text-sm file:me-3 file:inline-flex file:min-h-(--control-min-height) file:cursor-pointer file:rounded-md file:border-0 file:bg-primary file:px-4 file:text-sm file:font-medium file:text-primary-foreground"
            id={id}
            onChange={(event) => {
              const next = event.target.files?.[0] ?? null;

              if (!next) {
                onFileChange(null, null);
                return;
              }

              const parsed = parseLogoFile(next);
              onFileChange(parsed.ok ? next : null, parsed.ok ? null : parsed.error);
              event.target.value = "";
            }}
            type="file"
          />
          {file || remoteUrl ? (
            <Button
              onClick={() => onFileChange(null, null)}
              type="button"
              variant="ghost"
            >
              Remove logo
            </Button>
          ) : null}
        </div>
      </div>
      <FieldError id={`${id}-error`} message={error ?? undefined} />
    </div>
  );
};

export default ClinicLogoField;
