import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { inviteAssistant, listStaffDirectory } from "./manage-members";

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

describe("listStaffDirectory", () => {
  it("includes saved avatar metadata on members", async () => {
    const from = (table: string) => {
      if (table === "clinic_members") {
        return {
          select: () => ({
            order: async () => ({
              data: [{ user_id: actorUserId, role: "owner" }],
              error: null
            })
          })
        };
      }

      return {
        select: () => ({
          order: async () => ({ data: [], error: null })
        })
      };
    };
    const getUserById = vi.fn(async () => ({
      data: {
        user: {
          email: "owner@example.com",
          user_metadata: {
            avatar_seed: "blake",
            avatar_style: "lorelei"
          }
        }
      }
    }));

    const result = await listStaffDirectory({
      userClient: { from } as unknown as SupabaseClient,
      admin: { auth: { admin: { getUserById } } } as unknown as SupabaseClient,
      callerAuthSessionId: null
    });

    expect(result).toEqual({
      ok: true,
      members: [
        {
          userId: actorUserId,
          role: "owner",
          email: "owner@example.com",
          avatarSeed: "blake",
          avatarStyle: "lorelei"
        }
      ],
      sessions: []
    });
  });
});
