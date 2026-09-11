/* Hallmark · component: alert · genre: modern-minimal · design-system: DESIGN.md */
import { cva, type VariantProps } from "class-variance-authority";
import { CircleAlert, CircleCheck, Info } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "../lib/cn";

const alertVariants = cva(
  "flex min-w-0 items-start gap-3 rounded-md border border-border p-3 sm:p-4",
  {
    variants: {
      variant: {
        danger: "bg-destructive-subtle",
        info: "bg-info-subtle",
        success: "bg-success-subtle"
      }
    },
    defaultVariants: {
      variant: "info"
    }
  }
);

const iconClassName = {
  danger: "text-destructive",
  info: "text-info",
  success: "text-success"
} as const;

const titleClassName = {
  danger: "text-destructive",
  info: "text-info",
  success: "text-success"
} as const;

const icons = {
  danger: CircleAlert,
  info: Info,
  success: CircleCheck
} as const;

type AlertProps = Omit<ComponentProps<"div">, "title" | "children"> &
  VariantProps<typeof alertVariants> & {
    title: string;
    children?: ReactNode;
  };

const Alert = ({
  className,
  variant = "info",
  title,
  children,
  ...props
}: AlertProps) => {
  const resolved = variant ?? "info";
  const Icon = icons[resolved];

  return (
    <div
      className={cn(alertVariants({ variant: resolved }), className)}
      role={resolved === "danger" ? "alert" : "status"}
      {...props}
    >
      <Icon
        aria-hidden
        className={cn("mt-0.5 size-5 shrink-0", iconClassName[resolved])}
      />
      <div className="flex min-w-0 flex-col gap-1">
        <p className={cn("text-sm font-medium", titleClassName[resolved])}>
          {title}
        </p>
        {children ? (
          <div className="text-sm text-muted-foreground">{children}</div>
        ) : null}
      </div>
    </div>
  );
};

export { Alert, alertVariants };
export type { AlertProps };
