import "server-only";

import { createHash } from "node:crypto";

import postgres from "postgres";
import { z } from "zod";

const optionalText = (maximum: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(maximum).optional()
  );

const optionalRawText = (maximum: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().max(maximum).optional()
  );

const intentSchema = z.preprocess(
  (value) => (value === "demo" ? "demo" : "application"),
  z.enum(["application", "demo"])
);

const attributionSchema = z
  .object({
    utmSource: optionalText(100).transform((value) => value?.toLowerCase()),
    utmMedium: optionalText(100).transform((value) => value?.toLowerCase()),
    utmCampaign: optionalText(100).transform((value) => value?.toLowerCase()),
    utmTerm: optionalText(100).transform((value) => value?.toLowerCase()),
    utmContent: optionalText(100).transform((value) => value?.toLowerCase()),
    landingPath: optionalText(200).refine(
      (value) => value === undefined || (value.startsWith("/") && !value.includes("?")),
      "Landing path must not include a query string."
    ),
    referrerDomain: optionalText(253).transform((value) => value?.toLowerCase())
  })
  .strict();

const marketingLeadInputSchema = z
  .object({
    submissionId: z.uuid(),
    intent: intentSchema,
    name: z.string().trim().min(1, "Enter your name.").max(100),
    clinicName: z.string().trim().min(1, "Enter your clinic name.").max(120),
    country: z.string().trim().length(2).transform((value) => value.toUpperCase()),
    province: optionalText(100),
    city: z.string().trim().min(1, "Enter your city or municipality.").max(100),
    email: z.email("Enter a valid email address.").max(254).transform((value) => value.toLowerCase()),
    clinicSize: z.enum(["1_chair", "2_chairs", "3_plus"]),
    role: z.enum([
      "owner_dentist",
      "associate_dentist",
      "clinic_manager",
      "assistant_front_desk",
      "other"
    ]),
    mobile: optionalRawText(40),
    preferredTime: z
      .enum(["weekday_morning", "weekday_lunch", "weekday_evening", "saturday"])
      .optional(),
    message: optionalText(500),
    privacyAcknowledged: z.literal(true, { error: "Acknowledge the privacy notice." }),
    marketingOptIn: z.boolean(),
    privacyNoticeVersion: z.string().trim().min(1).max(40),
    marketingWordingVersion: z.string().trim().min(1).max(40),
    sourcePage: z.literal("/demo"),
    renderedAt: z.number().int().positive(),
    turnstileToken: optionalText(2_048),
    website: z.string().max(200),
    attribution: attributionSchema
  })
  .strict()
  .transform((lead) => {
    if (lead.intent === "demo") return lead;
    const application = { ...lead };
    delete application.preferredTime;
    return application;
  });

const heardAboutSchema = z
  .object({
    submissionId: z.uuid(),
    source: z.enum([
      "search",
      "facebook",
      "colleague",
      "dental_group",
      "event",
      "other"
    ]),
    other: optionalText(100)
  })
  .strict()
  .superRefine((answer, context) => {
    if (answer.source === "other" && !answer.other) {
      context.addIssue({ code: "custom", message: "Enter a short answer.", path: ["other"] });
    }
  });

const marketingLeadSchemaColumns = [
  "id",
  "submission_id",
  "intent",
  "name",
  "clinic_name",
  "country_code",
  "province",
  "city",
  "email",
  "clinic_size",
  "role",
  "mobile",
  "mobile_country_code",
  "preferred_time",
  "message",
  "privacy_acknowledged_at",
  "privacy_notice_version",
  "marketing_opt_in",
  "marketing_opt_in_at",
  "marketing_purpose",
  "marketing_wording_version",
  "marketing_source_page",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "landing_path",
  "referrer_domain",
  "heard_about_source",
  "heard_about_other",
  "status",
  "created_at",
  "updated_at"
] as const;

const normalizeLeadMobile = (country: string, value: string) => {
  if (country !== "PH") return { mobile: value, valid: true };

  const compact = value.replace(/[\s-]/gu, "");
  const local = compact.startsWith("+63")
    ? compact.slice(3)
    : compact.startsWith("0")
      ? compact.slice(1)
      : compact;
  const valid = /^9\d{9}$/u.test(local);

  return { mobile: valid ? `+63${local}` : value, valid };
};

type MarketingLeadInput = z.infer<typeof marketingLeadInputSchema>;
type HeardAboutInput = z.infer<typeof heardAboutSchema>;
type RateLimitKeys = { ip: string; lead: string; global: string };

class MarketingLeadRateLimitedError extends Error {}

