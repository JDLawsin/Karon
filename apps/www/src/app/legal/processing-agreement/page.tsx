import { pageMetadata } from "@/lib/page-metadata";
import LegalPage from "@/features/legal/legal-page";
import { processingAgreementNotice } from "../../../../content/legal";

export const dynamic = "force-static";
export const metadata = pageMetadata("/legal/processing-agreement", processingAgreementNotice.title, processingAgreementNotice.description);

const ProcessingAgreementPage = () => <LegalPage {...processingAgreementNotice} pageId="processing-agreement" />;

export default ProcessingAgreementPage;
