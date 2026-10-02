import { pageMetadata } from "@/lib/page-metadata";
import LegalPage from "@/features/legal/legal-page";
import { termsNotice } from "../../../../content/legal";

export const dynamic = "force-static";
export const metadata = pageMetadata("/legal/terms", termsNotice.title, termsNotice.description);

const TermsPage = () => <LegalPage {...termsNotice} pageId="terms" />;

export default TermsPage;
