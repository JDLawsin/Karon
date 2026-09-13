import { NextResponse } from "next/server";

import { authorizeOwnerAction } from "@/features/staff/authorize-owner";
import { getClinicAccess } from "@/lib/auth/clinic-access";
import { clinicAppUrl } from "@/lib/server-env";
import {
  OAUTH_STATE_COOKIE,
  googleOAuthAuthorizeUrl,
  oauthCookieOptions,
  signBoundOauthState
} from "@/lib/google-calendar/calendar-sync";

const clearOauthCookie = (response: NextResponse) => {
  response.cookies.set(OAUTH_STATE_COOKIE, "", {
    ...oauthCookieOptions(),
    maxAge: 0
  });

  return response;
};

export const GET = async () => {
  const access = await getClinicAccess();
  const authz = authorizeOwnerAction({
    userId: access.userId,
    aal: access.aal,
    role: access.membership?.role ?? null,
    mfaOk: access.mfaOk
  });

  if (!authz.ok || !access.userId || !access.membership) {
    return NextResponse.redirect(clinicAppUrl("/settings?tab=integrations"));
  }

  const state = signBoundOauthState(access.userId, access.membership.tenantId);
  const url = state ? googleOAuthAuthorizeUrl(state) : null;

  if (!state || !url) {
    return NextResponse.json({ error: "Google Calendar is not configured." }, { status: 503 });
  }

  const response = NextResponse.redirect(url);
  response.cookies.set(OAUTH_STATE_COOKIE, state, oauthCookieOptions());

  return response;
};

export const DELETE = async () => {
  return clearOauthCookie(NextResponse.json({ ok: true }));
};
