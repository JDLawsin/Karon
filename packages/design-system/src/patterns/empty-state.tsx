import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  children?: ReactNode;
};

const EmptyState = ({ title, children }: EmptyStateProps) => (
  <section className="flex flex-col gap-3">
    <h1 className="text-2xl font-semibold">{title}</h1>
    {children ? (
      <p className="max-w-xl text-muted-foreground">{children}</p>
    ) : null}
  </section>
);

export { EmptyState };
export type { EmptyStateProps };
