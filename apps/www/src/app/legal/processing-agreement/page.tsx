import { pageMetadata } from "@/lib/page-metadata";
import SitePage from "@/features/site-page/site-page";

const title = "Processing agreement summary";
const description = "A summary of Karon's data processing terms for clinics.";

export const dynamic = "force-static";
export const metadata = pageMetadata("/legal/processing-agreement", title, description);

const ProcessingAgreementPage = () => <SitePage description={description} lastUpdated="2026-09-30" pageId="processing-agreement" showCtas={false} title={title} />;

export default ProcessingAgreementPage;
