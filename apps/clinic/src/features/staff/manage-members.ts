import type { SupabaseClient } from "@supabase/supabase-js";

import {
  INVITE_WINDOW_MS,
  isInviteRateLimited
} from "@/features/staff/authorize-owner";
import { emailByUserId, visibleDeviceSessions } from "@/features/staff/staff-labels";
import {
  inviteBodySchema,
  memberRowSchema,
  memberUserSchema,
  sessionBodySchema,
  sessionRowSchema
} from "@/features/staff/staff-schemas";

const countRecentInvites = async (
  supabase: SupabaseClient,
  tenantId: string
) => {
  const since = new Date(Date.now() - INVITE_WINDOW_MS).toISOString();
  const { count, error } = await supabase
    .from("audit_events")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("event_type", "member.invited")
    .gte("created_at", since);

  if (error) {
    throw error;
  }

  return count ?? 0;
};

type InviteDeps = {
  userClient: SupabaseClient;
  admin: SupabaseClient;
  tenantId: string;
  actorUserId: string;
  email: string;
  redirectTo: string;
};

const inviteAssistant = async ({
  userClient,
  admin,
  tenantId,
  actorUserId,
  email,
  redirectTo
}: InviteDeps) => {
  const recent = await countRecentInvites(userClient, tenantId);

  if (isInviteRateLimited(recent)) {
    return {
      ok: false as const,
      status: 429 as const,
      error: "Too many invites. Try again later."
    };
  }

  const invited = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo
  });
  const userId = invited.data.user?.id;

  if (invited.error || !userId) {
    return {
      ok: false as const,
      status: 400 as const,
      error: "Could not invite that email."
    };
  }

  const { error: memberError } = await userClient.from("clinic_members").insert({
    tenant_id: tenantId,
    user_id: userId,
    role: "assistant"
  });

  if (memberError) {
    return {
      ok: false as const,
      status: 403 as const,
      error: "Could not add that assistant."
    };
  }

  await userClient.from("audit_events").insert({
    tenant_id: tenantId,
    actor_user_id: actorUserId,
    event_type: "member.invited",
    record_id: userId,
    metadata: {}
  });

  return { ok: true as const, userId };
};

type RemoveDeps = {
  userClient: SupabaseClient;
  tenantId: string;
  actorUserId: string;
  memberUserId: string;
};

const removeAssistant = async ({
  userClient,
  tenantId,
  actorUserId,
  memberUserId
}: RemoveDeps) => {
  const { data: member } = await userClient
    .from("clinic_members")
    .select("user_id, role, tenant_id")
    .eq("user_id", memberUserId)
    .maybeSingle();

  if (!member || member.role !== "assistant" || member.tenant_id !== tenantId) {
    return { ok: false as const, status: 404 as const, error: "Assistant not found." };
  }

  const { error } = await userClient
    .from("clinic_members")
    .delete()
    .eq("user_id", memberUserId);

  if (error) {
    return {
      ok: false as const,
      status: 403 as const,
      error: "Could not remove that assistant."
    };
  }

  const { error: revokeError } = await userClient.rpc(
    "revoke_removed_member_sessions",
    { p_user_id: memberUserId }
  );

  if (revokeError) {
    return {
      ok: false as const,
      status: 403 as const,
      error: "Could not revoke that assistant's devices."
    };
  }

  await userClient.from("audit_events").insert({
    tenant_id: tenantId,
    actor_user_id: actorUserId,
    event_type: "member.removed",
    record_id: memberUserId,
    metadata: {}
  });

  return { ok: true as const };
};

type RevokeDeps = {
  userClient: SupabaseClient;
  tenantId: string;
  actorUserId: string;
  sessionRowId: string;
};

