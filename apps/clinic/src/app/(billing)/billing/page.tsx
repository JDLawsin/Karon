import type { Metadata } from "next";

import { version as appVersion } from "../../../../package.json";
import BillingPage from "@/features/billing/billing-page";

export const metadata: Metadata = {
  title: "Trial and Pay Karon"
};

const BillingRoute = () => <BillingPage appVersion={appVersion} />;

export default BillingRoute;
