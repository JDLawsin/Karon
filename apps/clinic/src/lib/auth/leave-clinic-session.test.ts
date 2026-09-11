import { describe, expect, it, vi } from "vitest";

import { dropClinicStores } from "@/lib/db/clinic-db";

import { clearClinicPageCaches, leaveClinicSession } from "./leave-clinic-session";

vi.mock("@/lib/db/clinic-db", () => ({
  dropClinicStores: vi.fn()
}));

describe("clearClinicPageCaches", () => {
  it("deletes pages and pages-rsc caches", async () => {
    const deleted: string[] = [];
    vi.stubGlobal("caches", {
      keys: async () => ["pages", "pages-rsc", "static-assets"],
      delete: async (name: string) => {
        deleted.push(name);
        return true;
      }
    });

    await clearClinicPageCaches();
    expect(deleted).toEqual(["pages", "pages-rsc"]);
    vi.unstubAllGlobals();
  });
});

describe("leaveClinicSession", () => {
  it("revokes the clinic session before a local sign-out", async () => {
    const rpc = vi.fn(async () => ({ data: true, error: null }));
    const signOut = vi.fn(async () => ({ error: null }));

    await leaveClinicSession({
      rpc,
      auth: { signOut }
    } as never);

    expect(rpc).toHaveBeenCalledWith("revoke_my_session");
    expect(dropClinicStores).toHaveBeenCalled();
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(rpc.mock.invocationCallOrder[0]).toBeLessThan(
      signOut.mock.invocationCallOrder[0]!
    );
  });
});
