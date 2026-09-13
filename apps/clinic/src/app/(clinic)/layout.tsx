import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { version as appVersion } from "../../../package.json";
import ClinicShell from "@/features/auth/clinic-shell";
import { redirectForPath } from "@/lib/auth/redirect-for-path";

type Props = {
  children: ReactNode;
};

const ClinicLayout = async ({ children }: Props) => {
  const access = await redirectForPath("/today");

  if (!access.membership || !access.userId) {
    redirect("/login");
  }

  return (
    <ClinicShell
      appVersion={appVersion}
      membership={access.membership}
      sessionActive={access.sessionActive}
      userId={access.userId}
    >
      {children}
    </ClinicShell>
  );
};

export default ClinicLayout;
