import { EmptyState, PageHeader } from "@karon/design-system";

const OwnerTodayStub = () => (
  <div className="flex min-w-0 flex-col gap-6">
    <PageHeader
      description="Paid and unpaid totals for this clinic day."
      title="Today's collections"
    />
    <EmptyState title="No totals yet">
      Owner totals will land here. Assistants cannot open this page.
    </EmptyState>
  </div>
);

export default OwnerTodayStub;
