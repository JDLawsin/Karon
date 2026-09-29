import { pageMetadata } from "@/lib/page-metadata";
import SitePage from "@/features/site-page/site-page";

const title = "About Karon";
const description = "Karon is being built with small dental clinics, starting in the Philippines.";

export const dynamic = "force-static";
export const metadata = pageMetadata("/about", title, description);

const AboutPage = () => <SitePage description={description} pageId="about" title={title} />;

export default AboutPage;