const createMarketingLeadStore = (databaseUrl: string) => {
  const connection = postgres(databaseUrl, { max: 4, prepare: false });

  const submit = async (
    lead: MarketingLeadInput,
    keys: RateLimitKeys,
    now: Date
  ) => connection.begin(async (transaction) => {
    await transaction.unsafe("set local role service_role");

    const existing = await transaction<{
      id: string;
      intent: "application" | "demo";
      clinic_size: "1_chair" | "2_chairs" | "3_plus";
      name: string;
      clinic_name: string;
      city: string;
    }[]>`
      select id, intent, clinic_size, name, clinic_name, city
      from marketing.marketing_leads
      where submission_id = ${lead.submissionId}
    `;

    if (existing[0]) return { created: false, ...existing[0] };

    for (const [key, limit] of [[keys.lead, 5], [keys.ip, 20], [keys.global, 100]] as const) {
      const result = await transaction<{ limited: boolean }[]>`
        select private.rate_limit_hit(${key}, interval '10 minutes', ${limit}) as limited
      `;

      if (result[0]?.limited) throw new MarketingLeadRateLimitedError();
    }

    const mobile = lead.mobile ? normalizeLeadMobile(lead.country, lead.mobile).mobile : null;
    const preferredTime = "preferredTime" in lead && typeof lead.preferredTime === "string"
      ? lead.preferredTime
      : null;
    const rows = await transaction<{
      id: string;
      intent: "application" | "demo";
      clinic_size: "1_chair" | "2_chairs" | "3_plus";
      name: string;
      clinic_name: string;
      city: string;
    }[]>`
      insert into marketing.marketing_leads (
        submission_id, intent, name, clinic_name, country_code, province, city,
        email, clinic_size, role, mobile, mobile_country_code, preferred_time,
        message, privacy_acknowledged_at, privacy_notice_version,
        marketing_opt_in, marketing_opt_in_at, marketing_purpose,
        marketing_wording_version, marketing_source_page, utm_source,
        utm_medium, utm_campaign, utm_term, utm_content, landing_path,
        referrer_domain, created_at, updated_at
      ) values (
        ${lead.submissionId}, ${lead.intent}, ${lead.name}, ${lead.clinicName},
        ${lead.country}, ${lead.province ?? null}, ${lead.city}, ${lead.email},
        ${lead.clinicSize}, ${lead.role}, ${mobile},
        ${lead.mobile ? lead.country : null}, ${preferredTime},
        ${lead.message ?? null}, ${now}, ${lead.privacyNoticeVersion},
        ${lead.marketingOptIn}, ${lead.marketingOptIn ? now : null},
        ${lead.marketingOptIn ? "launch_updates" : null},
        ${lead.marketingOptIn ? lead.marketingWordingVersion : null},
        ${lead.marketingOptIn ? lead.sourcePage : null},
        ${lead.attribution.utmSource ?? null}, ${lead.attribution.utmMedium ?? null},
        ${lead.attribution.utmCampaign ?? null}, ${lead.attribution.utmTerm ?? null},
        ${lead.attribution.utmContent ?? null}, ${lead.attribution.landingPath ?? null},
        ${lead.attribution.referrerDomain ?? null}, ${now}, ${now}
      )
      on conflict (submission_id) do nothing
      returning id, intent, clinic_size, name, clinic_name, city
    `;

    if (rows[0]) return { created: true, ...rows[0] };

    const replay = await transaction<{
      id: string;
      intent: "application" | "demo";
      clinic_size: "1_chair" | "2_chairs" | "3_plus";
      name: string;
      clinic_name: string;
      city: string;
    }[]>`
      select id, intent, clinic_size, name, clinic_name, city
      from marketing.marketing_leads
      where submission_id = ${lead.submissionId}
    `;

    if (!replay[0]) throw new Error("Lead replay could not be read");
    return { created: false, ...replay[0] };
  });

  const saveHeardAbout = async (answer: HeardAboutInput, now: Date) => {
    await connection.begin(async (transaction) => {
      await transaction.unsafe("set local role service_role");
      await transaction`
        update marketing.marketing_leads
        set heard_about_source = ${answer.source},
            heard_about_other = ${answer.source === "other" ? answer.other ?? null : null},
            updated_at = ${now}
        where submission_id = ${answer.submissionId}
      `;
    });
  };

  const close = () => connection.end();

  return { submit, saveHeardAbout, close };
};

const leadEmailHash = (email: string) =>
  createHash("sha256").update(email.trim().toLowerCase()).digest("hex");

export {
  createMarketingLeadStore,
  heardAboutSchema,
  leadEmailHash,
  marketingLeadInputSchema,
  marketingLeadSchemaColumns,
  MarketingLeadRateLimitedError,
  normalizeLeadMobile
};
export type { HeardAboutInput, MarketingLeadInput, RateLimitKeys };
