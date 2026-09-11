import type { NextRequest } from "next/server";

import { completeSignIn } from "@/features/auth/complete-sign-in";
import { redeemDeviceTrustFromRequest } from "@/lib/auth/device-trust";
import { clinicAppUrl } from "@/lib/server-env";
import { createAuthRouteClient } from "@/lib/supabase/auth-route";

export const GET = async (request: NextRequest) => {
  const code = request.nextUrl.searchParams.get("code");
  const { supabase, redirect } = createAuthRouteClient(request);

  if (!code) {
    return redirect(clinicAppUrl("/login"));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return redirect(clinicAppUrl("/login"));
  }

  await redeemDeviceTrustFromRequest(supabase, request);
  const { destination } = await completeSignIn(supabase, "/auth/callback");
  return redirect(clinicAppUrl(destination));
};
