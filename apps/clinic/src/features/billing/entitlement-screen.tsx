import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  PageHeader,
  StatusBadge
} from "@karon/design-system";

import type { ClinicRole } from "@/features/auth/resolve-auth-destination";
import type { Entitlement } from "@/features/billing/entitlement";
import type { PublicBillingConfig } from "@/lib/billing/billing-config";

type Props = {
  entitlement: Entitlement | null;
  role: ClinicRole;
  billingConfig?: PublicBillingConfig;
  checkoutNotice?: "returned" | "cancelled" | null;
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

const formatMoney = (amountMinor: number, currency: string) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency
  }).format(amountMinor / 100);

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

const EntitlementScreen = ({
  entitlement,
  role,
  billingConfig = { checkoutEnabled: false },
  checkoutNotice = null
}: Props) => {
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
  const hasManualAccess = entitlement.source === "manual" && entitlement.hasAccess;

  return (
    <div className="mx-auto flex w-full max-w-2xl min-w-0 flex-col gap-6">
      <PageHeader
        description="Review your clinic's trial or subscription access."
        title="Trial and Pay Karon"
      />

      {checkoutNotice === "returned" ? (
        <Alert title="Payment confirmation is processing." variant="info">
          Access changes only after Karon verifies PayMongo&apos;s signed webhook.
          Refresh shortly if the status has not updated yet.
        </Alert>
      ) : checkoutNotice === "cancelled" ? (
        <Alert title="Checkout was closed." variant="info">
          No payment was confirmed. Your current access status has not changed.
        </Alert>
      ) : null}

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
          ) : hasManualAccess ? (
            <Alert title="Design partner access is active." variant="info">
              Karon will continue without public checkout through the date shown.
            </Alert>
          ) : (
            <Alert title="Your local work remains protected." variant="info">
              If access changes, pending work stays on this device until it can sync.
            </Alert>
          )}

          {role === "owner" &&
          !hasManualAccess &&
          billingConfig.checkoutEnabled ? (
            <form
              action="/api/billing/checkout"
              className="mt-6 flex min-w-0 flex-col gap-4"
              method="post"
            >
              <fieldset className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <legend className="col-span-full text-sm font-medium">
                  {billingConfig.skuName}
                </legend>
                {billingConfig.prices.map((price, index) => (
                  <label
                    className="flex min-h-[var(--control-min-height)] min-w-0 cursor-pointer items-center gap-3 rounded-md border-(length:var(--surface-border-width)) border-border p-4 has-[:checked]:border-primary has-[:checked]:bg-info-subtle"
                    key={price.interval}
                  >
                    <input
                      defaultChecked={index === 0}
                      name="interval"
                      type="radio"
                      value={price.interval}
                    />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-medium capitalize">{price.interval}</span>
                      <span className="tabular-nums text-sm text-muted-foreground">
                        {formatMoney(price.amountMinor, price.currency)}
                      </span>
                    </span>
                  </label>
                ))}
              </fieldset>
              <Button className="w-full sm:w-auto sm:self-start" size="lg" type="submit">
                Continue to secure checkout
              </Button>
              <p className="text-xs text-muted-foreground">
                PayMongo handles payment details. Karon restores access only after a
                verified payment webhook.
              </p>
            </form>
          ) : role === "owner" && !hasManualAccess ? (
            <Alert
              className="mt-6"
              title="Public checkout is not open yet."
              variant="info"
            >
              Design partners can be entitled manually without PayMongo.
            </Alert>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};

export default EntitlementScreen;
