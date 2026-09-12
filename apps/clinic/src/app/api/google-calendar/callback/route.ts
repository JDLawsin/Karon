import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { authorizeOwnerAction } from "@/features/staff/authorize-owner";
import { getClinicAccess } from "@/lib/auth/clinic-access";
import { clinicAppUrl } from "@/lib/server-env";
import {
  OAUTH_STATE_COOKIE,
  exchangeCode,
  oauthCookieOptions,
  readBoundOauthState,
  storeConnection
} from "@/lib/google-calendar/calendar-sync";

const redirectHome = () => {
  const response = NextResponse.redirect(clinicAppUrl("/owner/clinic"));
  response.cookies.set(OAUTH_STATE_COOKIE, "", {
    ...oauthCookieOptions(),
    maxAge: 0
  });

  return response;
};

export const GET = async (request: Request) => {
  const access = await getClinicAccess();
  const authz = authorizeOwnerAction({
    userId: access.userId,
    aal: access.aal,
    role: access.membership?.role ?? null,
    mfaOk: access.mfaOk
  });

  if (!authz.ok || !access.membership || !access.userId) {
    return redirectHome();
  }

  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const cookieStore = await cookies();
  const expected = cookieStore.get(OAUTH_STATE_COOKIE)?.value;
  const bound = state ? readBoundOauthState(state) : null;

  if (
    !state ||
    !code ||
    state !== expected ||
    !bound ||
    bound.userId !== access.userId ||
    bound.tenantId !== access.membership.tenantId
  ) {
    return redirectHome();
  }

  const refreshToken = await exchangeCode(code);

  if (refreshToken) {
    await storeConnection(access.membership.tenantId, access.userId, refreshToken);
  }

  return redirectHome();
};
