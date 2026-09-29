import type { Metadata } from "next";

import { version as appVersion } from "../../../../package.json";
import BillingPage from "@/features/billing/billing-page";

export const metadata: Metadata = {
  title: "Trial and Pay Karon"
};

type Props = {
  searchParams: Promise<{ checkout?: string | string[] }>;
};

const BillingRoute = async ({ searchParams }: Props) => {
  const checkout = (await searchParams).checkout;
  const checkoutNotice =
    checkout === "returned" || checkout === "cancelled" ? checkout : null;

  return (
    <BillingPage appVersion={appVersion} checkoutNotice={checkoutNotice} />
  );
};

export default BillingRoute;
