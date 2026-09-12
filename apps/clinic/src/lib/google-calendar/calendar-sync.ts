import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { log } from "@/lib/logger/server";
import { clinicAppUrl } from "@/lib/server-env";
import { createAdminSupabase } from "@/lib/supabase/admin";
import {
  appointmentSetPayloadSchema,
  clinicEventRowSchema,
  reminderQueuedPayloadSchema,
  toClinicEvent,
  type ClinicEvent
} from "@/lib/sync/event-schema";

import { cancelMailTo } from "./cancel-mail";
import { guestAttendees, isGoogleBookingEvent } from "./google-booking-event";
import { readGoogleOauthState, signGoogleOauthState } from "./oauth-state";

const OAUTH_STATE_COOKIE = "karon_gcal_oauth";
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars";

type GoogleEvent = {
  id?: string;
  status?: string;
  summary?: string;
  description?: string;
  eventType?: string;
  start?: { dateTime?: string; date?: string };
  attendees?: {
    email?: string;
    displayName?: string;
    organizer?: boolean;
    self?: boolean;
  }[];
  creator?: { email?: string; displayName?: string };
};

const googleCalendarEnv = () => {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const tokenKey = process.env.GOOGLE_CALENDAR_TOKEN_KEY;

  if (!clientId || !clientSecret || !tokenKey) {
    return null;
  }

  return { clientId, clientSecret, tokenKey };
};

const googleCalendarConfigured = () => googleCalendarEnv() !== null;

const tokenKeyBytes = (tokenKey: string) => {
  if (/^[0-9a-f]{64}$/i.test(tokenKey)) {
    return Buffer.from(tokenKey, "hex");
  }

  const decoded = Buffer.from(tokenKey, "base64");

  if (decoded.length !== 32) {
    throw new Error("GOOGLE_CALENDAR_TOKEN_KEY must be 32 bytes");
  }

  return decoded;
};

const encryptToken = (plain: string, tokenKey: string) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", tokenKeyBytes(tokenKey), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
};

const decryptToken = (packed: string, tokenKey: string) => {
  const [iv, tag, encrypted] = packed.split(".");

  if (!iv || !tag || !encrypted) {
    throw new Error("Invalid token");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    tokenKeyBytes(tokenKey),
    Buffer.from(iv, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final()
  ]).toString("utf8");
};

const redirectUri = () => clinicAppUrl("/api/google-calendar/callback").toString();

const googleOAuthAuthorizeUrl = (state: string) => {
  const env = googleCalendarEnv();

  if (!env) {
    return null;
  }

  const url = new URL(AUTH_URL);
  url.searchParams.set("client_id", env.clientId);
  url.searchParams.set("redirect_uri", redirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", CALENDAR_SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);

  return url.toString();
};

const oauthCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 600,
  secure: process.env.NODE_ENV === "production"
});

const signBoundOauthState = (userId: string, tenantId: string) => {
  const env = googleCalendarEnv();

  if (!env) {
    return null;
  }

  return signGoogleOauthState({ userId, tenantId }, env.tokenKey);
};

const readBoundOauthState = (state: string) => {
  const env = googleCalendarEnv();

  if (!env) {
    return null;
  }

  return readGoogleOauthState(state, env.tokenKey);
};

const exchangeCode = async (code: string) => {
  const env = googleCalendarEnv();

  if (!env) {
    return null;
  }

  const body = new URLSearchParams({
    code,
    client_id: env.clientId,
    client_secret: env.clientSecret,
    redirect_uri: redirectUri(),
    grant_type: "authorization_code"
  });
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  if (!response.ok) {
    log.withMetadata({ status: response.status }).error("gcal.token_exchange_failed");
    return null;
  }

  const json = (await response.json()) as { refresh_token?: string };

  return json.refresh_token ?? null;
};

const refreshAccessToken = async (refreshToken: string) => {
  const env = googleCalendarEnv();

  if (!env) {
    return null;
  }

  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: env.clientId,
    client_secret: env.clientSecret,
    grant_type: "refresh_token"
  });
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  if (!response.ok) {
    log.withMetadata({ status: response.status }).error("gcal.token_refresh_failed");
    return null;
  }

  const json = (await response.json()) as { access_token?: string };

  return json.access_token ?? null;
};

