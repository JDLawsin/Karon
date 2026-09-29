import { cookies } from "next/headers";

import { parseAuthClaims, parseMembership } from "@/features/auth/parse-membership";
import { parseEntitlement } from "@/features/billing/entitlement";
import {
  DEVICE_TRUST_COOKIE,
  redeemDeviceTrust
} from "@/lib/auth/device-trust";
import { ensureDevelopmentEntitlement } from "@/lib/billing/development-entitlement";
import { createAdminSupabase } from "@/lib/supabase/admin";
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
      entitlement: null,
      supabase
    };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(DEVICE_TRUST_COOKIE)?.value;
  await redeemDeviceTrust(supabase, token);

  const [
    { data: rows },
    { data: sessionActive },
    { data: mfaOk },
    { data: entitlementRows }
  ] = await Promise.all([
    supabase.rpc("current_membership"),
    supabase.rpc("has_active_session"),
    supabase.rpc("session_mfa_ok"),
    supabase.rpc("current_entitlement"),
    supabase.rpc("touch_my_session")
  ]);
  const row = Array.isArray(rows) ? rows[0] : rows;
  const entitlementRow = Array.isArray(entitlementRows)
    ? entitlementRows[0]
    : entitlementRows;
  const sessionMfaOk = mfaOk === true;
  const membership = parseMembership(row);
  let entitlement = parseEntitlement(entitlementRow);

  if (membership) {
    entitlement = await ensureDevelopmentEntitlement({
      entitlement,
      tenantId: membership.tenantId,
      grant: async ({ tenantId, startsAt, accessUntil }) => {
        const { error } = await createAdminSupabase()
          .from("clinic_entitlements")
          .upsert(
            {
              tenant_id: tenantId,
              status: "active",
              source: "manual",
              provider: null,
              billing_checkout_id: null,
              starts_at: startsAt,
              access_until: accessUntil,
              updated_at: startsAt
            },
            { onConflict: "tenant_id" }
          );

        return error === null;
      },
      reload: async () => {
        const { data: reloadedRows, error } = await supabase.rpc(
          "current_entitlement"
        );

        if (error) {
          return null;
        }

        return parseEntitlement(
          Array.isArray(reloadedRows) ? reloadedRows[0] : reloadedRows
        );
      }
    });
  }

  return {
    userId,
    aal,
    membership,
    sessionActive: sessionActive === true,
    deviceTrusted: sessionMfaOk && aal !== "aal2",
    passwordRecovery,
    mfaOk: sessionMfaOk,
    entitlement,
    supabase
  };
};

export { getClinicAccess };
