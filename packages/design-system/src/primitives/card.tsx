/* Hallmark · component: card · genre: modern-minimal · theme: Flat
 * states: default · hover · focus · active · disabled · loading · error · success
 * contrast: pass (card fill on paper)
 */
import type { ComponentProps } from "react";

import { cn } from "../lib/cn";

const Card = ({ className, ...props }: ComponentProps<"div">) => (
  <div
    className={cn(
      "flex min-w-0 flex-col gap-4 rounded-lg border-(length:var(--surface-border-width)) border-border bg-card p-4 text-card-foreground shadow-none",
      className
    )}
    data-slot="card"
    {...props}
  />
);

const CardHeader = ({ className, ...props }: ComponentProps<"div">) => (
  <div
    className={cn("flex min-w-0 flex-col gap-1", className)}
    data-slot="card-header"
    {...props}
  />
);

const CardTitle = ({ className, ...props }: ComponentProps<"div">) => (
  <div
    className={cn("text-lg font-semibold", className)}
    data-slot="card-title"
    {...props}
  />
);

const CardDescription = ({ className, ...props }: ComponentProps<"div">) => (
  <div
    className={cn("text-sm text-muted-foreground", className)}
    data-slot="card-description"
    {...props}
  />
);

const CardAction = ({ className, ...props }: ComponentProps<"div">) => (
  <div
    className={cn("shrink-0", className)}
    data-slot="card-action"
    {...props}
  />
);

const CardContent = ({ className, ...props }: ComponentProps<"div">) => (
  <div
    className={cn("flex min-w-0 flex-col gap-4", className)}
    data-slot="card-content"
    {...props}
  />
);

const CardFooter = ({ className, ...props }: ComponentProps<"div">) => (
  <div
    className={cn("flex flex-wrap items-center gap-2", className)}
    data-slot="card-footer"
    {...props}
  />
);

export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
};
