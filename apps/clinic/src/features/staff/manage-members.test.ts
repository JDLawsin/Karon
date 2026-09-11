import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { inviteAssistant } from "./manage-members";

const tenantId = "11111111-1111-4111-8111-111111111111";
const actorUserId = "22222222-2222-4222-8222-222222222222";

const userClient = {
  from: () => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      gte: async () => ({ count: 0, error: null }),
      insert: async () => ({ error: null })
    };
    return chain;
  }
} as unknown as SupabaseClient;

describe("inviteAssistant", () => {
  it("does not create a confirmed user when invite fails", async () => {
    const createUser = vi.fn();
    const inviteUserByEmail = vi.fn(async () => ({
      data: { user: null },
      error: { message: "invite failed" }
    }));
    const admin = {
      auth: { admin: { inviteUserByEmail, createUser } }
    } as unknown as SupabaseClient;

    const result = await inviteAssistant({
      userClient,
      admin,
      tenantId,
      actorUserId,
      email: "assistant@example.com",
      redirectTo: "https://clinic.example/auth/confirm"
    });

    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "Could not invite that email."
    });
    expect(createUser).not.toHaveBeenCalled();
  });
});
