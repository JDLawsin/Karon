import type { ComponentProps } from "react";

import { cn } from "../lib/cn";

const Label = ({ className, ...props }: ComponentProps<"label">) => (
  <label
    className={cn("text-sm font-medium text-foreground", className)}
    {...props}
  />
);

export { Label };
