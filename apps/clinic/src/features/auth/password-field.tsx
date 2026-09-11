"use client";

import { Input, Label, cn } from "@karon/design-system";
import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<typeof Input>, "type"> & {
  hint?: string;
  label?: string;
};

const PasswordField = ({
  id = "password",
  hint,
  label = "Password",
  className,
  "aria-describedby": ariaDescribedBy,
  ...inputProps
}: Props) => {
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy =
    [ariaDescribedBy, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        {...inputProps}
        aria-describedby={describedBy}
        className={cn(className)}
        id={id}
        type="password"
      />
      {hint ? (
        <p className="text-sm text-muted-foreground" id={hintId}>
          {hint}
        </p>
      ) : null}
    </div>
  );
};

export default PasswordField;
