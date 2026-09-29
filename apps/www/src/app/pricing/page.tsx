import { pageMetadata } from "@/lib/page-metadata";
import SitePage from "@/features/site-page/site-page";

const title = "Pricing";
const description = "Founding clinic pricing is discussed during your application.";

export const dynamic = "force-static";
export const metadata = pageMetadata("/pricing", title, description);

const PricingPage = () => <SitePage description={description} pageId="pricing" title={title} />;

export default PricingPage;
