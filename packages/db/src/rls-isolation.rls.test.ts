import { createHash, randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as OTPAuth from "otpauth";

import { decodeJwtClaims } from "./claims";
import { loadEnvFiles } from "./load-env";

loadEnvFiles();

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const requireRls = process.env.KARON_REQUIRE_RLS === "1";
const configured = Boolean(supabaseUrl && anonKey && serviceKey);

if (requireRls && !configured) {
  throw new Error(
    "KARON_REQUIRE_RLS=1 but NEXT_PUBLIC_SUPABASE_URL and a secret key are missing"
  );
}

const TEST_PASSWORD = "Clinic-test-pass-12";

type SeededUser = {
  email: string;
  id: string;
};

describe.skipIf(!configured)("F-13 tenant isolation", () => {
  const admin = createClient(supabaseUrl!, serviceKey!, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const suffix = randomUUID().slice(0, 8);
  const users: SeededUser[] = [];
  const clinicIds: string[] = [];

  const createAuthedClient = async (email: string) => {
    const client = createClient(supabaseUrl!, anonKey!, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password: TEST_PASSWORD
    });

    if (error || !data.session) {
      throw error ?? new Error(`No session for ${email}`);
    }

    const claims = decodeJwtClaims(data.session.access_token);

    if (!claims.sub || !claims.session_id) {
      throw new Error("Access token is missing sub or session_id");
    }

    const { data: membership, error: membershipError } = await client.rpc(
      "register_my_session"
    );
    const membershipRow = Array.isArray(membership) ? membership[0] : membership;

    if (membershipError || !membershipRow) {
      throw membershipError ?? new Error(`No membership for ${email}`);
    }

    return { client, session: data.session };
  };

  let ownerTotpSecret: string | null = null;

  const verifyOwnerTotp = async (client: SupabaseClient) => {
    const { data: factors, error: listError } = await client.auth.mfa.listFactors();

    if (listError) {
      throw listError;
    }

    const verified = (factors.totp ?? []).find(
      (factor) => factor.status === "verified"
    );
    let factorId = verified?.id;
    let secret = ownerTotpSecret;

    if (!factorId || !secret) {
      const { data: enrolled, error: enrollError } = await client.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Karon-rls-${suffix}`
      });

      if (enrollError || !enrolled?.totp?.secret) {
        throw enrollError ?? new Error("Could not enroll TOTP");
      }

      factorId = enrolled.id;
      secret = enrolled.totp.secret;
      ownerTotpSecret = secret;
    }

    const totp = new OTPAuth.TOTP({
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret.replaceAll(" ", ""))
    });
    const { data: challenge, error: challengeError } =
      await client.auth.mfa.challenge({ factorId });

    if (challengeError || !challenge) {
      throw challengeError ?? new Error("Could not challenge TOTP");
    }

    const { error: verifyError } = await client.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: totp.generate()
    });

    if (verifyError) {
      throw verifyError;
    }

    const { error: registerError } = await client.rpc("register_my_session");

    if (registerError) {
      throw registerError;
    }
  };

  beforeAll(async () => {
    const createUser = async (label: string) => {
      const email = `karon-${label}-${suffix}@example.com`;
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: TEST_PASSWORD,
        email_confirm: true
      });

      if (error || !data.user) {
        throw error ?? new Error(`Could not create ${label}`);
      }

      const user = { email, id: data.user.id };
      users.push(user);
      return user;
    };

    const ownerA = await createUser("owner-a");
    const assistantA = await createUser("assistant-a");
    const ownerB = await createUser("owner-b");

    const insertClinic = async (name: string) => {
      const id = randomUUID();
      const { error } = await admin.from("clinics").insert({
        id,
        name,
        region: "ph"
      });

      if (error) {
        throw error;
      }

      clinicIds.push(id);
      return id;
    };

    const clinicA = await insertClinic(`Clinic A ${suffix}`);
    const clinicB = await insertClinic(`Clinic B ${suffix}`);

    const { error: memberError } = await admin.from("clinic_members").insert([
      { tenant_id: clinicA, user_id: ownerA.id, role: "owner" },
      { tenant_id: clinicA, user_id: assistantA.id, role: "assistant" },
      { tenant_id: clinicB, user_id: ownerB.id, role: "owner" }
    ]);

    if (memberError) {
      throw memberError;
    }

    await admin.from("audit_events").insert({
      tenant_id: clinicA,
      actor_user_id: ownerA.id,
      event_type: "clinic.created",
      metadata: { source: "rls-test" }
    });
  });

  afterAll(async () => {
    await Promise.all(
      users.map((user) => admin.auth.admin.deleteUser(user.id))
    );
    if (clinicIds.length > 0) {
      await admin.from("clinics").delete().in("id", clinicIds);
    }
  });

  it("rejects anonymous and cross-clinic clinic reads", async () => {
    const anon = createClient(supabaseUrl!, anonKey!, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const { data: anonRows, error: anonError } = await anon
      .from("clinics")
      .select("id");

    expect(anonError?.code).toBe("42501");
    expect(anonRows ?? []).toEqual([]);

    const assistant = await createAuthedClient(users[1]!.email);
    const { data: visible, error } = await assistant.client
      .from("clinics")
      .select("id, name")
      .order("name");

    expect(error).toBeNull();
    expect(visible?.map((row) => row.id)).toEqual([clinicIds[0]]);

    const { data: otherClinic, error: otherError } = await assistant.client
      .from("clinics")
      .select("id")
      .eq("id", clinicIds[1]!);

    expect(otherError).toBeNull();
    expect(otherClinic).toEqual([]);
  });

  it("hides owner audit rows from an assistant JWT", async () => {
    const assistant = await createAuthedClient(users[1]!.email);
    const { data, error } = await assistant.client
      .from("audit_events")
      .select("id, event_type");

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("blocks owner clinic reads until TOTP", async () => {
    const ownerA = await createAuthedClient(users[0]!.email);
    const { data: clinics, error } = await ownerA.client
      .from("clinics")
      .select("id");
    const { data: members } = await ownerA.client
      .from("clinic_members")
      .select("user_id");

    expect(error).toBeNull();
    expect(clinics).toEqual([]);
    expect(members).toEqual([]);
  });

  it("hides audit rows from an aal1 owner without device trust", async () => {
    const ownerA = await createAuthedClient(users[0]!.email);
    const { data, error } = await ownerA.client
      .from("audit_events")
      .select("id, event_type");

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("revokes this device so register_my_session cannot restore it", async () => {
    const assistant = await createAuthedClient(users[1]!.email);
    const { data: revoked, error: revokeError } = await assistant.client.rpc(
      "revoke_my_session"
    );

    expect(revokeError).toBeNull();
    expect(revoked).toBe(true);

    const { data: stillActive } = await assistant.client.rpc("has_active_session");
    expect(stillActive).toBe(false);

    const { data: restored } = await assistant.client.rpc("register_my_session");
    const restoredRow = Array.isArray(restored) ? restored[0] : restored;
    expect(restoredRow).toBeFalsy();

    const { data: clinics } = await assistant.client.from("clinics").select("id");
    expect(clinics).toEqual([]);
  });

  it("lets an aal2 owner read only their clinic", async () => {
    const ownerA = await createAuthedClient(users[0]!.email);
    await verifyOwnerTotp(ownerA.client);

    const { data: visible, error } = await ownerA.client
      .from("clinics")
      .select("id")
      .order("name");

    expect(error).toBeNull();
    expect(visible?.map((row) => row.id)).toEqual([clinicIds[0]]);

    const { data: otherClinic, error: otherError } = await ownerA.client
      .from("clinics")
      .select("id")
      .eq("id", clinicIds[1]!);

    expect(otherError).toBeNull();
    expect(otherClinic).toEqual([]);
  });

  it("revokes a device so the victim cannot undo it or restore access", async () => {
    const ownerA = await createAuthedClient(users[0]!.email);
    await verifyOwnerTotp(ownerA.client);

    const victim = await createAuthedClient(users[1]!.email);
    const victimSessionId = decodeJwtClaims(victim.session.access_token).session_id;
    const { data: listed } = await ownerA.client
      .from("clinic_sessions")
      .select("id")
      .eq("session_id", victimSessionId!)
      .maybeSingle();

    expect(listed?.id).toBeTruthy();

    const { data: revoked, error: revokeError } = await ownerA.client.rpc(
      "revoke_clinic_session",
      { p_id: listed!.id }
    );
    const revokedRow = Array.isArray(revoked) ? revoked[0] : revoked;

    expect(revokeError).toBeNull();
    expect(revokedRow).toBeTruthy();

    const { error: undoError, data: undoRows } = await victim.client
      .from("clinic_sessions")
      .update({ revoked_at: null })
      .eq("id", listed!.id)
      .select("id");

    expect(undoRows ?? []).toEqual([]);
    expect(undoError === null || undoError.code === "42501").toBe(true);

    const { data: stillActive } = await victim.client.rpc("has_active_session");
    expect(stillActive).toBe(false);

    const { data: restored } = await victim.client.rpc("register_my_session");
    const restoredRow = Array.isArray(restored) ? restored[0] : restored;
    expect(restoredRow).toBeFalsy();

    const { data: clinics } = await victim.client.from("clinics").select("id");
    expect(clinics).toEqual([]);
  });

  const tokenHash = (label: string) =>
    createHash("sha256").update(`${label}-${suffix}`).digest("hex");

  it("lets an aal1 owner read their clinic after redeeming a trusted device", async () => {
    const hash = tokenHash("redeem-ok");
    const enrolled = await createAuthedClient(users[0]!.email);
    await verifyOwnerTotp(enrolled.client);

    const { data: issued, error: issueError } = await enrolled.client.rpc(
      "issue_device_trust",
      { p_token_hash: hash }
    );

    expect(issueError).toBeNull();
    expect(issued).toBe(true);

    const returning = await createAuthedClient(users[0]!.email);
    const { data: before } = await returning.client.from("clinics").select("id");
    expect(before).toEqual([]);

    const { data: redeemed, error: redeemError } = await returning.client.rpc(
      "redeem_device_trust",
      { p_token_hash: hash }
    );

    expect(redeemError).toBeNull();
    expect(redeemed).toBe(true);

    const { data: visible, error } = await returning.client.from("clinics").select("id");
    expect(error).toBeNull();
    expect(visible?.map((row) => row.id)).toEqual([clinicIds[0]]);
  });

  it("does not let an aal1 owner mint trust or redeem someone else's hash", async () => {
    const ownerHash = tokenHash("owner-only");
    const enrolled = await createAuthedClient(users[0]!.email);
    await verifyOwnerTotp(enrolled.client);
    const { error: issueError } = await enrolled.client.rpc("issue_device_trust", {
      p_token_hash: ownerHash
    });
    expect(issueError).toBeNull();

    const assistant = await createAuthedClient(users[1]!.email);
    const { data: minted, error: mintError } = await assistant.client.rpc(
      "issue_device_trust",
      { p_token_hash: tokenHash("assistant-mint") }
    );
    expect(minted === true).toBe(false);
    expect(mintError).toBeTruthy();

    const { data: stolen } = await assistant.client.rpc("redeem_device_trust", {
      p_token_hash: ownerHash
    });
    expect(stolen).toBe(false);

    const returning = await createAuthedClient(users[0]!.email);
    const { data: redeemed } = await returning.client.rpc("redeem_device_trust", {
      p_token_hash: ownerHash
    });
    expect(redeemed).toBe(true);
  });

  it("rejects expired or revoked device trust", async () => {
    const expiredHash = tokenHash("expired");
    const revokedHash = tokenHash("revoked");
    const enrolled = await createAuthedClient(users[0]!.email);
    await verifyOwnerTotp(enrolled.client);

    const { error: expiredIssueError } = await enrolled.client.rpc(
      "issue_device_trust",
      { p_token_hash: expiredHash }
    );
    expect(expiredIssueError).toBeNull();

    const { error: expireUpdateError } = await admin
      .from("trusted_devices")
      .update({ expires_at: new Date(Date.now() - 60_000).toISOString() })
      .eq("token_hash", expiredHash);
    expect(expireUpdateError).toBeNull();

    const { error: revokedIssueError } = await enrolled.client.rpc(
      "issue_device_trust",
      { p_token_hash: revokedHash }
    );
    expect(revokedIssueError).toBeNull();

    const trusted = await createAuthedClient(users[0]!.email);
    const { data: redeemed } = await trusted.client.rpc("redeem_device_trust", {
      p_token_hash: revokedHash
    });
    expect(redeemed).toBe(true);

    const { data: listed } = await enrolled.client
      .from("clinic_sessions")
      .select("id")
      .eq("session_id", decodeJwtClaims(trusted.session.access_token).session_id!)
      .maybeSingle();
    expect(listed?.id).toBeTruthy();

    const { error: revokeError } = await enrolled.client.rpc("revoke_clinic_session", {
      p_id: listed!.id
    });
    expect(revokeError).toBeNull();

    const expiredClient = await createAuthedClient(users[0]!.email);
    const { data: expiredRedeem } = await expiredClient.client.rpc(
      "redeem_device_trust",
      { p_token_hash: expiredHash }
    );
    expect(expiredRedeem).toBe(false);
    const { data: expiredClinics } = await expiredClient.client.from("clinics").select("id");
    expect(expiredClinics).toEqual([]);

    const revokedClient = await createAuthedClient(users[0]!.email);
    const { data: revokedRedeem } = await revokedClient.client.rpc(
      "redeem_device_trust",
      { p_token_hash: revokedHash }
    );
    expect(revokedRedeem).toBe(false);
    const { data: revokedClinics } = await revokedClient.client.from("clinics").select("id");
    expect(revokedClinics).toEqual([]);
  });

  it("revokes every other device and leaves the caller signed in", async () => {
    const hash = tokenHash("revoke-others");
    const caller = await createAuthedClient(users[0]!.email);
    await verifyOwnerTotp(caller.client);
    const { error: issueError } = await caller.client.rpc("issue_device_trust", {
      p_token_hash: hash
    });
    expect(issueError).toBeNull();

    const other = await createAuthedClient(users[0]!.email);
    const { data: redeemed } = await other.client.rpc("redeem_device_trust", {
      p_token_hash: hash
    });
    expect(redeemed).toBe(true);
    const { data: otherClinics } = await other.client.from("clinics").select("id");
    expect(otherClinics?.map((row) => row.id)).toEqual([clinicIds[0]]);

    const { data: revoked, error: revokeError } = await caller.client.rpc(
      "revoke_other_devices"
    );
    expect(revokeError).toBeNull();
    expect(revoked).toBe(true);

    const { data: callerClinics, error } = await caller.client.from("clinics").select("id");
    expect(error).toBeNull();
    expect(callerClinics?.map((row) => row.id)).toEqual([clinicIds[0]]);

    const { data: stillActive } = await other.client.rpc("has_active_session");
    expect(stillActive).toBe(false);
    const { data: otherAfter } = await other.client.from("clinics").select("id");
    expect(otherAfter).toEqual([]);

    const returning = await createAuthedClient(users[0]!.email);
    const { data: reused } = await returning.client.rpc("redeem_device_trust", {
      p_token_hash: hash
    });
    expect(reused).toBe(false);
  });

  it("lets an aal1 user revoke all of their trusts and other sessions after a password change", async () => {
    const hash = tokenHash("password-change");
    const assistant = await createAuthedClient(users[1]!.email);
    const other = await createAuthedClient(users[1]!.email);

    const { error: trustError } = await admin.from("trusted_devices").insert({
      user_id: users[1]!.id,
      tenant_id: clinicIds[0],
      token_hash: hash,
      auth_session_id: decodeJwtClaims(other.session.access_token).session_id,
      expires_at: new Date(Date.now() + 86_400_000).toISOString()
    });
    expect(trustError).toBeNull();

    const { data: otherOwnerSession, error: otherOwnerError } = await admin
      .from("clinic_sessions")
      .insert({
        tenant_id: clinicIds[1],
        user_id: users[2]!.id,
        session_id: randomUUID()
      })
      .select("id")
      .single();
    expect(otherOwnerError).toBeNull();
    expect(otherOwnerSession?.id).toBeTruthy();

    const { data: revoked, error: revokeError } = await assistant.client.rpc(
      "revoke_trusts_after_password_change"
    );
    expect(revokeError).toBeNull();
    expect(revoked).toBe(true);

    const { data: callerClinics, error } = await assistant.client
      .from("clinics")
      .select("id");
    expect(error).toBeNull();
    expect(callerClinics?.map((row) => row.id)).toEqual([clinicIds[0]]);

    const { data: stillActive } = await other.client.rpc("has_active_session");
    expect(stillActive).toBe(false);

    const returning = await createAuthedClient(users[1]!.email);
    const { data: reused } = await returning.client.rpc("redeem_device_trust", {
      p_token_hash: hash
    });
    expect(reused).toBe(false);

    const { data: otherOwnerAfter } = await admin
      .from("clinic_sessions")
      .select("revoked_at")
      .eq("id", otherOwnerSession!.id)
      .single();
    expect(otherOwnerAfter?.revoked_at).toBeNull();
  });

  it("lets a member insert clinic events and hides other clinics", async () => {
    const assistant = await createAuthedClient(users[1]!.email);
    const eventId = randomUUID();
    const { error: insertError } = await assistant.client.from("clinic_events").insert({
      id: eventId,
      tenant_id: clinicIds[0],
      actor_user_id: users[1]!.id,
      event_type: "patient.created",
      record_id: randomUUID(),
      payload: { name: "Test Patient", mobile: "09170000000" },
      occurred_at: new Date().toISOString()
    });

    expect(insertError).toBeNull();

    const otherId = randomUUID();
    const { error: otherInsertError } = await admin.from("clinic_events").insert({
      id: otherId,
      tenant_id: clinicIds[1],
      actor_user_id: users[2]!.id,
      event_type: "patient.created",
      payload: { name: "Other Clinic", mobile: "09171111111" },
      occurred_at: new Date().toISOString()
    });

    expect(otherInsertError).toBeNull();

    const { data, error } = await assistant.client.from("clinic_events").select("id");

    expect(error).toBeNull();
    expect(data?.map((row) => row.id)).toEqual([eventId]);

    const { data: otherClinic, error: otherError } = await assistant.client
      .from("clinic_events")
      .select("id")
      .eq("id", otherId);

    expect(otherError).toBeNull();
    expect(otherClinic).toEqual([]);
  });

  it("hides payment.recorded from assistants and lets the owner read it", async () => {
    const assistant = await createAuthedClient(users[1]!.email);
    const paymentId = randomUUID();
    const { error: insertError } = await assistant.client.from("clinic_events").insert({
      id: paymentId,
      tenant_id: clinicIds[0],
      actor_user_id: users[1]!.id,
      event_type: "payment.recorded",
      record_id: randomUUID(),
      payload: { method: "cash" },
      occurred_at: new Date().toISOString()
    });

    expect(insertError).toBeNull();

    const { data: assistantRows, error: assistantSelectError } = await assistant.client
      .from("clinic_events")
      .select("id")
      .eq("id", paymentId);

    expect(assistantSelectError).toBeNull();
    expect(assistantRows).toEqual([]);

    const owner = await createAuthedClient(users[0]!.email);
    await verifyOwnerTotp(owner.client);
    const { data: ownerRows, error: ownerSelectError } = await owner.client
      .from("clinic_events")
      .select("id")
      .eq("id", paymentId);

    expect(ownerSelectError).toBeNull();
    expect(ownerRows?.map((row) => row.id)).toEqual([paymentId]);
  });

  it("rejects clinic_events updates and deletes from a member JWT", async () => {
    const assistant = await createAuthedClient(users[1]!.email);
    const eventId = randomUUID();
    const { error: insertError } = await assistant.client.from("clinic_events").insert({
      id: eventId,
      tenant_id: clinicIds[0],
      actor_user_id: users[1]!.id,
      event_type: "quote.created",
      record_id: randomUUID(),
      payload: {},
      occurred_at: new Date().toISOString()
    });

    expect(insertError).toBeNull();

    const { data: updated, error: updateError } = await assistant.client
      .from("clinic_events")
      .update({ payload: { overwritten: true } })
      .eq("id", eventId)
      .select("id");

    expect(updated ?? []).toEqual([]);
    expect(updateError?.code).toBe("42501");

    const { data: removed, error: deleteError } = await assistant.client
      .from("clinic_events")
      .delete()
      .eq("id", eventId)
      .select("id");

    expect(removed ?? []).toEqual([]);
    expect(deleteError?.code).toBe("42501");
  });

  it("lets the owner update auto-confirm and hides it from writes by assistants", async () => {
    const owner = await createAuthedClient(users[0]!.email);
    await verifyOwnerTotp(owner.client);
    const { error: ownerError } = await owner.client
      .from("clinics")
      .update({ auto_confirm_bookings: false })
      .eq("id", clinicIds[0]);

    expect(ownerError).toBeNull();

    const assistant = await createAuthedClient(users[1]!.email);
    const { data } = await assistant.client
      .from("clinics")
      .select("auto_confirm_bookings")
      .eq("id", clinicIds[0])
      .maybeSingle();

    expect(data?.auto_confirm_bookings).toBe(false);

    const { error: assistantError } = await assistant.client
      .from("clinics")
      .update({ auto_confirm_bookings: true })
      .eq("id", clinicIds[0]);

    expect(assistantError).toBeNull();

    const { data: after } = await owner.client
      .from("clinics")
      .select("auto_confirm_bookings")
      .eq("id", clinicIds[0])
      .maybeSingle();

    expect(after?.auto_confirm_bookings).toBe(false);
  });

  it("hides google calendar tokens from assistants and other clinics", async () => {
    const connectionId = randomUUID();
    const { error: insertError } = await admin.from("google_calendar_connections").insert({
      id: connectionId,
      tenant_id: clinicIds[0],
      encrypted_refresh_token: "cipher",
      calendar_id: "primary",
      connected_by: users[0]!.id
    });

    expect(insertError).toBeNull();

    const assistant = await createAuthedClient(users[1]!.email);
    const { data: assistantRows } = await assistant.client
      .from("google_calendar_connections")
      .select("id");

    expect(assistantRows ?? []).toEqual([]);

    const owner = await createAuthedClient(users[0]!.email);
    await verifyOwnerTotp(owner.client);
    const { data: ownerRows, error: ownerError } = await owner.client
      .from("google_calendar_connections")
      .select("id, calendar_id, booking_pages");

    expect(ownerError).toBeNull();
    expect(ownerRows?.map((row) => row.id)).toEqual([connectionId]);
    expect(ownerRows?.[0]?.booking_pages).toEqual([]);

    const { data: tokenColumn } = await owner.client
      .from("google_calendar_connections")
      .select("encrypted_refresh_token")
      .eq("id", connectionId);

    expect(tokenColumn ?? []).toEqual([]);
  });

  it("lets members read own calendar imports and hides other clinics", async () => {
    const ownId = randomUUID();
    const otherId = randomUUID();
    const { error: insertError } = await admin.from("calendar_imports").insert([
      {
        id: ownId,
        tenant_id: clinicIds[0],
        google_event_id: `evt-${ownId}`,
        attendee_name: "Pat Patient",
        starts_at: new Date().toISOString(),
        status: "unmatched"
      },
      {
        id: otherId,
        tenant_id: clinicIds[1],
        google_event_id: `evt-${otherId}`,
        attendee_name: "Other Patient",
        starts_at: new Date().toISOString(),
        status: "unmatched"
      }
    ]);

    expect(insertError).toBeNull();

    const assistant = await createAuthedClient(users[1]!.email);
    const { data, error } = await assistant.client.from("calendar_imports").select("id");

    expect(error).toBeNull();
    expect(data?.map((row) => row.id)).toEqual([ownId]);
  });
});
