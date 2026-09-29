import "server-only";

import type { BillingPrice } from "./billing-config";
import {
  PaymentGatewayUnavailableError,
  type BillingInterval,
  type PaymentGateway
} from "./payment-gateway";
import type { BillingStore } from "./billing-store";

type StartCheckoutInput = {
  tenantId: string;
  actorUserId: string;
  interval: BillingInterval;
  price: BillingPrice;
  skuName: string;
  successUrl: string;
  cancelUrl: string;
  gateway: PaymentGateway;
  livemode: boolean;
  store: BillingStore;
};

const startBillingCheckout = async ({
  tenantId,
  actorUserId,
  interval,
  price,
  skuName,
  successUrl,
  cancelUrl,
  gateway,
  livemode,
  store
}: StartCheckoutInput) => {
  if (price.interval !== interval) {
    throw new BillingCheckoutConfigurationError("Billing price interval mismatch");
  }

  const checkoutId = await store.reserve({
    tenantId,
    actorUserId,
    provider: gateway.provider,
    interval,
    amountMinor: price.amountMinor,
    currency: price.currency,
    livemode
  });

  try {
    const checkout = await gateway.createCheckout({
      checkoutId,
      interval,
      amountMinor: price.amountMinor,
      currency: price.currency,
      skuName,
      successUrl,
      cancelUrl
    });

    if (checkout.livemode !== livemode) {
      throw new PaymentGatewayUnavailableError("Billing gateway mode mismatch");
    }

    const completed = await store.complete(
      checkoutId,
      checkout.providerCheckoutId
    );

    if (!completed) {
      throw new BillingCheckoutConfigurationError(
        "Billing checkout correlation failed"
      );
    }

    return checkout.checkoutUrl;
  } catch (error) {
    await store.fail(checkoutId).catch(() => false);
    throw error;
  }
};

class BillingCheckoutConfigurationError extends Error {}

export { BillingCheckoutConfigurationError, startBillingCheckout };
export type { StartCheckoutInput };
