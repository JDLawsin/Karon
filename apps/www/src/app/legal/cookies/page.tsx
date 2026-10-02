import { pageMetadata } from "@/lib/page-metadata";
import LegalPage from "@/features/legal/legal-page";
import { cookieNotice } from "../../../../content/legal";

export const dynamic = "force-static";
export const metadata = pageMetadata("/legal/cookies", cookieNotice.title, cookieNotice.description);

const CookiesPage = () => <LegalPage {...cookieNotice} pageId="cookies" />;

export default CookiesPage;
