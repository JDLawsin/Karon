import type { SupabaseClient } from "@supabase/supabase-js";

import {
  dropClinicStores,
  pendingClinicOutboxCount
} from "@/lib/db/clinic-db";

type LeaveClinicSessionOptions = {
  discardPending?: boolean;
};

type LeaveClinicSessionResult =
  | { status: "blocked"; pendingCount: number }
  | { status: "left" };

const clearClinicPageCaches = async () => {
  if (typeof caches === "undefined") {
    return;
  }

  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter((name) => name.includes("pages"))
      .map((name) => caches.delete(name))
  );
};

const clearGoogleOauthCookie = async () => {
  try {
    await fetch("/api/google-calendar/connect", {
      method: "DELETE",
      credentials: "include"
    });
  } catch {
    // Cookie clear is best-effort; sign-out still continues.
  }
};

const leaveClinicSession = async (
  supabase: SupabaseClient,
  options: LeaveClinicSessionOptions = {}
): Promise<LeaveClinicSessionResult> => {
  const pendingCount = await pendingClinicOutboxCount();

  if (pendingCount > 0 && !options.discardPending) {
    return { status: "blocked", pendingCount };
  }

  await supabase.rpc("revoke_my_session");
  await clearClinicPageCaches();
  await dropClinicStores();
  await clearGoogleOauthCookie();
  await supabase.auth.signOut({ scope: "local" });
  return { status: "left" };
};

export { clearClinicPageCaches, leaveClinicSession };
export type { LeaveClinicSessionOptions, LeaveClinicSessionResult };
