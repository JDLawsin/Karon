import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { z } from "zod";

import {
  InvalidBillingWebhookError,
  InvalidBillingWebhookSignatureError,
  PaymentGatewayUnavailableError,
  type BillingCurrency,
  type BillingWebhookEvent,
  type CreateCheckoutInput,
  type PaymentGateway
} from "./payment-gateway";

const PAYMONGO_CHECKOUT_URL = "https://api.paymongo.com/v2/checkout_sessions";
const PAYMONGO_CHECKOUT_TIMEOUT_MS = 10_000;
const SIGNATURE_TOLERANCE_SECONDS = 300;

type PayMongoMode = "test" | "live";

type PayMongoGatewayOptions = {
  secretKey: string;
  webhookSecret: string;
  paymentMethodTypes: string[];
  fetcher?: typeof fetch;
};

type PayMongoWebhookOptions = Pick<
  PayMongoGatewayOptions,
  "secretKey" | "webhookSecret"
>;

const checkoutResponseSchema = z.object({
  data: z.object({
    id: z.string().min(1).max(255),
    type: z.literal("checkout_session"),
    attributes: z.object({
      checkout_url: z.url(),
      livemode: z.boolean()
    }).passthrough()
  }).passthrough()
});

const resourceSchema = z.object({
  id: z.string().min(1).max(255),
  type: z.string().min(1).max(120),
  attributes: z.record(z.string(), z.unknown())
}).passthrough();

const eventEnvelopeSchema = z.object({
  data: z.object({
    id: z.string().min(1).max(255),
    type: z.literal("event"),
    attributes: z.object({
      type: z.string().min(1).max(120),
      livemode: z.boolean(),
      created_at: z.number().int().nonnegative(),
      data: resourceSchema
    }).passthrough()
  }).passthrough()
});

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const stringValue = (value: unknown) =>
  typeof value === "string" && value.length > 0 ? value : null;

const integerValue = (value: unknown) =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;

const currencyValue = (value: unknown): BillingCurrency | null =>
  value === "PHP" ? value : null;

const checkoutReference = (resource: z.infer<typeof resourceSchema>) => {
  const metadata = asRecord(resource.attributes.metadata);
  const reference =
    stringValue(resource.attributes.reference_number) ??
    stringValue(metadata?.karon_checkout_id);
  const parsed = z.uuid().safeParse(reference);
  return parsed.success ? parsed.data : null;
};

const paymentAmount = (resource: z.infer<typeof resourceSchema>) => {
  const intent = asRecord(resource.attributes.payment_intent);
  const intentAttributes = asRecord(intent?.attributes);
  const directAmount = integerValue(intentAttributes?.amount);
  const directCurrency = currencyValue(intentAttributes?.currency);

  if (directAmount !== null && directCurrency) {
    return { amountMinor: directAmount, currency: directCurrency };
  }

  const payment = Array.isArray(resource.attributes.payments)
    ? asRecord(resource.attributes.payments.at(-1))
    : null;
  const paymentAttributes = asRecord(payment?.attributes);
  const amountMinor = integerValue(paymentAttributes?.amount);
  const currency = currencyValue(paymentAttributes?.currency);

  return amountMinor !== null && currency
    ? { amountMinor, currency }
    : { amountMinor: undefined, currency: undefined };
};

const parseSignatureHeader = (signatureHeader: string) => {
  const parts = new Map(
    signatureHeader.split(",").map((part) => {
      const [key, ...value] = part.trim().split("=");
      return [key, value.join("=")] as const;
    })
  );
  const timestamp = parts.get("t");

  if (!timestamp || !/^\d+$/.test(timestamp)) {
    return null;
  }

  return { timestamp, test: parts.get("te") ?? "", live: parts.get("li") ?? "" };
};

type VerifySignatureInput = {
  rawBody: string;
  signatureHeader: string;
  secret: string;
  mode: PayMongoMode;
  now?: number;
};

