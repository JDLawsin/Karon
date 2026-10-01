import "server-only";

import { createHmac } from "node:crypto";

import {
  heardAboutSchema,
  leadEmailHash,
  marketingLeadInputSchema,
  MarketingLeadRateLimitedError,
  normalizeLeadMobile,
  type HeardAboutInput,
  type MarketingLeadInput,
  type RateLimitKeys
} from "@karon/db";

const MAX_PAYLOAD_BYTES = 10 * 1_024;
const MINIMUM_FILL_MS = 2_000;
const FRIENDLY_ERROR = "We could not send that yet. Try again or use the contact option on this page.";

type SubmitResult = {
  created: boolean;
  id: string;
  intent: "application" | "demo";
  clinic_size: "1_chair" | "2_chairs" | "3_plus";
  name?: string;
  clinic_name?: string;
  city?: string;
};

type LeadPostDependencies = {
  now: () => Date;
  origin: string;
  rateLimitSecret: string;
  verifyTurnstile: (input: { token?: string; remoteIp?: string }) => Promise<boolean>;
  submitLead: (
    lead: MarketingLeadInput,
    keys: RateLimitKeys,
    now: Date
  ) => Promise<SubmitResult>;
  notify: (lead: { id: string; name: string; clinicName: string; city: string }) => Promise<void>;
};

type HeardAboutDependencies = {
  now: () => Date;
  origin: string;
  saveHeardAbout: (answer: HeardAboutInput, now: Date) => Promise<void>;
};

const json = (body: unknown, status: number) => Response.json(body, { status });
const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const readJson = async (request: Request) => {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_PAYLOAD_BYTES) return { tooLarge: true as const };

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_PAYLOAD_BYTES) {
    return { tooLarge: true as const };
  }

  try {
    return { tooLarge: false as const, value: JSON.parse(text) as unknown };
  } catch {
    return { tooLarge: false as const, value: null };
  }
};

const fieldErrorsOf = (issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>) =>
  issues.reduce<Record<string, string>>((errors, issue) => {
    const field = String(issue.path[0] ?? "form");
    errors[field] ??= issue.message;
    return errors;
  }, {});

const rateLimitKeys = (
  remoteIp: string,
  email: string,
  secret: string
): RateLimitKeys => {
  const ipHash = createHmac("sha256", secret).update(remoteIp).digest("hex");
  const emailHash = leadEmailHash(email);

  return {
    ip: `lead-ip:${ipHash}`,
    lead: `lead-pair:${ipHash}:${emailHash}`,
    global: "lead-global"
  };
};

const handleLeadPost = async (request: Request, dependencies: LeadPostDependencies) => {
  if (request.headers.get("origin") !== dependencies.origin) {
    return json({ error: FRIENDLY_ERROR }, 403);
  }

  const raw = await readJson(request);
  if (raw.tooLarge) return json({ error: FRIENDLY_ERROR }, 413);

  const now = dependencies.now();
  if (
    isRecord(raw.value) &&
    (typeof raw.value.website === "string" && raw.value.website.trim() !== "" ||
      typeof raw.value.renderedAt === "number" && now.getTime() - raw.value.renderedAt < MINIMUM_FILL_MS)
  ) {
    return json({ ok: true }, 200);
  }

  const parsed = marketingLeadInputSchema.safeParse(raw.value);
  if (!parsed.success) {
    return json({
      error: "Check the highlighted fields and try again.",
      fieldErrors: fieldErrorsOf(parsed.error.issues)
    }, 400);
  }

  if (parsed.data.mobile) {
    const normalized = normalizeLeadMobile(parsed.data.country, parsed.data.mobile);
    if (!normalized.valid) {
      return json({
        error: "Check the highlighted fields and try again.",
        fieldErrors: { mobile: "Enter a Philippine mobile like 0917 123 4567." }
      }, 400);
    }
  }

  const remoteIp = request.headers.get("x-vercel-forwarded-for")?.trim() || "unavailable";
  const turnstileOk = await dependencies.verifyTurnstile({
    token: parsed.data.turnstileToken,
    remoteIp
  });
  if (!turnstileOk) return json({ error: FRIENDLY_ERROR }, 400);

  try {
    const saved = await dependencies.submitLead(
      parsed.data,
      rateLimitKeys(remoteIp, parsed.data.email, dependencies.rateLimitSecret),
      now
    );
    await dependencies.notify({
      id: saved.id,
      name: saved.name ?? parsed.data.name,
      clinicName: saved.clinic_name ?? parsed.data.clinicName,
      city: saved.city ?? parsed.data.city
    });

    return json({
      submissionId: parsed.data.submissionId,
      intent: saved.intent,
      clinicSize: saved.clinic_size
    }, saved.created ? 201 : 200);
  } catch (error) {
    if (error instanceof MarketingLeadRateLimitedError) {
      return json({ error: "Too many requests. Wait a few minutes, then try again." }, 429);
    }
    return json({ error: FRIENDLY_ERROR }, 503);
  }
};

const handleHeardAboutPatch = async (
  request: Request,
  dependencies: HeardAboutDependencies
) => {
  if (request.headers.get("origin") !== dependencies.origin) {
    return json({ error: FRIENDLY_ERROR }, 403);
  }

  const raw = await readJson(request);
  if (raw.tooLarge) return json({ error: FRIENDLY_ERROR }, 413);
  const parsed = heardAboutSchema.safeParse(raw.value);

  if (!parsed.success) {
    return json({ error: "Check your answer and try again." }, 400);
  }

  try {
    await dependencies.saveHeardAbout(parsed.data, dependencies.now());
    return new Response(null, { status: 204 });
  } catch {
    return json({ error: FRIENDLY_ERROR }, 503);
  }
};

export { handleHeardAboutPatch, handleLeadPost, MAX_PAYLOAD_BYTES };
export type { HeardAboutDependencies, LeadPostDependencies };
