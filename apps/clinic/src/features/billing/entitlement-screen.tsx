import {
  Alert,
  Card,
  CardContent,
  CardHeader,
  PageHeader,
  StatusBadge
} from "@karon/design-system";

import type { ClinicRole } from "@/features/auth/resolve-auth-destination";
import type { Entitlement } from "@/features/billing/entitlement";

type Props = {
  entitlement: Entitlement | null;
  role: ClinicRole;
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-PH", {
    dateStyle: "long",
    timeZone: "Asia/Manila"
  }).format(new Date(value));

const daysLabel = (days: number | null) => {
  if (days === null) {
    return "Access active";
  }

  return `${days} ${days === 1 ? "day" : "days"} left`;
};

const statusPresentation = (entitlement: Entitlement) => {
  if (entitlement.status === "trialing") {
    return {
      label: "Trial",
      tone: "info" as const,
      heading: daysLabel(entitlement.daysRemaining),
      description: "Your trial is measured by Karon's server clock."
    };
  }

  if (entitlement.status === "active" && entitlement.source === "manual") {
    return {
      label: "Design partner access",
      tone: "info" as const,
      heading: "Your clinic has access",
      description: "No public checkout is needed for this access period."
    };
  }

  if (entitlement.status === "active") {
    return {
      label: "Active",
      tone: "success" as const,
      heading: "Your subscription is active",
      description: "Karon is available to your clinic."
    };
  }

  if (entitlement.status === "past_due") {
    return {
      label: "Past due",
      tone: "warning" as const,
      heading: `${daysLabel(entitlement.daysRemaining)} in grace`,
      description: "Your clinic can keep working during this grace period."
    };
  }

  return {
    label: "Expired",
    tone: "danger" as const,
    heading: "Your clinic access is paused",
    description: "New server writes and sync are paused until access is restored."
  };
};

const EntitlementScreen = ({ entitlement, role }: Props) => {
  if (!entitlement) {
    return (
      <div className="mx-auto flex w-full max-w-2xl min-w-0 flex-col gap-6">
        <PageHeader
          description="Review your clinic's trial or subscription access."
          title="Trial and Pay Karon"
        />
        <Alert
          title="Karon could not verify clinic access. Reconnect and try again."
          variant="danger"
        />
      </div>
    );
  }

  const presentation = statusPresentation(entitlement);
  const isExpired = entitlement.status === "expired";

  return (
    <div className="mx-auto flex w-full max-w-2xl min-w-0 flex-col gap-6">
      <PageHeader
        description="Review your clinic's trial or subscription access."
        title="Trial and Pay Karon"
      />

      <Card className="gap-6 p-4 sm:p-6">
        <CardHeader className="gap-3">
          <StatusBadge className="self-start" tone={presentation.tone}>
            {presentation.label}
          </StatusBadge>
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="wrap-anywhere text-xl font-semibold">
              {presentation.heading}
            </h2>
            <p className="text-sm text-muted-foreground">
              {presentation.description}
            </p>
          </div>
        </CardHeader>

        <CardContent>
          <dl className="grid min-w-0 grid-cols-1 gap-4 rounded-lg bg-muted p-4 sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="text-sm text-muted-foreground">Access started</dt>
              <dd className="mt-1 wrap-anywhere font-medium tabular-nums">
                {formatDate(entitlement.startsAt)}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-sm text-muted-foreground">Access through</dt>
              <dd className="mt-1 wrap-anywhere font-medium tabular-nums">
                {entitlement.endsAt ? formatDate(entitlement.endsAt) : "Ongoing"}
              </dd>
            </div>
          </dl>

          {isExpired ? (
            <Alert
              title={
                role === "owner"
                  ? "Contact Karon to restore access."
                  : "Ask the doctor to continue the subscription."
              }
              variant="danger"
            >
              Pending work stays on this device. Karon does not erase the local
              outbox when access is paused.
            </Alert>
          ) : entitlement.source === "manual" ? (
            <Alert title="Design partner access is active." variant="info">
              Karon will continue without public checkout through the date shown.
            </Alert>
          ) : (
            <Alert title="Your local work remains protected." variant="info">
              If access changes, pending work stays on this device until it can sync.
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EntitlementScreen;
