import type { EmailOtpType } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

import { emailOtpTypeSchema } from "@/features/auth/auth-schemas";
import { completeSignIn } from "@/features/auth/complete-sign-in";
import { redeemDeviceTrustFromRequest } from "@/lib/auth/device-trust";
import { clinicAppUrl } from "@/lib/server-env";
import {
  createAuthRouteClient,
  verifyEmailOtp
} from "@/lib/supabase/auth-route";

export const GET = async (request: NextRequest) => {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const token = request.nextUrl.searchParams.get("token");
  const email = request.nextUrl.searchParams.get("email");
  const typeResult = emailOtpTypeSchema.safeParse(
    request.nextUrl.searchParams.get("type")
  );
  const { supabase, redirect } = createAuthRouteClient(request);

  if (!typeResult.success) {
    return redirect(clinicAppUrl("/login"));
  }

  const type = typeResult.data;

  const verify = async (otpType: EmailOtpType) =>
    tokenHash
      ? verifyEmailOtp({ type: otpType, token_hash: tokenHash })
      : token && email
        ? verifyEmailOtp({ type: otpType, token, email })
        : { data: { session: null }, error: new Error("missing token") };

  const first = await verify(type);
  const result =
    first.error && type === "magiclink" ? await verify("email") : first;

  if (result.error || !result.data.session) {
    return redirect(clinicAppUrl("/login"));
  }

  await supabase.auth.setSession({
    access_token: result.data.session.access_token,
    refresh_token: result.data.session.refresh_token
  });

  if (type === "recovery") {
    return redirect(clinicAppUrl("/update-password"));
  }

  await redeemDeviceTrustFromRequest(supabase, request);
  const { destination } = await completeSignIn(supabase, "/auth/confirm");
  return redirect(clinicAppUrl(destination));
};
