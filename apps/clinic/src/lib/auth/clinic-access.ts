import { cookies } from "next/headers";

import { parseAuthClaims, parseMembership } from "@/features/auth/parse-membership";
import {
  DEVICE_TRUST_COOKIE,
  redeemDeviceTrust
} from "@/lib/auth/device-trust";
import { createServerSupabase } from "@/lib/supabase/server";

const getClinicAccess = async () => {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getClaims();
  const { userId, aal, passwordRecovery } = parseAuthClaims(data?.claims);

  if (!userId) {
    return {
      userId: null,
      aal: null,
      membership: null,
      sessionActive: false,
      deviceTrusted: false,
      passwordRecovery: false,
      mfaOk: false,
      supabase
    };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(DEVICE_TRUST_COOKIE)?.value;
  await redeemDeviceTrust(supabase, token);

  const [{ data: rows }, { data: sessionActive }, { data: mfaOk }] =
    await Promise.all([
      supabase.rpc("current_membership"),
      supabase.rpc("has_active_session"),
      supabase.rpc("session_mfa_ok")
    ]);
  const row = Array.isArray(rows) ? rows[0] : rows;
  const sessionMfaOk = mfaOk === true;

  return {
    userId,
    aal,
    membership: parseMembership(row),
    sessionActive: sessionActive === true,
    deviceTrusted: sessionMfaOk && aal !== "aal2",
    passwordRecovery,
    mfaOk: sessionMfaOk,
    supabase
  };
};

export { getClinicAccess };
