import { Suspense } from "react";

import ClinicSettings from "@/features/auth/clinic-settings";

export const metadata = {
  title: "Settings"
};

const SettingsPage = () => (
  <Suspense>
    <ClinicSettings />
  </Suspense>
);

export default SettingsPage;
