import { pageMetadata } from "@/lib/page-metadata";
import SitePage from "@/features/site-page/site-page";

const title = "Karon for small dental clinics";
const description = "A clearer way to run the day with your clinic team.";

export const dynamic = "force-static";
export const metadata = pageMetadata("/", title, description);

const HomePage = () => <SitePage description={description} pageId="home" title={title} />;

export default HomePage;
