import { pageMetadata } from "@/lib/page-metadata";
import SitePage from "@/features/site-page/site-page";

const title = "Security";
const description = "Read how Karon approaches product security and responsible disclosure.";

export const dynamic = "force-static";
export const metadata = pageMetadata("/security", title, description);

const SecurityPage = () => <SitePage description={description} pageId="security" title={title} />;

export default SecurityPage;
