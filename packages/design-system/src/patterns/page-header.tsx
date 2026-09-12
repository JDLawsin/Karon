/* Hallmark · component: page-header · genre: modern-minimal · theme: Chair Azure
 * states: default · hover · focus · active · disabled · loading · error · success
 * contrast: pass (title on paper)
 */
import type { ReactNode } from "react";

import { cn } from "../lib/cn";

type PageHeaderProps = {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
};

const PageHeader = ({
  title,
  description,
  children,
  className
}: PageHeaderProps) => (
  <header
    className={cn(
      "flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
      className
    )}
  >
    <div className="min-w-0">
      <h1 className="wrap-anywhere text-2xl font-semibold tracking-tight">
        {title}
      </h1>
      {description ? (
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
    {children ? (
      <div className="flex shrink-0 flex-wrap gap-2">{children}</div>
    ) : null}
  </header>
);

export { PageHeader };
export type { PageHeaderProps };
