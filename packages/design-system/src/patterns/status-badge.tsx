/* Hallmark · component: badge · genre: modern-minimal · theme: Flat
 * states: default · hover · focus · active · disabled · loading · error · success
 * contrast: pass (46–50)
 */
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "../lib/cn";

const statusBadgeVariants = cva(
  "inline-flex max-w-full items-center rounded-sm px-2 py-0.5 text-xs font-medium wrap-anywhere",
  {
    variants: {
      tone: {
        neutral: "bg-muted text-foreground",
        info: "bg-info-subtle text-info",
        primary: "bg-primary text-primary-foreground",
        warning: "bg-warning-subtle text-warning-foreground",
        success: "bg-success-subtle text-success",
        danger: "bg-destructive-subtle text-destructive"
      }
    },
    defaultVariants: {
      tone: "neutral"
    }
  }
);

type StatusBadgeProps = ComponentProps<"span"> &
  VariantProps<typeof statusBadgeVariants> & {
    children: string;
  };

const StatusBadge = ({
  className,
  tone,
  children,
  ...props
}: StatusBadgeProps) => (
  <span className={cn(statusBadgeVariants({ tone }), className)} {...props}>
    {children}
  </span>
);

export { StatusBadge, statusBadgeVariants };
export type { StatusBadgeProps };