const revokeDevice = async ({
  userClient,
  tenantId,
  actorUserId,
  sessionRowId
}: RevokeDeps) => {
  const { data, error } = await userClient.rpc("revoke_clinic_session", {
    p_id: sessionRowId
  });
  const row = Array.isArray(data) ? data[0] : data;

  if (error || !row) {
    return {
      ok: false as const,
      status: error ? (403 as const) : (404 as const),
      error: "Device session not found."
    };
  }

  await userClient.from("audit_events").insert({
    tenant_id: tenantId,
    actor_user_id: actorUserId,
    event_type: "auth.session_revoked",
    record_id: sessionRowId,
    metadata: {}
  });

  return { ok: true as const };
};

const revokeOtherDevices = async ({
  userClient,
  tenantId,
  actorUserId
}: Omit<RevokeDeps, "sessionRowId">) => {
  const { data, error } = await userClient.rpc("revoke_other_devices");

  if (error || data !== true) {
    return {
      ok: false as const,
      status: 403 as const,
      error: "Could not revoke other devices."
    };
  }

  await userClient.from("audit_events").insert({
    tenant_id: tenantId,
    actor_user_id: actorUserId,
    event_type: "auth.session_revoked",
    record_id: null,
    metadata: {}
  });

  return { ok: true as const };
};

const listStaffDirectory = async ({
  userClient,
  admin,
  callerAuthSessionId
}: {
  userClient: SupabaseClient;
  admin: SupabaseClient;
  callerAuthSessionId: string | null;
}) => {
  const [
    { data: memberRows, error: memberError },
    { data: sessionRows, error: sessionError }
  ] = await Promise.all([
    userClient.from("clinic_members").select("user_id, role").order("role"),
    userClient
      .from("clinic_sessions")
      .select("id, user_id, session_id, last_active_at, revoked_at")
      .order("last_active_at", { ascending: false })
  ]);

  if (memberError || sessionError) {
    return {
      ok: false as const,
      status: 403 as const,
      error: "Could not load staff."
    };
  }

  const membersParsed = (memberRows ?? []).flatMap((row) => {
    const parsed = memberRowSchema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });
  const sessionsParsed = (sessionRows ?? []).flatMap((row) => {
    const parsed = sessionRowSchema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });

  const ids = [
    ...new Set([
      ...membersParsed.map((row) => row.user_id),
      ...sessionsParsed.map((row) => row.user_id)
    ])
  ];

  try {
    const users = await Promise.all(
      ids.map(async (id) => {
        const { data } = await admin.auth.admin.getUserById(id);
        const metadata = data.user?.user_metadata;

        return {
          id,
          email: data.user?.email ?? null,
          avatarSeed:
            typeof metadata?.avatar_seed === "string" ? metadata.avatar_seed : null,
          avatarStyle:
            typeof metadata?.avatar_style === "string"
              ? metadata.avatar_style
              : null
        };
      })
    );
    const emails = emailByUserId(users);
    const profileById = Object.fromEntries(users.map((user) => [user.id, user]));

    return {
      ok: true as const,
      members: membersParsed.map((row) => ({
        userId: row.user_id,
        role: row.role,
        email: emails[row.user_id] ?? null,
        avatarSeed: profileById[row.user_id]?.avatarSeed ?? null,
        avatarStyle: profileById[row.user_id]?.avatarStyle ?? null
      })),
      sessions: visibleDeviceSessions(
        sessionsParsed.map((row) => ({
          id: row.id,
          userId: row.user_id,
          email: emails[row.user_id] ?? null,
          lastActiveAt: row.last_active_at,
          revokedAt: row.revoked_at,
          isCurrent:
            callerAuthSessionId !== null && row.session_id === callerAuthSessionId
        }))
      )
    };
  } catch {
    return {
      ok: false as const,
      status: 403 as const,
      error: "Could not load staff."
    };
  }
};

export {
  inviteAssistant,
  inviteBodySchema,
  listStaffDirectory,
  memberUserSchema,
  removeAssistant,
  revokeDevice,
  revokeOtherDevices,
  sessionBodySchema
};
