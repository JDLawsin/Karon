import type { ComponentProps } from "react";

import { cn } from "../lib/cn";

const Input = ({ className, type = "text", ...props }: ComponentProps<"input">) => (
  <input
    type={type}
    className={cn(
      "h-[var(--control-min-height)] min-h-[var(--control-min-height)] w-full min-w-0 rounded-md border border-input bg-background px-3 text-base text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive",
      className
    )}
    {...props}
  />
);

export { Input };
