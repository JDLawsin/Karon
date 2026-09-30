import { pageMetadata } from "@/lib/page-metadata";
import FeaturesPage from "@/features/features/features-page";

const title = "What works today";
const description = "See the Karon capabilities available to clinics today.";

export const dynamic = "force-static";
export const metadata = pageMetadata("/features", title, description);

const Page = () => <FeaturesPage />;

export default Page;
