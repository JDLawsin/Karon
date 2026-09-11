import type { SupabaseClient } from "@supabase/supabase-js";

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

const leaveClinicSession = async (supabase: SupabaseClient) => {
  await supabase.rpc("revoke_my_session");
  await clearClinicPageCaches();
  await supabase.auth.signOut({ scope: "local" });
};

export { clearClinicPageCaches, leaveClinicSession };
