import { pageMetadata } from "@/lib/page-metadata";
import SitePage from "@/features/site-page/site-page";

const title = "What works today";
const description = "See the Karon capabilities available to clinics today.";

export const dynamic = "force-static";
export const metadata = pageMetadata("/features", title, description);

const FeaturesPage = () => <SitePage description={description} pageId="features" title={title} />;

export default FeaturesPage;
