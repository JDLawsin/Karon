import { CircleAlert, CircleCheck } from "lucide-react";

import { cn } from "../lib/cn";

type ToastVariant = "success" | "error";

type ToastMessageProps = {
  variant: ToastVariant;
  title: string;
  description?: string;
  className?: string;
};

const toastVariantStyles = {
  error: {
    icon: "text-destructive",
    root: "bg-destructive-subtle",
    title: "text-destructive"
  },
  success: {
    icon: "text-success",
    root: "bg-success-subtle",
    title: "text-success"
  }
} as const;

const toastIcons = {
  error: CircleAlert,
  success: CircleCheck
} as const;

const ToastMessage = ({
  variant,
  title,
  description,
  className
}: ToastMessageProps) => {
  const styles = toastVariantStyles[variant];
  const Icon = toastIcons[variant];

  return (
    <div
      className={cn(
        "flex w-(--toast-width) min-w-0 items-start gap-3 rounded-md border-(length:var(--surface-border-width)) border-border p-3 shadow-none sm:p-4",
        styles.root,
        className
      )}
      role={variant === "error" ? "alert" : "status"}
    >
      <Icon aria-hidden className={cn("mt-0.5 size-5 shrink-0", styles.icon)} />
      <div className="flex min-w-0 flex-col gap-1">
        <p className={cn("text-sm font-medium wrap-anywhere", styles.title)}>
          {title}
        </p>
        {description ? (
          <p className="text-sm text-muted-foreground wrap-anywhere">{description}</p>
        ) : null}
      </div>
    </div>
  );
};

export default ToastMessage;
export type { ToastMessageProps, ToastVariant };
