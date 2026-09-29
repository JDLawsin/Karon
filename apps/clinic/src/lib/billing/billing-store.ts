import "server-only";

import { createHash } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type {
  BillingCurrency,
  BillingInterval,
  BillingWebhookEvent
} from "./payment-gateway";

const checkoutIdSchema = z.uuid();
const mutationResultSchema = z.boolean();
const webhookResultSchema = z.enum(["processed", "duplicate", "ignored"]);

type ReserveCheckoutInput = {
  tenantId: string;
  actorUserId: string;
  provider: string;
  interval: BillingInterval;
  amountMinor: number;
  currency: BillingCurrency;
  livemode: boolean;
};

type BillingStore = {
  reserve: (input: ReserveCheckoutInput) => Promise<string>;
  complete: (checkoutId: string, providerCheckoutId: string) => Promise<boolean>;
  fail: (checkoutId: string) => Promise<boolean>;
};

type ApplyWebhookInput = {
  provider: string;
  rawBody: string;
  event: BillingWebhookEvent;
};

class BillingStoreError extends Error {}
class BillingCheckoutRateLimitedError extends BillingStoreError {}

const requireResult = <T>(
  data: unknown,
  error: { message?: string } | null,
  schema: z.ZodType<T>
) => {
  if (error) {
    if (error.message?.includes("billing checkout rate limited")) {
      throw new BillingCheckoutRateLimitedError("Billing checkout rate limited");
    }

    throw new BillingStoreError("Billing storage operation failed");
  }

  const parsed = schema.safeParse(data);

  if (!parsed.success) {
    throw new BillingStoreError("Billing storage response was invalid");
  }

  return parsed.data;
};

const createBillingStore = (admin: SupabaseClient): BillingStore => ({
  reserve: async (input) => {
    const { data, error } = await admin.rpc("reserve_billing_checkout", {
      p_tenant_id: input.tenantId,
      p_actor_user_id: input.actorUserId,
      p_provider: input.provider,
      p_interval: input.interval,
      p_amount_minor: input.amountMinor,
      p_currency_code: input.currency,
      p_livemode: input.livemode
    });

    return requireResult(data, error, checkoutIdSchema);
  },
  complete: async (checkoutId, providerCheckoutId) => {
    const { data, error } = await admin.rpc("complete_billing_checkout", {
      p_checkout_id: checkoutId,
      p_provider_checkout_id: providerCheckoutId
    });

    return requireResult(data, error, mutationResultSchema);
  },
  fail: async (checkoutId) => {
    const { data, error } = await admin.rpc("fail_billing_checkout", {
      p_checkout_id: checkoutId
    });

    return requireResult(data, error, mutationResultSchema);
  }
});

const applyBillingWebhook = async (
  admin: SupabaseClient,
  { provider, rawBody, event }: ApplyWebhookInput
) => {
  const payloadHash = createHash("sha256").update(rawBody).digest("hex");
  const { data, error } = await admin.rpc("apply_billing_webhook", {
    p_provider: provider,
    p_provider_event_id: event.id,
    p_event_type: event.providerEventType,
    p_event_kind: event.type,
    p_checkout_id: event.checkoutId ?? null,
    p_provider_checkout_id: event.providerCheckoutId ?? null,
    p_livemode: event.livemode,
    p_amount_minor: event.amountMinor ?? null,
    p_currency_code: event.currency ?? null,
    p_provider_occurred_at: event.occurredAt,
    p_payload_sha256: payloadHash,
    p_access_until: event.accessUntil ?? null
  });

  return requireResult(data, error, webhookResultSchema);
};

export {
  BillingCheckoutRateLimitedError,
  BillingStoreError,
  applyBillingWebhook,
  createBillingStore
};
export type { ApplyWebhookInput, BillingStore, ReserveCheckoutInput };
