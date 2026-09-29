import { pageMetadata } from "@/lib/page-metadata";
import SitePage from "@/features/site-page/site-page";

const title = "Privacy notice";
const description = "The Karon website privacy notice.";

export const dynamic = "force-static";
export const metadata = pageMetadata("/legal/privacy", title, description);

const PrivacyPage = () => <SitePage description={description} lastUpdated="2026-09-30" pageId="privacy" showCtas={false} title={title} />;

export default PrivacyPage;
