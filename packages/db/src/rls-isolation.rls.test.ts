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

  const ownerTotpSecrets = new Map<string, string>();
  const ownerAal2Sessions = new Map<
    string,
    { access_token: string; refresh_token: string }
  >();

  const verifyOwnerTotp = async (client: SupabaseClient) => {
    const { data: factors, error: listError } = await client.auth.mfa.listFactors();

    if (listError) {
      throw listError;
    }

    const verified = (factors.totp ?? []).find(
      (factor) => factor.status === "verified"
    );
    let factorId = verified?.id;
    const cachedSession = factorId ? ownerAal2Sessions.get(factorId) : undefined;

    if (cachedSession) {
      const { error: sessionError } = await client.auth.setSession(cachedSession);

      if (sessionError) {
        throw sessionError;
      }

      const { error: registerError } = await client.rpc("register_my_session");

      if (registerError) {
        throw registerError;
      }

      return;
    }

    let secret = factorId ? ownerTotpSecrets.get(factorId) : undefined;

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
      ownerTotpSecrets.set(factorId, secret);
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

    const { data: verifiedSession, error: verifyError } = await client.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: totp.generate()
    });

    if (verifyError || !verifiedSession) {
      throw verifyError ?? new Error("TOTP verification returned no tokens");
    }

    ownerAal2Sessions.set(factorId, verifiedSession);

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
    if (clinicIds.length > 0) {
      await admin.from("clinics").delete().in("id", clinicIds);
    }
    await Promise.all(
      users.map((user) => admin.auth.admin.deleteUser(user.id))
    );
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

  it("allows only the tenant owner to write clinic export audits", async () => {
    const assistant = await createAuthedClient(users[1]!.email);
    const { error: assistantError } = await assistant.client
      .from("audit_events")
      .insert({
        tenant_id: clinicIds[0],
        actor_user_id: users[1]!.id,
        event_type: "export.started",
        metadata: { kind: "patients", filter: "all", row_count: 1 }
      });

    expect(assistantError?.code).toBe("42501");

    const owner = await createAuthedClient(users[0]!.email);
    await verifyOwnerTotp(owner.client);
    const { data: audit, error: ownerError } = await owner.client
      .from("audit_events")
      .insert({
        tenant_id: clinicIds[0],
        actor_user_id: users[0]!.id,
        event_type: "export.completed",
        metadata: { kind: "patients", filter: "all", row_count: 1 }
      })
      .select("id, tenant_id, actor_user_id, event_type, metadata")
      .single();

    expect(ownerError).toBeNull();
    expect(audit).toMatchObject({
      tenant_id: clinicIds[0],
      actor_user_id: users[0]!.id,
      event_type: "export.completed",
      metadata: { kind: "patients", filter: "all", row_count: 1 }
    });

    const otherOwner = await createAuthedClient(users[2]!.email);
    await verifyOwnerTotp(otherOwner.client);
    const { data: otherClinicRows, error: otherClinicError } = await otherOwner.client
      .from("audit_events")
      .select("id")
      .eq("id", audit!.id);

    expect(otherClinicError).toBeNull();
    expect(otherClinicRows).toEqual([]);
  });

  it("atomically limits concurrent clinic export reservations", async () => {
    const owner = await createAuthedClient(users[0]!.email);
    await verifyOwnerTotp(owner.client);

    await admin
      .from("audit_events")
      .delete()
      .eq("tenant_id", clinicIds[0])
      .eq("actor_user_id", users[0]!.id)
      .eq("event_type", "export.started");

    try {
      const reservations = await Promise.all(
        Array.from({ length: 12 }, (_, rowCount) =>
          owner.client.rpc("reserve_clinic_export", {
            p_tenant_id: clinicIds[0],
            p_actor_user_id: users[0]!.id,
            p_kind: "patients",
            p_row_count: rowCount
          })
        )
      );

      expect(reservations.every(({ error }) => error === null)).toBe(true);
      expect(reservations.filter(({ data }) => data === true)).toHaveLength(10);
      expect(reservations.filter(({ data }) => data === false)).toHaveLength(2);

      const { count, error } = await admin
        .from("audit_events")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", clinicIds[0])
        .eq("actor_user_id", users[0]!.id)
        .eq("event_type", "export.started");

      expect(error).toBeNull();
      expect(count).toBe(10);
    } finally {
      await admin
        .from("audit_events")
        .delete()
        .eq("tenant_id", clinicIds[0])
        .eq("actor_user_id", users[0]!.id)
        .eq("event_type", "export.started");
    }
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

  it("projects patient events and hides other clinics from event and patient searches", async () => {
    const assistant = await createAuthedClient(users[1]!.email);
    const eventId = randomUUID();
    const patientId = randomUUID();
    const { error: insertError } = await assistant.client.from("clinic_events").insert({
      id: eventId,
      tenant_id: clinicIds[0],
      actor_user_id: users[1]!.id,
      event_type: "patient.created",
      record_id: patientId,
      payload: { name: "Test Patient", mobile: "09170000000" },
      occurred_at: new Date().toISOString()
    });

    expect(insertError).toBeNull();

    const otherId = randomUUID();
    const otherPatientId = randomUUID();
    const { error: otherInsertError } = await admin.from("clinic_events").insert({
      id: otherId,
      tenant_id: clinicIds[1],
      actor_user_id: users[2]!.id,
      event_type: "patient.created",
      record_id: otherPatientId,
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

    const { data: ownPatients, error: ownPatientsError } = await assistant.client
      .from("patients")
      .select("id, name, mobile")
      .eq("id", patientId);

    expect(ownPatientsError).toBeNull();
    expect(ownPatients).toEqual([
      { id: patientId, name: "Test Patient", mobile: "09170000000" }
    ]);

    const { data: projected, error: projectedError } = await assistant.client
      .from("patients")
      .select("name, mobile")
      .eq("tenant_id", clinicIds[0]);

    expect(projectedError).toBeNull();
    expect(projected).toContainEqual({
      name: "Test Patient",
      mobile: "09170000000"
    });

    const { data: hiddenPatients, error: hiddenPatientsError } = await assistant.client
      .from("patients")
      .select("id")
      .eq("tenant_id", clinicIds[1]);

    expect(hiddenPatientsError).toBeNull();
    expect(hiddenPatients).toEqual([]);

    const { error: directWriteError } = await assistant.client.from("patients").insert({
      id: randomUUID(),
      tenant_id: clinicIds[0],
      name: "Bypass Patient",
      mobile: "09172222222",
      mobile_digits: "09172222222",
      source_event_id: randomUUID(),
      source_occurred_at: new Date().toISOString()
    });

    expect(directWriteError?.code).toBe("42501");
  });

  it("lets owner and assistant append valid chart events and audits without note text", async () => {
    const owner = await createAuthedClient(users[0]!.email);
    await verifyOwnerTotp(owner.client);
    const assistant = await createAuthedClient(users[1]!.email);
    const patientId = randomUUID();
    const visitId = randomUUID();
    const events = [
      { client: owner.client, actorUserId: users[0]!.id, toothCode: "16" },
      { client: assistant.client, actorUserId: users[1]!.id, toothCode: "26" }
    ];

    for (const event of events) {
      const eventId = randomUUID();
      const recordId = randomUUID();
      const { error } = await event.client.from("clinic_events").insert({
        id: eventId,
        tenant_id: clinicIds[0],
        actor_user_id: event.actorUserId,
        event_type: "chart.appended",
        record_id: recordId,
        payload: {
          patientId,
          visitId,
          toothCode: event.toothCode,
          finding: { kind: "condition", code: "caries" },
          note: "Sensitive chart note"
        },
        occurred_at: new Date().toISOString()
      });

      expect(error).toBeNull();

      const { data: audit } = await admin
        .from("audit_events")
        .select("actor_user_id, event_type, record_id, metadata")
        .eq("record_id", recordId)
        .single();

      expect(audit).toMatchObject({
        actor_user_id: event.actorUserId,
        event_type: "chart.appended",
        record_id: recordId,
        metadata: { patient_id: patientId, visit_id: visitId, note_length: 20 }
      });
      expect(JSON.stringify(audit)).not.toContain("Sensitive chart note");
    }

    const { error: invalidError } = await assistant.client.from("clinic_events").insert({
      id: randomUUID(),
      tenant_id: clinicIds[0],
      actor_user_id: users[1]!.id,
      event_type: "chart.appended",
      record_id: randomUUID(),
      payload: {
        patientId,
        visitId,
        toothCode: "51",
        finding: { kind: "condition", code: "unknown" },
        note: "Invalid"
      },
      occurred_at: new Date().toISOString()
    });

    expect(invalidError?.code).toBe("22023");
  });

  it("lets owner and assistant create valid quotes and rejects broken totals", async () => {
    const owner = await createAuthedClient(users[0]!.email);
    await verifyOwnerTotp(owner.client);
    const assistant = await createAuthedClient(users[1]!.email);
    const patientId = randomUUID();
    const visitId = randomUUID();
    const serviceId = randomUUID();
    const serviceName = `Quote service ${suffix}`;
    const { error: serviceError } = await admin.from("clinic_services").insert({
      id: serviceId,
      tenant_id: clinicIds[0],
      name: serviceName,
      created_by: users[0]!.id,
      updated_by: users[0]!.id
    });
    const events = [
      { client: owner.client, actorUserId: users[0]!.id },
      { client: assistant.client, actorUserId: users[1]!.id }
    ];

    expect(serviceError).toBeNull();

    for (const event of events) {
      const eventId = randomUUID();
      const recordId = randomUUID();
      const row = {
        id: eventId,
        tenant_id: clinicIds[0],
        actor_user_id: event.actorUserId,
        event_type: "quote.created",
        record_id: recordId,
        payload: {
          patientId,
          visitId,
          status: "accepted",
          lines: [
            {
              serviceId,
              serviceName,
              qty: 2,
              amountMinor: 150_000,
              currency: "PHP"
            }
          ],
          totalMinor: 300_000,
          currency: "PHP"
        },
        occurred_at: new Date().toISOString()
      };
      const writes = await Promise.all([
        event.client
          .from("clinic_events")
          .upsert(row, { onConflict: "id", ignoreDuplicates: true }),
        event.client
          .from("clinic_events")
          .upsert(row, { onConflict: "id", ignoreDuplicates: true })
      ]);

      expect(writes.map(({ error }) => error)).toEqual([null, null]);

      const { data: audits } = await admin
        .from("audit_events")
        .select("actor_user_id, event_type, record_id, metadata")
        .eq("record_id", recordId);

      expect(audits).toEqual([
        expect.objectContaining({
          actor_user_id: event.actorUserId,
          event_type: "quote.created",
          record_id: recordId,
          metadata: {
            patient_id: patientId,
            visit_id: visitId,
            line_count: 1,
            currency: "PHP"
          }
        })
      ]);
      expect(JSON.stringify(audits)).not.toContain(serviceName);
      expect(JSON.stringify(audits)).not.toContain("300000");
    }

    const { error: invalidError } = await assistant.client.from("clinic_events").insert({
      id: randomUUID(),
      tenant_id: clinicIds[0],
      actor_user_id: users[1]!.id,
      event_type: "quote.created",
      record_id: randomUUID(),
      payload: {
        patientId,
        visitId,
        status: "accepted",
        lines: [
          {
            serviceId,
            serviceName,
            qty: 2,
            amountMinor: 150_000,
            currency: "PHP"
          }
        ],
        totalMinor: 1,
        currency: "PHP"
      },
      occurred_at: new Date().toISOString()
    });

    expect(invalidError?.code).toBe("22023");

    const { error: nullStatusError } = await assistant.client
      .from("clinic_events")
      .insert({
        id: randomUUID(),
        tenant_id: clinicIds[0],
        actor_user_id: users[1]!.id,
        event_type: "quote.created",
        record_id: randomUUID(),
        payload: {
          patientId,
          visitId,
          status: null,
          lines: [
            {
              serviceId,
              serviceName,
              qty: 2,
              amountMinor: 150_000,
              currency: "PHP"
            }
          ],
          totalMinor: 300_000,
          currency: "PHP"
        },
        occurred_at: new Date().toISOString()
      });

    expect(nullStatusError?.code).toBe("22023");
  });

  it("hides payment.recorded from assistants and lets the owner read it", async () => {
    const assistant = await createAuthedClient(users[1]!.email);
    const paymentId = randomUUID();
    const recordId = randomUUID();
    const patientId = randomUUID();
    const visitId = randomUUID();
    const serviceId = randomUUID();
    const serviceName = `Collect service ${suffix}`;
    const { error: serviceError } = await admin.from("clinic_services").insert({
      id: serviceId,
      tenant_id: clinicIds[0],
      name: serviceName,
      created_by: users[0]!.id,
      updated_by: users[0]!.id
    });
    const { error: quoteError } = await admin.from("clinic_events").insert({
      id: randomUUID(),
      tenant_id: clinicIds[0],
      actor_user_id: users[0]!.id,
      event_type: "quote.created",
      record_id: randomUUID(),
      payload: {
        patientId,
        visitId,
        status: "accepted",
        lines: [
          {
            serviceId,
            serviceName,
            qty: 1,
            amountMinor: 280_000,
            currency: "PHP"
          }
        ],
        totalMinor: 280_000,
        currency: "PHP"
      },
      occurred_at: new Date(Date.now() - 1_000).toISOString()
    });

    expect(serviceError).toBeNull();
    expect(quoteError).toBeNull();

    const payment = {
      id: paymentId,
      tenant_id: clinicIds[0],
      actor_user_id: users[1]!.id,
      event_type: "payment.recorded",
      record_id: recordId,
      payload: {
        patientId,
        visitId,
        amountMinor: 200_000,
        currency: "PHP",
        method: "cash"
      },
      occurred_at: new Date().toISOString()
    };
    const { error: paymentError } = await assistant.client
      .from("clinic_events")
      .insert(payment);
    const { error: duplicateError } = await assistant.client
      .from("clinic_events")
      .insert(payment);

    expect(paymentError).toBeNull();
    expect(duplicateError?.code).toBe("23505");

    const { data: balance, error: balanceError } = await assistant.client
      .rpc("get_visit_balance", {
        p_tenant_id: clinicIds[0]!,
        p_patient_id: patientId,
        p_visit_id: visitId
      })
      .single();

    expect(balanceError).toBeNull();
    expect(balance).toEqual({
      quote_id: expect.any(String),
      quote_total_minor: 280_000,
      paid_minor: 200_000,
      remaining_minor: 80_000,
      currency: "PHP"
    });

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

    const { error: unpaidError } = await assistant.client
      .from("clinic_events")
      .insert({
        ...payment,
        id: randomUUID(),
        record_id: randomUUID(),
        payload: { ...payment.payload, amountMinor: 80_000, method: "unpaid" }
      });

    expect(unpaidError).toBeNull();

    const { error: assistantCollectionsError } = await assistant.client.rpc(
      "get_owner_daily_collections",
      { p_tenant_id: clinicIds[0]!, p_day: null }
    );

    expect(assistantCollectionsError?.code).toBe("42501");

    const { data: collections, error: collectionsError } = await owner.client
      .rpc("get_owner_daily_collections", {
        p_tenant_id: clinicIds[0]!,
        p_day: null
      })
      .single();

    expect(collectionsError).toBeNull();
    expect(collections).toMatchObject({
      timezone: "Asia/Manila",
      currency: "PHP",
      payment_count: 2,
      paid_minor: 200_000,
      outstanding_minor: 80_000,
      cash_minor: 200_000
    });

    const { data: collectionsAudit } = await admin
      .from("audit_events")
      .select("actor_user_id, event_type, metadata")
      .eq("tenant_id", clinicIds[0]!)
      .eq("event_type", "collections.viewed")
      .single();

    expect(collectionsAudit).toMatchObject({
      actor_user_id: users[0]!.id,
      event_type: "collections.viewed",
      metadata: { timezone: "Asia/Manila" }
    });

    const { error: finalPaymentError } = await assistant.client
      .from("clinic_events")
      .insert({
        ...payment,
        id: randomUUID(),
        record_id: randomUUID(),
        payload: { ...payment.payload, amountMinor: 80_000, method: "card" }
      });

    expect(finalPaymentError).toBeNull();

    const { data: resolvedCollections, error: resolvedCollectionsError } =
      await owner.client
        .rpc("get_owner_daily_collections", {
          p_tenant_id: clinicIds[0]!,
          p_day: null
        })
        .single();

    expect(resolvedCollectionsError).toBeNull();
    expect(resolvedCollections).toMatchObject({
      payment_count: 3,
      paid_minor: 280_000,
      outstanding_minor: 0,
      cash_minor: 200_000,
      card_minor: 80_000
    });

    const { data: emptyDay, error: emptyDayError } = await owner.client
      .rpc("get_owner_daily_collections", {
        p_tenant_id: clinicIds[0]!,
        p_day: "2000-01-01"
      })
      .single();

    expect(emptyDayError).toBeNull();
    expect(emptyDay).toMatchObject({
      day: "2000-01-01",
      payment_count: 0,
      paid_minor: 0,
      outstanding_minor: 0
    });

    const { data: audits } = await admin
      .from("audit_events")
      .select("actor_user_id, event_type, record_id, metadata")
      .eq("record_id", recordId);

    expect(audits).toEqual([
      expect.objectContaining({
        actor_user_id: users[1]!.id,
        event_type: "payment.recorded",
        record_id: recordId,
        metadata: {
          patient_id: patientId,
          visit_id: visitId,
          method: "cash",
          currency: "PHP"
        }
      })
    ]);
    expect(JSON.stringify(audits)).not.toContain("200000");

    const otherClinicOwner = await createAuthedClient(users[2]!.email);
    const { error: crossClinicBalanceError } = await otherClinicOwner.client.rpc(
      "get_visit_balance",
      {
        p_tenant_id: clinicIds[0]!,
        p_patient_id: patientId,
        p_visit_id: visitId
      }
    );

    expect(crossClinicBalanceError?.code).toBe("42501");

    const { error: crossClinicWriteError } = await otherClinicOwner.client
      .from("clinic_events")
      .insert({
        ...payment,
        id: randomUUID(),
        actor_user_id: users[2]!.id,
        record_id: randomUUID()
      });

    expect(crossClinicWriteError?.code).toBe("42501");

    const { error: zeroCashError } = await assistant.client.from("clinic_events").insert({
      ...payment,
      id: randomUUID(),
      record_id: randomUUID(),
      payload: { ...payment.payload, amountMinor: 0 }
    });

    expect(zeroCashError?.code).toBe("22023");

    const { error: overpaymentError } = await assistant.client
      .from("clinic_events")
      .insert({
        ...payment,
        id: randomUUID(),
        record_id: randomUUID(),
        payload: { ...payment.payload, amountMinor: 80_001 }
      });

    expect(overpaymentError?.code).toBe("22023");

    const { error: extraKeyError } = await assistant.client.from("clinic_events").insert({
      ...payment,
      id: randomUUID(),
      record_id: randomUUID(),
      payload: { ...payment.payload, screenshotUrl: "https://example.test/receipt" }
    });

    expect(extraKeyError?.code).toBe("22023");
  });

  it("rejects clinic_events updates and deletes from a member JWT", async () => {
    const assistant = await createAuthedClient(users[1]!.email);
    const eventId = randomUUID();
    const { error: insertError } = await assistant.client.from("clinic_events").insert({
      id: eventId,
      tenant_id: clinicIds[0],
      actor_user_id: users[1]!.id,
      event_type: "patient.created",
      record_id: randomUUID(),
      payload: { name: "Append Only", mobile: "09173334444" },
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

  it("lets the owner update clinic settings and rejects assistants", async () => {
    const owner = await createAuthedClient(users[0]!.email);
    await verifyOwnerTotp(owner.client);
    const { error: ownerError } = await owner.client
      .from("clinics")
      .update({
        auto_confirm_bookings: false,
        locale: "en-SG",
        timezone: "Asia/Singapore"
      })
      .eq("id", clinicIds[0]);

    expect(ownerError).toBeNull();

    const assistant = await createAuthedClient(users[1]!.email);
    const { data } = await assistant.client
      .from("clinics")
      .select("auto_confirm_bookings, currency_code, locale, timezone")
      .eq("id", clinicIds[0])
      .maybeSingle();

    expect(data?.auto_confirm_bookings).toBe(false);
    expect(data).toMatchObject({
      currency_code: "PHP",
      locale: "en-SG",
      timezone: "Asia/Singapore"
    });

    const { error: historicalCurrencyError } = await owner.client
      .from("clinics")
      .update({ currency_code: "SGD" })
      .eq("id", clinicIds[0]);

    expect(historicalCurrencyError?.code).toBe("22023");

    const { error: assistantError } = await assistant.client
      .from("clinics")
      .update({ locale: "en-US" })
      .eq("id", clinicIds[0]);

    expect(assistantError?.code).toBe("42501");

    const { error: invalidTimezoneError } = await owner.client
      .from("clinics")
      .update({ timezone: "Mars/Olympus_Mons" })
      .eq("id", clinicIds[0]);

    expect(invalidTimezoneError?.code).toBe("22023");

    const { data: after } = await owner.client
      .from("clinics")
      .select("auto_confirm_bookings, locale, timezone")
      .eq("id", clinicIds[0])
      .maybeSingle();

    expect(after?.auto_confirm_bookings).toBe(false);
    expect(after).toMatchObject({ locale: "en-SG", timezone: "Asia/Singapore" });

    const { data: audit } = await admin
      .from("audit_events")
      .select("actor_user_id, event_type, metadata")
      .eq("tenant_id", clinicIds[0]!)
      .eq("event_type", "clinic.profile_updated")
      .single();

    expect(audit).toMatchObject({
      actor_user_id: users[0]!.id,
      event_type: "clinic.profile_updated",
      metadata: {
        currency_from: "PHP",
        currency_to: "PHP",
        locale_from: "en-PH",
        locale_to: "en-SG",
        timezone_from: "Asia/Manila",
        timezone_to: "Asia/Singapore"
      }
    });

    const { error: restoreError } = await owner.client
      .from("clinics")
      .update({
        locale: "en-PH",
        timezone: "Asia/Manila"
      })
      .eq("id", clinicIds[0]);

    expect(restoreError).toBeNull();
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

  it("lets assistants read services, returns 403 on writes, and lets owners manage pricing", async () => {
    const ownId = randomUUID();
    const otherId = randomUUID();
    const serviceName = `Service ${suffix}`;
    const assistant = await createAuthedClient(users[1]!.email);

    const { error: seedOtherError } = await admin.from("clinic_services").insert([
      {
        id: ownId,
        tenant_id: clinicIds[0],
        name: serviceName,
        created_by: users[0]!.id,
        updated_by: users[0]!.id
      },
      {
        id: otherId,
        tenant_id: clinicIds[1],
        name: "Other clinic service",
        created_by: users[2]!.id,
        updated_by: users[2]!.id
      }
    ]);

    expect(seedOtherError).toBeNull();

    const { data: visible, error: selectError } = await assistant.client
      .from("clinic_services")
      .select("id, name, price_minor, currency_code, duration_minutes");
    const visibleIds = visible?.map((row) => row.id) ?? [];
    const ownService = visible?.find((row) => row.id === ownId);

    expect(selectError).toBeNull();
    expect(visibleIds).toContain(ownId);
    expect(visibleIds).not.toContain(otherId);
    expect(ownService).toMatchObject({
      price_minor: null,
      currency_code: null,
      duration_minutes: null
    });

    const { error: createError } = await assistant.client.from("clinic_services").insert({
      tenant_id: clinicIds[0],
      name: `${serviceName} assistant`,
      price_minor: 100_000,
      currency_code: "PHP",
      duration_minutes: 30,
      created_by: users[1]!.id,
      updated_by: users[1]!.id
    });

    expect(createError?.code).toBe("42501");

    const { error: updateError } = await assistant.client
      .from("clinic_services")
      .update({
        price_minor: 150_000,
        currency_code: "PHP",
        duration_minutes: 45,
        updated_by: users[1]!.id
      })
      .eq("id", ownId)
      .select("id");

    expect(updateError?.code).toBe("42501");

    const { error: deleteError } = await assistant.client
      .from("clinic_services")
      .delete()
      .eq("id", ownId)
      .select("id");

    expect(deleteError?.code).toBe("42501");

    const owner = await createAuthedClient(users[0]!.email);
    await verifyOwnerTotp(owner.client);

    const { data: priced, error: ownerUpdateError } = await owner.client
      .from("clinic_services")
      .update({
        price_minor: 150_000,
        currency_code: "PHP",
        duration_minutes: 45,
        updated_by: users[0]!.id
      })
      .eq("id", ownId)
      .select("price_minor, currency_code, duration_minutes")
      .single();

    expect(ownerUpdateError).toBeNull();
    expect(priced).toEqual({
      price_minor: 150_000,
      currency_code: "PHP",
      duration_minutes: 45
    });

    const { error: negativePriceError } = await owner.client
      .from("clinic_services")
      .update({ price_minor: -1, updated_by: users[0]!.id })
      .eq("id", ownId);

    expect(negativePriceError?.code).toBe("23514");

    const { error: invalidDurationError } = await owner.client
      .from("clinic_services")
      .update({ duration_minutes: 0, updated_by: users[0]!.id })
      .eq("id", ownId);

    expect(invalidDurationError?.code).toBe("23514");

    const { error: invalidCurrencyError } = await owner.client
      .from("clinic_services")
      .update({
        price_minor: 160_000,
        currency_code: "USD",
        updated_by: users[0]!.id
      })
      .eq("id", ownId);

    expect(invalidCurrencyError?.code).toBe("22023");

    const { error: malformedClinicCurrencyError } = await owner.client
      .from("clinics")
      .update({ currency_code: "php" })
      .eq("id", clinicIds[0]);

    expect(malformedClinicCurrencyError?.code).toBe("22023");

    const { error: clinicCurrencyUpdateError } = await owner.client
      .from("clinics")
      .update({ currency_code: "USD" })
      .eq("id", clinicIds[0]);

    expect(clinicCurrencyUpdateError?.code).toBe("22023");

    const { data: historical, error: durationUpdateError } = await owner.client
      .from("clinic_services")
      .update({ duration_minutes: 60, updated_by: users[0]!.id })
      .eq("id", ownId)
      .select("currency_code, duration_minutes")
      .single();

    expect(durationUpdateError).toBeNull();
    expect(historical).toEqual({ currency_code: "PHP", duration_minutes: 60 });

    const { error: ownerDeleteError } = await owner.client
      .from("clinic_services")
      .delete()
      .eq("id", ownId);

    expect(ownerDeleteError).toBeNull();
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

  it("keeps patient import jobs and staging objects owner-only and tenant-scoped", async () => {
    const ownerA = await createAuthedClient(users[0]!.email);
    await verifyOwnerTotp(ownerA.client);
    const ownerB = await createAuthedClient(users[2]!.email);
    await verifyOwnerTotp(ownerB.client);
    const assistant = await createAuthedClient(users[1]!.email);
    const jobId = randomUUID();
    const path = `${clinicIds[0]}/${jobId}/source.csv`;
    const { error: insertError } = await ownerA.client
      .from("patient_import_jobs")
      .insert({
        id: jobId,
        tenant_id: clinicIds[0],
        created_by: users[0]!.id,
        file_name: "patients.csv",
        storage_path: path,
        content_type: "text/csv",
        file_size: 24
      });

    expect(insertError).toBeNull();

    const { data: assistantRows, error: assistantReadError } = await assistant.client
      .from("patient_import_jobs")
      .select("id");
    const { data: otherRows, error: otherReadError } = await ownerB.client
      .from("patient_import_jobs")
      .select("id");

    expect(assistantReadError).toBeNull();
    expect(assistantRows).toEqual([]);
    expect(otherReadError).toBeNull();
    expect(otherRows).toEqual([]);

    const blockedJobId = randomUUID();
    const { error: assistantInsertError } = await assistant.client
      .from("patient_import_jobs")
      .insert({
        id: blockedJobId,
        tenant_id: clinicIds[0],
        created_by: users[1]!.id,
        file_name: "blocked.csv",
        storage_path: `${clinicIds[0]}/${blockedJobId}/source.csv`,
        content_type: "text/csv",
        file_size: 10
      });
    expect(assistantInsertError).toBeTruthy();

    const { data: signed, error: signedError } = await ownerA.client.storage
      .from("patient-import-staging")
      .createSignedUploadUrl(path);
    expect(signedError).toBeNull();
    expect(signed?.token).toBeTruthy();

    const { error: uploadError } = await ownerA.client.storage
      .from("patient-import-staging")
      .uploadToSignedUrl(
        path,
        signed!.token,
        new Blob(["Name,Mobile\nMae,09171234567"], { type: "text/csv" })
      );
    expect(uploadError).toBeNull();

    const { error: assistantDownloadError } = await assistant.client.storage
      .from("patient-import-staging")
      .download(path);
    const { error: otherDownloadError } = await ownerB.client.storage
      .from("patient-import-staging")
      .download(path);
    expect(assistantDownloadError).toBeTruthy();
    expect(otherDownloadError).toBeTruthy();

    const { error: removeError } = await ownerA.client.storage
      .from("patient-import-staging")
      .remove([path]);
    expect(removeError).toBeNull();

    const completedAt = new Date().toISOString();
    const { error: completeError } = await ownerA.client
      .from("patient_import_jobs")
      .update({
        status: "completed",
        total_rows: 1,
        imported_rows: 1,
        object_deleted_at: completedAt,
        completed_at: completedAt,
        updated_at: completedAt
      })
      .eq("id", jobId);
    expect(completeError).toBeNull();

    const { data: audits, error: auditError } = await admin
      .from("audit_events")
      .select("event_type, metadata")
      .eq("record_id", jobId)
      .order("created_at");
    expect(auditError).toBeNull();
    expect(audits).toEqual([
      {
        event_type: "import.started",
        metadata: { format: "csv", bytes: 24, ttl_hours: 24 }
      },
      {
        event_type: "import.completed",
        metadata: {
          total: 1,
          imported: 1,
          failed: 0,
          skipped: 0,
          raw_file_deleted: true
        }
      }
    ]);
  });

  it("allows only an owner to attach an audited opening balance note", async () => {
    const owner = await createAuthedClient(users[0]!.email);
    await verifyOwnerTotp(owner.client);
    const assistant = await createAuthedClient(users[1]!.email);
    const patientId = randomUUID();
    const patientEventId = randomUUID();
    const { error: patientError } = await owner.client.from("clinic_events").insert({
      id: patientEventId,
      tenant_id: clinicIds[0],
      actor_user_id: users[0]!.id,
      event_type: "patient.created",
      record_id: patientId,
      payload: { name: "Opening Balance Test", mobile: "09170000015" },
      occurred_at: new Date().toISOString()
    });
    expect(patientError).toBeNull();

    const assistantEventId = randomUUID();
    const { error: assistantError } = await assistant.client.from("clinic_events").insert({
      id: assistantEventId,
      tenant_id: clinicIds[0],
      actor_user_id: users[1]!.id,
      event_type: "opening_balance.noted",
      record_id: patientId,
      payload: {
        patientId,
        amountMinor: 80_000,
        currency: "PHP",
        note: "Should be denied"
      },
      occurred_at: new Date().toISOString()
    });
    expect(assistantError?.code).toBe("42501");

    const openingBalanceEventId = randomUUID();
    const { error: ownerError } = await owner.client.from("clinic_events").insert({
      id: openingBalanceEventId,
      tenant_id: clinicIds[0],
      actor_user_id: users[0]!.id,
      event_type: "opening_balance.noted",
      record_id: patientId,
      payload: {
        patientId,
        amountMinor: 80_000,
        currency: "PHP",
        note: "Starting amount from old system"
      },
      occurred_at: new Date().toISOString()
    });
    expect(ownerError).toBeNull();

    const { data: audits, error: auditError } = await admin
      .from("audit_events")
      .select("event_type, metadata")
      .eq("record_id", patientId)
      .eq("event_type", "opening_balance.noted");
    expect(auditError).toBeNull();
    expect(audits).toEqual([{
      event_type: "opening_balance.noted",
      metadata: { patient_id: patientId, currency: "PHP" }
    }]);
  });

  it("keeps service import jobs and staging objects owner-only and tenant-scoped", async () => {
    const ownerA = await createAuthedClient(users[0]!.email);
    await verifyOwnerTotp(ownerA.client);
    const ownerB = await createAuthedClient(users[2]!.email);
    await verifyOwnerTotp(ownerB.client);
    const assistant = await createAuthedClient(users[1]!.email);
    const jobId = randomUUID();
    const path = `${clinicIds[0]}/${jobId}/source.csv`;
    const { error: insertError } = await ownerA.client
      .from("service_import_jobs")
      .insert({
        id: jobId,
        tenant_id: clinicIds[0],
        created_by: users[0]!.id,
        file_name: "services.csv",
        storage_path: path,
        content_type: "text/csv",
        file_size: 40
      });
    expect(insertError).toBeNull();

    const { data: assistantRows } = await assistant.client
      .from("service_import_jobs")
      .select("id");
    const { data: otherRows } = await ownerB.client
      .from("service_import_jobs")
      .select("id");
    expect(assistantRows).toEqual([]);
    expect(otherRows).toEqual([]);

    const blockedId = randomUUID();
    const { error: assistantInsertError } = await assistant.client
      .from("service_import_jobs")
      .insert({
        id: blockedId,
        tenant_id: clinicIds[0],
        created_by: users[1]!.id,
        file_name: "blocked.csv",
        storage_path: `${clinicIds[0]}/${blockedId}/source.csv`,
        content_type: "text/csv",
        file_size: 10
      });
    expect(assistantInsertError).toBeTruthy();

    const { data: signed, error: signedError } = await ownerA.client.storage
      .from("service-import-staging")
      .createSignedUploadUrl(path);
    expect(signedError).toBeNull();
    const { error: uploadError } = await ownerA.client.storage
      .from("service-import-staging")
      .uploadToSignedUrl(
        path,
        signed!.token,
        new Blob(["Name,Price,Duration\nCleaning,1500,45"], { type: "text/csv" })
      );
    expect(uploadError).toBeNull();
    expect(
      (await assistant.client.storage.from("service-import-staging").download(path))
        .error
    ).toBeTruthy();
    expect(
      (await ownerB.client.storage.from("service-import-staging").download(path)).error
    ).toBeTruthy();

    expect(
      (await ownerA.client.storage.from("service-import-staging").remove([path])).error
    ).toBeNull();
    const completedAt = new Date().toISOString();
    expect(
      (
        await ownerA.client
          .from("service_import_jobs")
          .update({
            status: "completed",
            total_rows: 1,
            imported_rows: 1,
            object_deleted_at: completedAt,
            completed_at: completedAt,
            updated_at: completedAt
          })
          .eq("id", jobId)
      ).error
    ).toBeNull();

    const { data: audits } = await admin
      .from("audit_events")
      .select("event_type, metadata")
      .eq("record_id", jobId)
      .order("created_at");
    expect(audits).toEqual([
      {
        event_type: "import.started",
        metadata: {
          kind: "services",
          format: "csv",
          bytes: 40,
          ttl_hours: 24
        }
      },
      {
        event_type: "import.completed",
        metadata: {
          kind: "services",
          total: 1,
          imported: 1,
          failed: 0,
          removed: 0,
          raw_file_deleted: true
        }
      }
    ]);
  }, 15_000);

  it("persists migration checklists per clinic and audits only counts", async () => {
    const ownerA = await createAuthedClient(users[0]!.email);
    await verifyOwnerTotp(ownerA.client);
    const ownerB = await createAuthedClient(users[2]!.email);
    await verifyOwnerTotp(ownerB.client);
    const assistant = await createAuthedClient(users[1]!.email);
    const completedItems = ["export_old_system", "backup_created"];

    const { error: saveError } = await ownerA.client
      .from("migration_checklists")
      .upsert({
        tenant_id: clinicIds[0],
        completed_items: completedItems,
        updated_by: users[0]!.id
      });
    expect(saveError).toBeNull();

    const { data: ownRows } = await ownerA.client
      .from("migration_checklists")
      .select("tenant_id, completed_items");
    const { data: otherRows } = await ownerB.client
      .from("migration_checklists")
      .select("tenant_id");
    const { data: assistantRows } = await assistant.client
      .from("migration_checklists")
      .select("tenant_id");
    expect(ownRows).toEqual([
      { tenant_id: clinicIds[0], completed_items: completedItems }
    ]);
    expect(otherRows).toEqual([]);
    expect(assistantRows).toEqual([]);

    const { error: assistantSaveError } = await assistant.client
      .from("migration_checklists")
      .upsert({
        tenant_id: clinicIds[0],
        completed_items: ["patients_imported"],
        updated_by: users[1]!.id
      });
    expect(assistantSaveError).toBeTruthy();

    const { error: invalidItemError } = await ownerA.client
      .from("migration_checklists")
      .update({ completed_items: ["raw_patient_name"] })
      .eq("tenant_id", clinicIds[0]);
    expect(invalidItemError).toBeTruthy();

    const { error: duplicateItemError } = await ownerA.client
      .from("migration_checklists")
      .update({ completed_items: ["patients_imported", "patients_imported"] })
      .eq("tenant_id", clinicIds[0]);
    expect(duplicateItemError).toBeTruthy();

    const { data: audits, error: auditError } = await admin
      .from("audit_events")
      .select("event_type, metadata")
      .eq("record_id", clinicIds[0])
      .eq("event_type", "import.checklist_updated");
    expect(auditError).toBeNull();
    expect(audits).toEqual([
      {
        event_type: "import.checklist_updated",
        metadata: { completed_count: 2, total_count: 8 }
      }
    ]);
  });

  it("expires trials on the server and restores access with manual grace", async () => {
    const owner = await createAuthedClient(users[0]!.email);
    await verifyOwnerTotp(owner.client);
    const assistant = await createAuthedClient(users[1]!.email);
    const expiredStart = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const graceStart = new Date().toISOString();
    const graceEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    try {
      const { error: expireError } = await admin
        .from("clinics")
        .update({ trial_started_at: expiredStart })
        .eq("id", clinicIds[0]);
      expect(expireError).toBeNull();

      const { data: expiredRows, error: entitlementError } = await owner.client.rpc(
        "current_entitlement"
      );
      expect(entitlementError).toBeNull();
      expect(expiredRows).toEqual([
        expect.objectContaining({
          status: "expired",
          source: "trial",
          days_remaining: 0,
          has_access: false
        })
      ]);

      const blockedEventId = randomUUID();
      const { error: blockedWriteError } = await owner.client
        .from("clinic_events")
        .insert({
          id: blockedEventId,
          tenant_id: clinicIds[0],
          actor_user_id: users[0]!.id,
          event_type: "patient.created",
          record_id: randomUUID(),
          payload: { name: "Expired Trial", mobile: "09170000016" },
          occurred_at: new Date().toISOString()
        });
      expect(blockedWriteError?.code).toBe("42501");

      const { error: directReadError } = await owner.client
        .from("clinic_entitlements")
        .select("tenant_id");
      expect(directReadError?.code).toBe("42501");

      const { error: graceError } = await admin.from("clinic_entitlements").insert({
        tenant_id: clinicIds[0],
        status: "active",
        source: "manual",
        starts_at: graceStart,
        access_until: graceEnd
      });
      expect(graceError).toBeNull();

      const { data: restoredRows, error: restoredError } = await assistant.client.rpc(
        "current_entitlement"
      );
      expect(restoredError).toBeNull();
      expect(restoredRows).toEqual([
        expect.objectContaining({
          status: "active",
          source: "manual",
          has_access: true
        })
      ]);

      const restoredEventId = randomUUID();
      const { error: restoredWriteError } = await assistant.client
        .from("clinic_events")
        .insert({
          id: restoredEventId,
          tenant_id: clinicIds[0],
          actor_user_id: users[1]!.id,
          event_type: "patient.created",
          record_id: randomUUID(),
          payload: { name: "Restored Trial", mobile: "09170000017" },
          occurred_at: new Date().toISOString()
        });
      expect(restoredWriteError).toBeNull();

      const { error: forgedAuditError } = await assistant.client
        .from("audit_events")
        .insert({
          tenant_id: clinicIds[0],
          actor_user_id: users[1]!.id,
          event_type: "entitlement.grace_granted",
          record_id: clinicIds[0],
          metadata: {}
        });
      expect(forgedAuditError?.code).toBe("42501");

      const { data: audits, error: auditError } = await admin
        .from("audit_events")
        .select("event_type")
        .eq("tenant_id", clinicIds[0])
        .in("event_type", [
          "entitlement.trial_expired",
          "entitlement.grace_granted"
        ]);
      expect(auditError).toBeNull();
      expect(audits?.map(({ event_type }) => event_type).sort()).toEqual([
        "entitlement.grace_granted",
        "entitlement.trial_expired"
      ]);
    } finally {
      await admin
        .from("clinic_entitlements")
        .delete()
        .eq("tenant_id", clinicIds[0]);
      await admin
        .from("clinics")
        .update({ trial_started_at: new Date().toISOString() })
        .eq("id", clinicIds[0]);
    }
  });

  it("isolates billing ledgers and applies idempotent payment transitions", async () => {
    const owner = await createAuthedClient(users[0]!.email);
    await verifyOwnerTotp(owner.client);
    const assistant = await createAuthedClient(users[1]!.email);
    const originalTrialStart = new Date().toISOString();
    const expiredTrialStart = new Date(
      Date.now() - 8 * 24 * 60 * 60 * 1000
    ).toISOString();
    const checkoutIds: string[] = [];

    const reserveCheckout = async () => {
      const { data, error } = await admin.rpc("reserve_billing_checkout", {
        p_tenant_id: clinicIds[0],
        p_actor_user_id: users[0]!.id,
        p_provider: "paymongo",
        p_interval: "monthly",
        p_amount_minor: 69_900,
        p_currency_code: "PHP",
        p_livemode: false
      });

      expect(error).toBeNull();
      expect(data).toEqual(expect.any(String));
      checkoutIds.push(data as string);
      return data as string;
    };

    try {
      const { error: expireError } = await admin
        .from("clinics")
        .update({ trial_started_at: expiredTrialStart })
        .eq("id", clinicIds[0]);
      expect(expireError).toBeNull();

      const { error: ownerLedgerError } = await owner.client
        .from("billing_checkout_sessions")
        .select("id");
      const { error: assistantLedgerError } = await assistant.client
        .from("billing_webhook_events")
        .select("provider_event_id");
      expect(ownerLedgerError?.code).toBe("42501");
      expect(assistantLedgerError?.code).toBe("42501");

      const { error: directRpcError } = await owner.client.rpc(
        "reserve_billing_checkout",
        {
          p_tenant_id: clinicIds[0],
          p_actor_user_id: users[0]!.id,
          p_provider: "paymongo",
          p_interval: "monthly",
          p_amount_minor: 69_900,
          p_currency_code: "PHP",
          p_livemode: false
        }
      );
      expect(directRpcError?.code).toBe("42501");

      const paidCheckoutId = await reserveCheckout();
      const providerCheckoutId = `cs_${suffix}_paid`;
      const { data: completed, error: completeError } = await admin.rpc(
        "complete_billing_checkout",
        {
          p_checkout_id: paidCheckoutId,
          p_provider_checkout_id: providerCheckoutId
        }
      );
      expect(completeError).toBeNull();
      expect(completed).toBe(true);

      const paidEventId = `evt_${suffix}_paid`;
      const paidAt = new Date().toISOString();
      const paidPayloadHash = createHash("sha256")
        .update(paidEventId)
        .digest("hex");
      const paidWebhook = {
        p_provider: "paymongo",
        p_provider_event_id: paidEventId,
        p_event_type: "checkout_session.payment.paid",
        p_event_kind: "payment_succeeded",
        p_checkout_id: paidCheckoutId,
        p_provider_checkout_id: providerCheckoutId,
        p_livemode: false,
        p_amount_minor: 69_900,
        p_currency_code: "PHP",
        p_provider_occurred_at: paidAt,
        p_payload_sha256: paidPayloadHash,
        p_access_until: null
      };
      const { data: paidResult, error: paidError } = await admin.rpc(
        "apply_billing_webhook",
        paidWebhook
      );
      expect(paidError).toBeNull();
      expect(paidResult).toBe("processed");

      const { data: duplicateResult, error: duplicateError } = await admin.rpc(
        "apply_billing_webhook",
        paidWebhook
      );
      expect(duplicateError).toBeNull();
      expect(duplicateResult).toBe("duplicate");

      const { data: activeEntitlement, error: entitlementError } =
        await owner.client.rpc("current_entitlement");
      expect(entitlementError).toBeNull();
      expect(activeEntitlement).toEqual([
        expect.objectContaining({
          status: "active",
          source: "billing",
          has_access: true
        })
      ]);

      const { data: paidAudits, error: paidAuditError } = await admin
        .from("audit_events")
        .select("event_type")
        .eq("record_id", paidCheckoutId)
        .in("event_type", [
          "billing.checkout_started",
          "billing.payment_succeeded",
          "entitlement.restored"
        ]);
      expect(paidAuditError).toBeNull();
      expect(paidAudits?.map(({ event_type }) => event_type).sort()).toEqual([
        "billing.checkout_started",
        "billing.payment_succeeded",
        "entitlement.restored"
      ]);

      const pastStart = new Date(
        Date.now() - 32 * 24 * 60 * 60 * 1000
      ).toISOString();
      const pastEnd = new Date(
        Date.now() - 24 * 60 * 60 * 1000
      ).toISOString();
      const { error: lapseError } = await admin
        .from("clinic_entitlements")
        .update({ starts_at: pastStart, access_until: pastEnd })
        .eq("tenant_id", clinicIds[0]);
      expect(lapseError).toBeNull();

      const failedCheckoutId = await reserveCheckout();
      const failedProviderCheckoutId = `cs_${suffix}_failed`;
      const { error: failedCompleteError } = await admin.rpc(
        "complete_billing_checkout",
        {
          p_checkout_id: failedCheckoutId,
          p_provider_checkout_id: failedProviderCheckoutId
        }
      );
      expect(failedCompleteError).toBeNull();

      const failedEventId = `evt_${suffix}_failed`;
      const failedWebhook = {
        p_provider: "paymongo",
        p_provider_event_id: failedEventId,
        p_event_type: "payment.failed",
        p_event_kind: "payment_failed",
        p_checkout_id: failedCheckoutId,
        p_provider_checkout_id: failedProviderCheckoutId,
        p_livemode: false,
        p_amount_minor: null,
        p_currency_code: null,
        p_provider_occurred_at: new Date().toISOString(),
        p_payload_sha256: createHash("sha256")
          .update(failedEventId)
          .digest("hex"),
        p_access_until: null
      };
      const { data: failedResult, error: failedError } = await admin.rpc(
        "apply_billing_webhook",
        failedWebhook
      );
      expect(failedError).toBeNull();
      expect(failedResult).toBe("processed");

      const { data: graceRows, error: graceError } = await assistant.client.rpc(
        "current_entitlement"
      );
      expect(graceError).toBeNull();
      expect(graceRows).toEqual([
        expect.objectContaining({
          status: "past_due",
          source: "billing",
          has_access: true
        })
      ]);

      const { data: graceBeforeReplay } = await admin
        .from("clinic_entitlements")
        .select("access_until")
        .eq("tenant_id", clinicIds[0])
        .single();
      const { data: failedReplay, error: failedReplayError } = await admin.rpc(
        "apply_billing_webhook",
        failedWebhook
      );
      const { data: graceAfterReplay } = await admin
        .from("clinic_entitlements")
        .select("access_until")
        .eq("tenant_id", clinicIds[0])
        .single();
      expect(failedReplayError).toBeNull();
      expect(failedReplay).toBe("duplicate");
      expect(graceAfterReplay?.access_until).toBe(
        graceBeforeReplay?.access_until
      );

      await reserveCheckout();
      await reserveCheckout();
      await reserveCheckout();
      const { error: rateLimitError } = await admin.rpc(
        "reserve_billing_checkout",
        {
          p_tenant_id: clinicIds[0],
          p_actor_user_id: users[0]!.id,
          p_provider: "paymongo",
          p_interval: "monthly",
          p_amount_minor: 69_900,
          p_currency_code: "PHP",
          p_livemode: false
        }
      );
      expect(rateLimitError?.message).toContain("billing checkout rate limited");
    } finally {
      await admin
        .from("clinic_entitlements")
        .delete()
        .eq("tenant_id", clinicIds[0]);
      if (checkoutIds.length > 0) {
        await admin
          .from("billing_webhook_events")
          .delete()
          .in("checkout_id", checkoutIds);
        await admin.from("audit_events").delete().in("record_id", checkoutIds);
        await admin.from("billing_checkout_sessions").delete().in("id", checkoutIds);
      }
      await admin
        .from("clinics")
        .update({ trial_started_at: originalTrialStart })
        .eq("id", clinicIds[0]);
    }
  }, 20_000);

  it("serializes concurrent payments and never shortens manual access", async () => {
    const checkoutIds: string[] = [];
    const startsAt = new Date().toISOString();
    const manualEnd = new Date(
      Date.now() + 60 * 24 * 60 * 60 * 1000
    ).toISOString();

    try {
      const { error: manualError } = await admin
        .from("clinic_entitlements")
        .insert({
          tenant_id: clinicIds[1],
          status: "active",
          source: "manual",
          starts_at: startsAt,
          access_until: manualEnd
        });
      expect(manualError).toBeNull();

      for (const index of [1, 2]) {
        const { data: checkoutId, error: reserveError } = await admin.rpc(
          "reserve_billing_checkout",
          {
            p_tenant_id: clinicIds[1],
            p_actor_user_id: users[2]!.id,
            p_provider: "paymongo",
            p_interval: "monthly",
            p_amount_minor: 69_900,
            p_currency_code: "PHP",
            p_livemode: false
          }
        );
        expect(reserveError).toBeNull();
        checkoutIds.push(checkoutId as string);

        const { error: completeError } = await admin.rpc(
          "complete_billing_checkout",
          {
            p_checkout_id: checkoutId,
            p_provider_checkout_id: `cs_${suffix}_concurrent_${index}`
          }
        );
        expect(completeError).toBeNull();
      }

      const results = await Promise.all(
        checkoutIds.map((checkoutId, index) => {
          const eventId = `evt_${suffix}_concurrent_${index + 1}`;

          return admin.rpc("apply_billing_webhook", {
            p_provider: "paymongo",
            p_provider_event_id: eventId,
            p_event_type: "checkout_session.payment.paid",
            p_event_kind: "payment_succeeded",
            p_checkout_id: checkoutId,
            p_provider_checkout_id: `cs_${suffix}_concurrent_${index + 1}`,
            p_livemode: false,
            p_amount_minor: 69_900,
            p_currency_code: "PHP",
            p_provider_occurred_at: new Date().toISOString(),
            p_payload_sha256: createHash("sha256").update(eventId).digest("hex"),
            p_access_until: null
          });
        })
      );
      expect(results.map(({ data }) => data)).toEqual([
        "processed",
        "processed"
      ]);
      expect(results.every(({ error }) => error === null)).toBe(true);

      const { data: entitlement, error: entitlementError } = await admin
        .from("clinic_entitlements")
        .select("source, provider, access_until")
        .eq("tenant_id", clinicIds[1])
        .single();
      expect(entitlementError).toBeNull();
      expect(entitlement).toEqual(
        expect.objectContaining({ source: "billing", provider: "paymongo" })
      );
      expect(new Date(entitlement!.access_until).getTime()).toBeGreaterThan(
        Date.now() + 110 * 24 * 60 * 60 * 1000
      );
    } finally {
      await admin
        .from("clinic_entitlements")
        .delete()
        .eq("tenant_id", clinicIds[1]);
      if (checkoutIds.length > 0) {
        await admin
          .from("billing_webhook_events")
          .delete()
          .in("checkout_id", checkoutIds);
        await admin.from("audit_events").delete().in("record_id", checkoutIds);
        await admin.from("billing_checkout_sessions").delete().in("id", checkoutIds);
      }
      await admin
        .from("audit_events")
        .delete()
        .eq("record_id", clinicIds[1])
        .eq("event_type", "entitlement.grace_granted");
    }
  }, 20_000);

});