const verifyPayMongoSignature = ({
  rawBody,
  signatureHeader,
  secret,
  mode,
  now = Date.now()
}: VerifySignatureInput) => {
  const parsed = parseSignatureHeader(signatureHeader);

  if (!parsed) {
    return false;
  }

  const timestampSeconds = Number(parsed.timestamp);
  const ageSeconds = Math.abs(Math.floor(now / 1000) - timestampSeconds);
  const supplied = mode === "test" ? parsed.test : parsed.live;

  if (ageSeconds > SIGNATURE_TOLERANCE_SECONDS || !/^[a-f0-9]{64}$/i.test(supplied)) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${parsed.timestamp}.${rawBody}`)
    .digest();
  const actual = Buffer.from(supplied, "hex");

  return expected.length === actual.length && timingSafeEqual(expected, actual);
};

const parsePayMongoWebhook = (rawBody: string): BillingWebhookEvent => {
  const decoded = JSON.parse(rawBody) as unknown;
  const event = eventEnvelopeSchema.parse(decoded).data;
  const { attributes } = event;
  const base = {
    id: event.id,
    providerEventType: attributes.type,
    occurredAt: new Date(attributes.created_at * 1000).toISOString(),
    livemode: attributes.livemode
  };

  if (attributes.type === "checkout_session.payment.paid") {
    if (attributes.data.type !== "checkout_session") {
      throw new InvalidBillingWebhookError("Invalid paid checkout resource");
    }

    const checkoutId = checkoutReference(attributes.data);
    const amount = paymentAmount(attributes.data);

    if (!checkoutId || amount.amountMinor === undefined || !amount.currency) {
      throw new InvalidBillingWebhookError("Invalid paid checkout event");
    }

    return {
      ...base,
      type: "payment_succeeded",
      checkoutId,
      providerCheckoutId: attributes.data.id,
      amountMinor: amount.amountMinor,
      currency: amount.currency
    };
  }

  if (attributes.type === "payment.failed") {
    const checkoutId = checkoutReference(attributes.data);

    return checkoutId
      ? { ...base, type: "payment_failed", checkoutId }
      : { ...base, type: "ignored" };
  }

  return { ...base, type: "ignored" };
};

const modeForSecret = (secretKey: string): PayMongoMode => {
  if (secretKey.startsWith("sk_test_")) {
    return "test";
  }

  if (secretKey.startsWith("sk_live_")) {
    return "live";
  }

  throw new Error("Invalid PayMongo secret key mode");
};

const checkoutUrlSchema = z.url().refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:" && url.hostname === "checkout.paymongo.com";
}, "Unexpected PayMongo checkout URL");

const createCheckoutBody = (
  input: CreateCheckoutInput,
  paymentMethodTypes: string[]
) => ({
  data: {
    attributes: {
      line_items: [
        {
          name: input.skuName,
          amount: input.amountMinor,
          currency: input.currency,
          quantity: 1
        }
      ],
      payment_method_types: paymentMethodTypes,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      reference_number: input.checkoutId,
      metadata: {
        karon_checkout_id: input.checkoutId,
        karon_interval: input.interval
      }
    }
  }
});

const createPayMongoGateway = ({
  secretKey,
  webhookSecret,
  paymentMethodTypes,
  fetcher = fetch
}: PayMongoGatewayOptions): PaymentGateway => {
  const webhook = createPayMongoWebhook({ secretKey, webhookSecret });

  return {
    ...webhook,
    createCheckout: async (input) => {
      const response = await fetcher(PAYMONGO_CHECKOUT_URL, {
        method: "POST",
        signal: AbortSignal.timeout(PAYMONGO_CHECKOUT_TIMEOUT_MS),
        headers: {
          Accept: "application/json",
          Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `karon-checkout-${input.checkoutId}`
        },
        body: JSON.stringify(createCheckoutBody(input, paymentMethodTypes))
      });
      const payload = await response.json().catch(() => null);
      const parsed = checkoutResponseSchema.safeParse(payload);

      if (!response.ok || !parsed.success || parsed.data.data.attributes.livemode !== (modeForSecret(secretKey) === "live")) {
        throw new PaymentGatewayUnavailableError("PayMongo checkout unavailable");
      }

      return {
        providerCheckoutId: parsed.data.data.id,
        checkoutUrl: checkoutUrlSchema.parse(
          parsed.data.data.attributes.checkout_url
        ),
        livemode: parsed.data.data.attributes.livemode
      };
    }
  };
};

const createPayMongoWebhook = ({
  secretKey,
  webhookSecret
}: PayMongoWebhookOptions): Pick<PaymentGateway, "provider" | "parseWebhook"> => {
  const mode = modeForSecret(secretKey);

  return {
    provider: "paymongo",
    parseWebhook: ({ rawBody, signatureHeader, now }) => {
      if (
        !verifyPayMongoSignature({
          rawBody,
          signatureHeader,
          secret: webhookSecret,
          mode,
          now
        })
      ) {
        throw new InvalidBillingWebhookSignatureError(
          "Invalid PayMongo signature"
        );
      }

      const event = parsePayMongoWebhook(rawBody);

      if (event.livemode !== (mode === "live")) {
        throw new InvalidBillingWebhookError("PayMongo mode mismatch");
      }

      return event;
    }
  };
};

export {
  SIGNATURE_TOLERANCE_SECONDS,
  createPayMongoGateway,
  createPayMongoWebhook,
  parsePayMongoWebhook,
  verifyPayMongoSignature
};
export type {
  PayMongoGatewayOptions,
  PayMongoMode,
  PayMongoWebhookOptions,
  VerifySignatureInput
};
