import { pageMetadata } from "@/lib/page-metadata";
import LegalPage from "@/features/legal/legal-page";
import { privacyNotice } from "../../../../content/legal";
import { readLegalContactEmail } from "../../../../content/legal-status";

const contactEmail = readLegalContactEmail(process.env.LEGAL_CONTACT_EMAIL);
const notice = privacyNotice(contactEmail);

export const dynamic = "force-static";
export const metadata = pageMetadata("/legal/privacy", notice.title, notice.description);

const PrivacyPage = () => <LegalPage {...notice} pageId="privacy" />;

export default PrivacyPage;
