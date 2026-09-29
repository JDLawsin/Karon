import "server-only";

type BillingInterval = "monthly" | "yearly";
type BillingCurrency = "PHP";

type CreateCheckoutInput = {
  checkoutId: string;
  interval: BillingInterval;
  amountMinor: number;
  currency: BillingCurrency;
  skuName: string;
  successUrl: string;
  cancelUrl: string;
};

type CreatedCheckout = {
  providerCheckoutId: string;
  checkoutUrl: string;
  livemode: boolean;
};

type BillingWebhookEvent = {
  id: string;
  providerEventType: string;
  type:
    | "payment_succeeded"
    | "payment_failed"
    | "subscription_cancelled"
    | "ignored";
  occurredAt: string;
  livemode: boolean;
  checkoutId?: string;
  providerCheckoutId?: string;
  amountMinor?: number;
  currency?: BillingCurrency;
  accessUntil?: string;
};

type ParseWebhookInput = {
  rawBody: string;
  signatureHeader: string;
  now?: number;
};

type PaymentGateway = {
  provider: string;
  createCheckout: (input: CreateCheckoutInput) => Promise<CreatedCheckout>;
  parseWebhook: (input: ParseWebhookInput) => BillingWebhookEvent;
};

class InvalidBillingWebhookError extends Error {}

class InvalidBillingWebhookSignatureError extends InvalidBillingWebhookError {}

class PaymentGatewayUnavailableError extends Error {}

export {
  InvalidBillingWebhookError,
  InvalidBillingWebhookSignatureError,
  PaymentGatewayUnavailableError
};
export type {
  BillingCurrency,
  BillingInterval,
  BillingWebhookEvent,
  CreatedCheckout,
  CreateCheckoutInput,
  ParseWebhookInput,
  PaymentGateway
};
