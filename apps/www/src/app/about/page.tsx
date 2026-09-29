import { pageMetadata } from "@/lib/page-metadata";
import SitePage from "@/features/site-page/site-page";
import Claim from "@/features/claim/claim";
import { claimText } from "../../../content/claims";

const title = "About Karon";

export const dynamic = "force-static";
export const metadata = pageMetadata("/about", title, claimText("entity-sentence"));

const AboutPage = () => <SitePage description={<Claim id="entity-sentence" />} pageId="about" title={title} />;

export default AboutPage;
