import { pageMetadata } from "@/lib/page-metadata";
import PricingPage from "@/features/pricing/pricing-page";
import { claimText } from "../../../content/claims";

const title = claimText("pricing-page-title");
const description = claimText("pricing-page-description");

export const dynamic = "force-static";
export const metadata = pageMetadata("/pricing", title, description);

const PricingRoute = () => <PricingPage />;

export default PricingRoute;
