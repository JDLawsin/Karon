import { cn } from "@karon/design-system";
import { createElement, type ReactNode } from "react";

import {
  ToothIcon,
  serviceIconOf,
  type ServiceIconKey
} from "@/features/services/service-icons";

type IconBadgeProps = {
  iconKey?: ServiceIconKey | null;
  className?: string;
};

const ServiceIconBadge = ({ iconKey, className }: IconBadgeProps) => {
  const Icon = serviceIconOf(iconKey ?? null);

  return (
    <div
      aria-hidden
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary [&_svg]:size-5",
        !Icon && "bg-muted text-muted-foreground",
        className
      )}
    >
      {Icon ? createElement(Icon, { "aria-hidden": true }) : <ToothIcon aria-hidden />}
    </div>
  );
};

type PreviewProps = {
  name: string;
  description?: string;
  iconKey?: ServiceIconKey | null;
  footer?: ReactNode;
};

const ServicePreviewCard = ({
  name,
  description,
  iconKey,
  footer
}: PreviewProps) => {
  const trimmedName = name.trim();
  const trimmedDescription = description?.trim();

  return (
    <div className="rounded-lg border-(length:var(--surface-border-width)) border-border bg-muted/40 p-4">
      <p className="text-xs font-medium text-muted-foreground">Preview</p>
      <div className="mt-3 flex min-w-0 items-start gap-3">
        <ServiceIconBadge iconKey={iconKey} />
        <div className="min-w-0 flex-1">
          <p className="wrap-anywhere font-medium text-foreground">
            {trimmedName || "Service name"}
          </p>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {trimmedDescription || "Description shows on booking and staff screens."}
          </p>
        </div>
      </div>
      {footer ? <div className="mt-3 border-t border-border pt-3">{footer}</div> : null}
    </div>
  );
};

export { ServiceIconBadge, ServicePreviewCard };
