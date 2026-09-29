import "server-only";

import { z } from "zod";

import { createPayMongoGateway, createPayMongoWebhook } from "./paymongo";
import type {
  BillingCurrency,
  BillingInterval,
  PaymentGateway
} from "./payment-gateway";

const priceSchema = z.coerce.number().int().min(2_000).max(100_000_000);
const paymentMethodSchema = z
  .string()
  .min(1)
  .max(40)
  .regex(/^[a-z][a-z0-9_]*$/);

const payMongoCredentialSchema = z.object({
  PAYMONGO_SECRET_KEY: z
    .string()
    .regex(/^sk_(test|live)_[A-Za-z0-9_-]+$/),
  PAYMONGO_WEBHOOK_SECRET: z.string().min(8).max(255)
});

const payMongoGatewaySchema = payMongoCredentialSchema.extend({
  PAYMONGO_PAYMENT_METHODS: z.string().transform((value, context) => {
    const methods = [...new Set(value.split(",").map((item) => item.trim()))];
    const parsed = z.array(paymentMethodSchema).min(1).max(12).safeParse(methods);

    if (!parsed.success) {
      context.addIssue({ code: "custom", message: "Invalid payment methods" });
      return z.NEVER;
    }

    return parsed.data;
  })
});

const enabledBillingSchema = z
  .object({
    BILLING_PUBLIC_CHECKOUT_ENABLED: z.literal("true"),
    BILLING_PROVIDER: z.literal("paymongo"),
    BILLING_SKU_NAME: z.string().trim().min(1).max(80),
    BILLING_MONTHLY_PRICE_MINOR: priceSchema,
    BILLING_YEARLY_PRICE_MINOR: z.union([priceSchema, z.literal("")]).optional()
  })
  .extend(payMongoGatewaySchema.shape);

type BillingPrice = {
  interval: BillingInterval;
  amountMinor: number;
  currency: BillingCurrency;
};

type BillingConfig =
  | { checkoutEnabled: false }
  | {
      checkoutEnabled: true;
      provider: "paymongo";
      skuName: string;
      prices: BillingPrice[];
      secretKey: string;
      webhookSecret: string;
      paymentMethodTypes: string[];
      livemode: boolean;
    };

type PayMongoWebhookConfig = {
  secretKey: string;
  webhookSecret: string;
  livemode: boolean;
};

type PublicBillingConfig =
  | { checkoutEnabled: false }
  | {
      checkoutEnabled: true;
      provider: string;
      skuName: string;
      prices: BillingPrice[];
    };

const parseBillingConfig = (
  environment: Record<string, string | undefined>
): BillingConfig => {
  if (environment.BILLING_PUBLIC_CHECKOUT_ENABLED !== "true") {
    return { checkoutEnabled: false };
  }

  const parsed = enabledBillingSchema.safeParse(environment);

  if (!parsed.success) {
    throw new Error("Invalid billing configuration");
  }

  const prices: BillingPrice[] = [
    {
      interval: "monthly",
      amountMinor: parsed.data.BILLING_MONTHLY_PRICE_MINOR,
      currency: "PHP"
    }
  ];

  if (
    typeof parsed.data.BILLING_YEARLY_PRICE_MINOR === "number"
  ) {
    prices.push({
      interval: "yearly",
      amountMinor: parsed.data.BILLING_YEARLY_PRICE_MINOR,
      currency: "PHP"
    });
  }

  return {
    checkoutEnabled: true,
    provider: parsed.data.BILLING_PROVIDER,
    skuName: parsed.data.BILLING_SKU_NAME,
    prices,
    secretKey: parsed.data.PAYMONGO_SECRET_KEY,
    webhookSecret: parsed.data.PAYMONGO_WEBHOOK_SECRET,
    paymentMethodTypes: parsed.data.PAYMONGO_PAYMENT_METHODS,
    livemode: parsed.data.PAYMONGO_SECRET_KEY.startsWith("sk_live_")
  };
};

const getBillingConfig = () => parseBillingConfig(process.env);

const parsePayMongoWebhookConfig = (
  environment: Record<string, string | undefined>
): PayMongoWebhookConfig => {
  const parsed = payMongoCredentialSchema.safeParse(environment);

  if (!parsed.success) {
    throw new Error("Invalid PayMongo webhook configuration");
  }

  return {
    secretKey: parsed.data.PAYMONGO_SECRET_KEY,
    webhookSecret: parsed.data.PAYMONGO_WEBHOOK_SECRET,
    livemode: parsed.data.PAYMONGO_SECRET_KEY.startsWith("sk_live_")
  };
};

const getPayMongoWebhookConfig = () =>
  parsePayMongoWebhookConfig(process.env);

const publicBillingConfig = (config: BillingConfig): PublicBillingConfig =>
  config.checkoutEnabled
    ? {
        checkoutEnabled: true,
        provider: config.provider,
        skuName: config.skuName,
        prices: config.prices
      }
    : { checkoutEnabled: false };

const createConfiguredPaymentGateway = (
  config: Extract<BillingConfig, { checkoutEnabled: true }>,
  fetcher?: typeof fetch
): PaymentGateway =>
  createPayMongoGateway({
    secretKey: config.secretKey,
    webhookSecret: config.webhookSecret,
    paymentMethodTypes: config.paymentMethodTypes,
    fetcher
  });

const createPayMongoWebhookParser = (config: PayMongoWebhookConfig) =>
  createPayMongoWebhook({
    secretKey: config.secretKey,
    webhookSecret: config.webhookSecret
  });

export {
  createConfiguredPaymentGateway,
  createPayMongoWebhookParser,
  getBillingConfig,
  getPayMongoWebhookConfig,
  parseBillingConfig,
  parsePayMongoWebhookConfig,
  publicBillingConfig
};
export type {
  BillingConfig,
  BillingPrice,
  PayMongoWebhookConfig,
  PublicBillingConfig
};
