import { pageMetadata } from "@/lib/page-metadata";
import SitePage from "@/features/site-page/site-page";

const title = "Cookie notice";
const description = "How the Karon website uses browser storage and cookies.";

export const dynamic = "force-static";
export const metadata = pageMetadata("/legal/cookies", title, description);

const CookiesPage = () => <SitePage description={description} lastUpdated="2026-09-30" pageId="cookies" showCtas={false} title={title} />;

export default CookiesPage;
