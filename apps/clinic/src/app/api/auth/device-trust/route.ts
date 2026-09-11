import { NextResponse } from "next/server";

import { getClinicAccess } from "@/lib/auth/clinic-access";
import {
  DEVICE_TRUST_COOKIE,
  createDeviceTrustToken,
  deviceTrustCookieOptions,
  hashDeviceTrustToken
} from "@/lib/auth/device-trust";

export const POST = async (request: Request) => {
  const access = await getClinicAccess();

  if (!access.userId) {
    return NextResponse.json({ trusted: false }, { status: 401 });
  }

  const shouldIssue =
    access.aal === "aal2" && new URL(request.url).searchParams.get("issue") === "1";

  if (shouldIssue) {
    const token = createDeviceTrustToken();
    const { data } = await access.supabase.rpc("issue_device_trust", {
      p_token_hash: hashDeviceTrustToken(token)
    });

    if (data === true) {
      const response = NextResponse.json({ trusted: true });
      response.cookies.set(
        DEVICE_TRUST_COOKIE,
        token,
        deviceTrustCookieOptions()
      );
      return response;
    }
  }

  return NextResponse.json({ trusted: access.mfaOk });
};
