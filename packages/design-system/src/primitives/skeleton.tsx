/* Hallmark · component: skeleton · genre: modern-minimal · theme: Flat
 * states: default · loading
 * contrast: pass (muted fill on card)
 */
import type { ComponentProps } from "react";

import { cn } from "../lib/cn";

const Skeleton = ({ className, ...props }: ComponentProps<"div">) => (
  <div
    className={cn("animate-pulse rounded-md bg-muted", className)}
    data-slot="skeleton"
    {...props}
  />
);

export { Skeleton };
