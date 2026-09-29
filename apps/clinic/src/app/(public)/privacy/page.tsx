import type { Metadata } from "next";

import PrivacyNotice from "@/features/privacy/privacy-notice";

export const metadata: Metadata = {
  title: "Privacy notice"
};

const PrivacyPage = () => <PrivacyNotice />;

export default PrivacyPage;
