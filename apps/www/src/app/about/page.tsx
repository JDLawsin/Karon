import { pageMetadata } from "@/lib/page-metadata";
import AboutPage from "@/features/about/about-page";
import { claimText } from "../../../content/claims";

const title = "About Karon";

export const dynamic = "force-static";
export const metadata = pageMetadata("/about", title, claimText("entity-sentence"));

const AboutRoute = () => <AboutPage />;

export default AboutRoute;
