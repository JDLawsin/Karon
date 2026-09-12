import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  children?: ReactNode;
};

const EmptyState = ({ title, children }: EmptyStateProps) => (
  <section className="flex max-w-xl flex-col gap-2 rounded-lg border border-border bg-card px-4 py-6">
    <h2 className="text-lg font-semibold">{title}</h2>
    {children ? (
      <p className="text-muted-foreground">{children}</p>
    ) : null}
  </section>
);

export { EmptyState };
export type { EmptyStateProps };
