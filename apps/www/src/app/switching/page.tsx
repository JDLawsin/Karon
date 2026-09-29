import { pageMetadata } from "@/lib/page-metadata";
import SitePage from "@/features/site-page/site-page";

const title = "Switching to Karon";
const description = "Plan a careful move with your clinic team.";

export const dynamic = "force-static";
export const metadata = pageMetadata("/switching", title, description);

const SwitchingPage = () => <SitePage description={description} pageId="switching" title={title} />;

export default SwitchingPage;
