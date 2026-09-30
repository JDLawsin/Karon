import { pageMetadata } from "@/lib/page-metadata";
import HomePage from "@/features/home/home-page";
import { claimText } from "../../content/claims";
import { headlineClaimId } from "../../content/headline-proof";

const titleId = headlineClaimId();
const title = claimText("category-small-dental");
const description = claimText("entity-sentence");
const baseMetadata = pageMetadata("/", title, description);

export const dynamic = "force-static";
export const metadata = {
  ...baseMetadata,
  title: { absolute: `${title} | Karon` },
  openGraph: { ...baseMetadata.openGraph, title: `${title} | Karon` }
};

const HomeRoute = () => <HomePage headlineId={titleId} />;

export default HomeRoute;
