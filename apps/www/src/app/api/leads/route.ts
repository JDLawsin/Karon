import { createMarketingLeadStore } from "@karon/db";

import { handleHeardAboutPatch, handleLeadPost } from "@/features/demo/lead-request";
import { notifyLead } from "@/features/demo/lead-notification";
import { verifyLeadTurnstile } from "@/features/demo/lead-turnstile";
import { siteOrigins } from "@/lib/site-origins";
import { legalLaunchReady } from "../../../../content/legal-status";

let store: ReturnType<typeof createMarketingLeadStore> | undefined;

const leadStore = () => {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("DATABASE_URL is required for lead capture");
  store ??= createMarketingLeadStore(databaseUrl);
  return store;
};

const unavailable = () => Response.json(
  { error: "This form is temporarily unavailable. Please use the contact option on this page." },
  { status: 503 }
);

const enabled = () => process.env.NODE_ENV !== "production" || (
  process.env.LEAD_FORM_ENABLED === "true" && legalLaunchReady()
);

export const POST = async (request: Request) => {
  if (!enabled()) return unavailable();

  const rateLimitSecret = process.env.LEAD_RATE_LIMIT_SECRET?.trim() || (
    process.env.NODE_ENV === "production" ? undefined : "karon-local-lead-limiter"
  );
  if (!rateLimitSecret) return unavailable();

  return handleLeadPost(request, {
    now: () => new Date(),
    origin: siteOrigins.www,
    rateLimitSecret,
    verifyTurnstile: verifyLeadTurnstile,
    submitLead: leadStore().submit,
    notify: notifyLead
  });
};

export const PATCH = async (request: Request) => {
  if (!enabled()) return unavailable();

  return handleHeardAboutPatch(request, {
    now: () => new Date(),
    origin: siteOrigins.www,
    saveHeardAbout: leadStore().saveHeardAbout
  });
};