const attendeeOf = (event: GoogleEvent) => {
  const guest = guestAttendees(event)[0] ?? event.attendees?.find((row) => !row.organizer);
  const email = guest?.email ?? event.creator?.email;
  const name =
    guest?.displayName ||
    event.creator?.displayName ||
    event.summary?.trim() ||
    (email ? email.split("@")[0] : "Google booking");

  return { name, email };
};

const startsAtOf = (event: GoogleEvent) =>
  event.start?.dateTime ?? (event.start?.date ? `${event.start.date}T00:00:00.000Z` : null);

const upsertImport = async (
  admin: ReturnType<typeof createAdminSupabase>,
  input: {
    tenantId: string;
    googleEventId: string;
    name: string;
    email?: string;
    startsAt: string;
    description?: string;
    cancelled: boolean;
    connectedBy: string;
  }
) => {
  const { data: existing } = await admin
    .from("calendar_imports")
    .select("id, status, visit_id")
    .eq("tenant_id", input.tenantId)
    .eq("google_event_id", input.googleEventId)
    .maybeSingle();

  if (existing && input.cancelled) {
    await admin
      .from("calendar_imports")
      .update({
        status: "cancelled_on_google",
        updated_at: new Date().toISOString()
      })
      .eq("id", existing.id);

    if (existing.visit_id && existing.status === "matched") {
      await admin.from("clinic_events").insert({
        id: crypto.randomUUID(),
        tenant_id: input.tenantId,
        actor_user_id: input.connectedBy,
        event_type: "visit.status_changed",
        record_id: existing.visit_id,
        payload: { status: "cancelled" },
        occurred_at: new Date().toISOString()
      });
    }

    return;
  }

  if (existing || input.cancelled) {
    return;
  }

  await admin.from("calendar_imports").insert({
    tenant_id: input.tenantId,
    google_event_id: input.googleEventId,
    attendee_name: input.name,
    attendee_email: input.email ?? null,
    starts_at: input.startsAt,
    description: input.description ?? null,
    status: "unmatched"
  });
};

const listGoogleEvents = async (
  accessToken: string,
  calendarId: string,
  syncToken: string | null
) => {
  const url = new URL(`${EVENTS_URL}/${encodeURIComponent(calendarId)}/events`);
  url.searchParams.set("singleEvents", "true");

  if (syncToken) {
    url.searchParams.set("syncToken", syncToken);
  } else {
    const now = new Date();
    url.searchParams.set(
      "timeMin",
      new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    );
    url.searchParams.set(
      "timeMax",
      new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()
    );
  }

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (response.status === 410) {
    return { reset: true as const, items: [] as GoogleEvent[], nextSyncToken: null };
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    let errorReason = "unknown";

    try {
      const parsed = JSON.parse(errorBody) as {
        error?: { message?: string; status?: string; errors?: { reason?: string }[] };
      };
      errorReason =
        parsed.error?.errors?.[0]?.reason ??
        parsed.error?.message ??
        parsed.error?.status ??
        "unknown";
    } catch {
      errorReason = errorBody.slice(0, 120) || "unknown";
    }

    log.withMetadata({ status: response.status, errorReason }).error("gcal.list_failed");
    return null;
  }

  const json = (await response.json()) as {
    items?: GoogleEvent[];
    nextSyncToken?: string;
  };

  return {
    reset: false as const,
    items: json.items ?? [],
    nextSyncToken: json.nextSyncToken ?? null
  };
};

