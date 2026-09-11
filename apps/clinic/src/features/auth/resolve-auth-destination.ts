type ClinicRole = "owner" | "assistant";

type Membership = {
  tenantId: string;
  role: ClinicRole;
};

type AuthSnapshot = {
  pathname: string;
  userId: string | null;
  aal: string | null;
  membership: Membership | null;
  sessionActive: boolean;
  deviceTrusted?: boolean;
  passwordRecovery?: boolean;
};

const isAuthEntryPath = (pathname: string) =>
  pathname === "/login" ||
  pathname === "/signup" ||
  pathname === "/onboarding" ||
  pathname === "/mfa" ||
  pathname === "/forgot-password" ||
  pathname === "/" ||
  pathname.startsWith("/auth/");

const isAnonymousPublicPath = (pathname: string) =>
  pathname === "/login" ||
  pathname === "/signup" ||
  pathname === "/forgot-password" ||
  pathname === "/~offline" ||
  pathname.startsWith("/auth/");

const needsOwnerTotp = (
  aal: string | null,
  membership: Membership | null,
  deviceTrusted: boolean
) =>
  aal !== "aal2" &&
  (membership === null || (membership.role === "owner" && !deviceTrusted));

const resolveAuthDestination = ({
  pathname,
  userId,
  aal,
  membership,
  sessionActive,
  deviceTrusted = false,
  passwordRecovery = false
}: AuthSnapshot) => {
  if (!userId) {
    return isAnonymousPublicPath(pathname) ? null : "/login";
  }

  if (passwordRecovery) {
    return pathname === "/update-password" ? null : "/update-password";
  }

  if (membership && !sessionActive) {
    if (pathname === "/update-password") {
      return null;
    }

    return pathname === "/login" ? null : "/login";
  }

  if (needsOwnerTotp(aal, membership, deviceTrusted)) {
    return pathname === "/mfa" ? null : "/mfa";
  }

  if (!membership) {
    return pathname === "/onboarding" ? null : "/onboarding";
  }

  if (pathname.startsWith("/owner") && membership.role !== "owner") {
    return "/today";
  }

  if (isAuthEntryPath(pathname)) {
    return "/today";
  }

  return null;
};

export { resolveAuthDestination };
export type { AuthSnapshot, ClinicRole, Membership };
