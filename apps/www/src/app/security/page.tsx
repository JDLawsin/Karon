import { pageMetadata } from "@/lib/page-metadata";
import SecurityPage from "@/features/security/security-page";
import { securityPageCopy } from "../../../content/security";

export const dynamic = "force-static";
export const metadata = pageMetadata("/security", securityPageCopy.title, securityPageCopy.description);

const Page = () => <SecurityPage />;

export default Page;