const deleteCalendarEvent = async (
  accessToken: string,
  calendarId: string,
  googleEventId: string
) => {
  const response = await fetch(
    `${EVENTS_URL}/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  return response.ok || response.status === 404 || response.status === 410;
};

const accessTokenForTenant = async (tenantId: string) => {
  const env = googleCalendarEnv();
  const admin = createAdminSupabase();
  const { data: connection } = await admin
    .from("google_calendar_connections")
    .select("encrypted_refresh_token, calendar_id, sync_token, connected_by")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!env || !connection) {
    return null;
  }

  const refreshToken = decryptToken(connection.encrypted_refresh_token, env.tokenKey);
  const accessToken = await refreshAccessToken(refreshToken);

  if (!accessToken) {
    return null;
  }

  return {
    admin,
    accessToken,
    calendarId: connection.calendar_id as string,
    syncToken: (connection.sync_token as string | null) ?? null,
    connectedBy: connection.connected_by as string
  };
};

const googleEventIsLinked = async (tenantId: string, googleEventId: string) => {
  const admin = createAdminSupabase();
  const { data: imported } = await admin
    .from("calendar_imports")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("google_event_id", googleEventId)
    .maybeSingle();

  if (imported) {
    return true;
  }

  const { data: booked } = await admin
    .from("clinic_events")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("event_type", "appointment.set")
    .contains("payload", { googleEventId })
    .limit(1);

  return Boolean(booked?.length);
};

const cancelGoogleEvent = async (tenantId: string, googleEventId: string) => {
  if (!(await googleEventIsLinked(tenantId, googleEventId))) {
    return "unlinked" as const;
  }

  const session = await accessTokenForTenant(tenantId);

  if (!session) {
    return "failed" as const;
  }

  const deleted = await deleteCalendarEvent(
    session.accessToken,
    session.calendarId,
    googleEventId
  );

  if (deleted) {
    await session.admin
      .from("calendar_imports")
      .update({
        status: "cancelled_on_google",
        updated_at: new Date().toISOString()
      })
      .eq("tenant_id", tenantId)
      .eq("google_event_id", googleEventId);
  }

  return deleted ? ("deleted" as const) : ("failed" as const);
};

const pollTenant = async (tenantId: string, fullSync = false) => {
  const env = googleCalendarEnv();
  const session = await accessTokenForTenant(tenantId);

  if (!env || !session) {
    return;
  }

  let listed = await listGoogleEvents(
    session.accessToken,
    session.calendarId,
    fullSync ? null : session.syncToken
  );

  if (listed?.reset) {
    listed = await listGoogleEvents(session.accessToken, session.calendarId, null);
  }

  if (!listed) {
    return;
  }

  const nonBookingEventIds: string[] = [];

  for (const event of listed.items) {
    if (!event.id) {
      continue;
    }

    if (!isGoogleBookingEvent(event)) {
      nonBookingEventIds.push(event.id);
      continue;
    }

    const startsAt = startsAtOf(event);
    const attendee = attendeeOf(event);

    if (!startsAt && event.status !== "cancelled") {
      continue;
    }

    await upsertImport(session.admin, {
      tenantId,
      googleEventId: event.id,
      name: attendee.name,
      email: attendee.email,
      startsAt: startsAt ?? new Date().toISOString(),
      description: event.description,
      cancelled: event.status === "cancelled",
      connectedBy: session.connectedBy
    });
  }

  if (nonBookingEventIds.length > 0) {
    await session.admin
      .from("calendar_imports")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("status", "unmatched")
      .in("google_event_id", nonBookingEventIds);
  }

  if (listed.nextSyncToken) {
    await session.admin
      .from("google_calendar_connections")
      .update({
        sync_token: listed.nextSyncToken,
        updated_at: new Date().toISOString()
      })
      .eq("tenant_id", tenantId);
  }
};

const processCancelPending = async () => {
  const admin = createAdminSupabase();
  const { data: pending } = await admin
    .from("calendar_imports")
    .select("tenant_id, google_event_id, visit_id")
    .eq("status", "cancel_pending");

  for (const row of pending ?? []) {
    await cancelGoogleEvent(row.tenant_id, row.google_event_id);
  }

  const { data: matched } = await admin
    .from("calendar_imports")
    .select("tenant_id, google_event_id, visit_id")
    .eq("status", "matched")
    .not("visit_id", "is", null);

  for (const row of matched ?? []) {
    const { data: changes } = await admin
      .from("clinic_events")
      .select("payload, occurred_at")
      .eq("record_id", row.visit_id)
      .eq("event_type", "visit.status_changed")
      .order("occurred_at", { ascending: false })
      .limit(1);
    const status = changes?.[0]?.payload &&
      typeof changes[0].payload === "object" &&
      changes[0].payload !== null &&
      "status" in changes[0].payload
      ? String((changes[0].payload as { status?: string }).status)
      : null;

    if (status === "cancelled") {
      await cancelGoogleEvent(row.tenant_id, row.google_event_id);
    }
  }
};

const CLINIC_EVENT_COLUMNS =
  "id, tenant_id, actor_user_id, event_type, record_id, payload, occurred_at, received_at";

const clinicEventsFromRows = (rows: unknown[]): ClinicEvent[] =>
  rows.flatMap((row) => {
    const parsed = clinicEventRowSchema.safeParse(row);

    return parsed.success ? [toClinicEvent(parsed.data)] : [];
  });

const eventsForCancelMail = async (
  admin: ReturnType<typeof createAdminSupabase>,
  tenantId: string,
  visitId: string
) => {
  const { data: visitRows } = await admin
    .from("clinic_events")
    .select(CLINIC_EVENT_COLUMNS)
    .eq("tenant_id", tenantId)
    .eq("record_id", visitId);
  const visitEvents = clinicEventsFromRows(visitRows ?? []);
  const patientIds = [
    ...new Set(
      visitEvents.flatMap((event) => {
        if (event.type !== "appointment.set") {
          return [];
        }

        const payload = appointmentSetPayloadSchema.safeParse(event.payload);

        return payload.success ? [payload.data.patientId] : [];
      })
    )
  ];

  if (patientIds.length === 0) {
    return visitEvents;
  }

  const { data: patientRows } = await admin
    .from("clinic_events")
    .select(CLINIC_EVENT_COLUMNS)
    .eq("tenant_id", tenantId)
    .in("record_id", patientIds);

  return [...visitEvents, ...clinicEventsFromRows(patientRows ?? [])];
};

const sendQueuedCancelEmails = async () => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;

  if (!apiKey || !from) {
    return;
  }

  const admin = createAdminSupabase();
  const { data: queued } = await admin
    .from("clinic_events")
    .select("id, tenant_id, payload")
    .eq("event_type", "reminder.queued");
  const { data: sentRows } = await admin.from("reminder_sends").select("event_id");
  const sent = new Set((sentRows ?? []).map((row) => row.event_id));

  for (const event of queued ?? []) {
    if (sent.has(event.id)) {
      continue;
    }

    const payload = reminderQueuedPayloadSchema.safeParse(event.payload);

    if (!payload.success) {
      continue;
    }

    const notebook = await eventsForCancelMail(
      admin,
      event.tenant_id,
      payload.data.visitId
    );
    const to = cancelMailTo(payload.data, notebook);

    if (!to) {
      continue;
    }

    const { data: clinic } = await admin
      .from("clinics")
      .select("name")
      .eq("id", event.tenant_id)
      .maybeSingle();
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: "Your visit was cancelled",
        text: `Your appointment at ${clinic?.name ?? "the clinic"} was cancelled.`
      })
    });

    if (!response.ok) {
      log.withMetadata({ eventId: event.id }).error("mail.cancel_failed");
      continue;
    }

    await admin.from("reminder_sends").insert({ event_id: event.id });
    log.withMetadata({ eventId: event.id }).info("mail.cancel_sent");
  }
};

const storeConnection = async (tenantId: string, userId: string, refreshToken: string) => {
  const env = googleCalendarEnv();

  if (!env) {
    return false;
  }

  const admin = createAdminSupabase();
  const encrypted = encryptToken(refreshToken, env.tokenKey);
  const { data: existing } = await admin
    .from("google_calendar_connections")
    .select("id")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  const row = {
    tenant_id: tenantId,
    encrypted_refresh_token: encrypted,
    calendar_id: "primary",
    connected_by: userId,
    updated_at: new Date().toISOString()
  };
  const { error } = existing
    ? await admin.from("google_calendar_connections").update(row).eq("id", existing.id)
    : await admin.from("google_calendar_connections").insert(row);

  if (error) {
    log.withMetadata({ type: "gcal.connect" }).error("gcal.connect_store_failed");
    return false;
  }

  return true;
};

const runCalendarCron = async (options?: { fullSync?: boolean }) => {
  const admin = createAdminSupabase();
  const { data: connections } = await admin
    .from("google_calendar_connections")
    .select("tenant_id");

  for (const row of connections ?? []) {
    await pollTenant(row.tenant_id, options?.fullSync);
  }

  await processCancelPending();
  await sendQueuedCancelEmails();
};

export {
  OAUTH_STATE_COOKIE,
  cancelGoogleEvent,
  exchangeCode,
  googleCalendarConfigured,
  googleOAuthAuthorizeUrl,
  oauthCookieOptions,
  readBoundOauthState,
  runCalendarCron,
  signBoundOauthState,
  storeConnection
};
