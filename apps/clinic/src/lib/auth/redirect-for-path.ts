import { redirect } from "next/navigation";

import { resolveAuthDestination } from "@/features/auth/resolve-auth-destination";
import { getClinicAccess } from "@/lib/auth/clinic-access";

const redirectForPath = async (pathname: string) => {
  const access = await getClinicAccess();
  const destination = resolveAuthDestination({
    pathname,
    userId: access.userId,
    aal: access.aal,
    membership: access.membership,
    sessionActive: access.sessionActive,
    deviceTrusted: access.deviceTrusted,
    passwordRecovery: access.passwordRecovery
  });

  if (destination) {
    redirect(destination);
  }

  return access;
};

export { redirectForPath };
