import type { SupabaseClient } from "@supabase/supabase-js";

import { parseAuthClaims, parseMembership } from "@/features/auth/parse-membership";
import { resolveAuthDestination } from "@/features/auth/resolve-auth-destination";
import { writeAuditEvent } from "@/lib/auth/audit";

const applyDeviceTrust = async () => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    await fetch("/api/auth/device-trust", { method: "POST" });
  } catch {
    // Offline login cannot redeem; the next server render will try again.
  }
};

const readAuthSnapshot = async (supabase: SupabaseClient) => {
  const { data: claimsData } = await supabase.auth.getClaims();
  await supabase.rpc("register_my_session");
  await applyDeviceTrust();
  const [{ data: rows }, { data: sessionActive }, { data: mfaOk }] =
    await Promise.all([
      supabase.rpc("current_membership"),
      supabase.rpc("has_active_session"),
      supabase.rpc("session_mfa_ok")
    ]);
  const row = Array.isArray(rows) ? rows[0] : rows;
  const claims = parseAuthClaims(claimsData?.claims);
  const sessionMfaOk = mfaOk === true;

  return {
    userId: claims.userId,
    aal: claims.aal,
    membership: parseMembership(row),
    sessionActive: sessionActive === true,
    deviceTrusted: sessionMfaOk && claims.aal !== "aal2",
    passwordRecovery: claims.passwordRecovery
  };
};

const completeSignIn = async (
  supabase: SupabaseClient,
  pathname: string,
  eventType: "auth.login" | "auth.signup" | null = "auth.login"
) => {
  const snapshot = await readAuthSnapshot(supabase);

  if (snapshot.membership && snapshot.userId && eventType) {
    await writeAuditEvent(supabase, {
      tenantId: snapshot.membership.tenantId,
      actorUserId: snapshot.userId,
      eventType
    });
  }

  return {
    ...snapshot,
    destination: resolveAuthDestination({ pathname, ...snapshot }) ?? "/today"
  };
};

export { completeSignIn, readAuthSnapshot };
