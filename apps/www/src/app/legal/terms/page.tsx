import { pageMetadata } from "@/lib/page-metadata";
import SitePage from "@/features/site-page/site-page";

const title = "Terms";
const description = "The terms for using the Karon website.";

export const dynamic = "force-static";
export const metadata = pageMetadata("/legal/terms", title, description);

const TermsPage = () => <SitePage description={description} lastUpdated="2026-09-30" pageId="terms" showCtas={false} title={title} />;

export default TermsPage;
