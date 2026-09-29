import { pageMetadata } from "@/lib/page-metadata";
import SitePage from "@/features/site-page/site-page";

const title = "Talk with Karon";
const description = "Choose a founding clinic application or a product conversation.";

export const dynamic = "force-static";
export const metadata = pageMetadata("/demo", title, description);

const DemoPage = () => <SitePage description={description} pageId="demo" showCtas={false} title={title} />;

export default DemoPage;
