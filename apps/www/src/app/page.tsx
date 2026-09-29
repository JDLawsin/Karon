import { pageMetadata } from "@/lib/page-metadata";
import Claim from "@/features/claim/claim";
import SitePage from "@/features/site-page/site-page";
import { claimText } from "../../content/claims";
import { headlineClaimId } from "../../content/headline-proof";

const titleId = headlineClaimId();

export const dynamic = "force-static";
export const metadata = pageMetadata("/", claimText(titleId), claimText("entity-sentence"));

const HomePage = () => (
  <SitePage
    description={<Claim id="subhead-founding" slot="description" />}
    pageId="home"
    title={<Claim id={titleId} slot="shipped-benefit" />}
  />
);

export default HomePage;
