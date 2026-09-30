import "server-only";

import { siteOrigins } from "../src/lib/site-origins";
import { siteMode, type SiteMode } from "./site-mode";

export type { SiteMode } from "./site-mode";
export type GateId = "KR-008" | "KR-017" | "KR-018" | "KR-020";
export type CtaId =
  | "founding-application"
  | "founding-demo"
  | "existing-clinic"
  | "open-signup"
  | "open-demo";

export type SiteCta = {
  ctaId: CtaId;
  label: string;
  href: string;
  mode: SiteMode;
};

export type SiteConfig = {
  mode: SiteMode;
  ctas: {
    primary: SiteCta;
    secondary: SiteCta;
    existingClinic: SiteCta;
  };
  pricingBand: {
    currency: "PHP";
    minimum: 599;
    maximum: 799;
    status: "draft";
  };
  planTerms: null | string;
  billingUnit: null | "clinic";
  billingUnitConfirmedAt: null | `${number}-${number}-${number}`;
  billingUnitConfirmedBy: "Joshua";
  foundingSlots: {
    value: null | number;
    setBy: "Joshua";
    reviewedAt: "2026-09-26";
  };
  foundingPriceLockMonths: null | number;
  foundingCommitments: ReadonlyArray<string>;
  price: null | number;
  trialLengthDays: null | number;
  releaseGates: Record<GateId, boolean>;
};

const designPartnerCtas = {
  primary: {
    ctaId: "founding-application",
    label: "Apply as a founding clinic",
    href: "/demo?intent=application",
    mode: "design-partner"
  },
  secondary: {
    ctaId: "founding-demo",
    label: "Book a demo",
    href: "/demo?intent=demo",
    mode: "design-partner"
  },
  existingClinic: {
    ctaId: "existing-clinic",
    label: "Existing clinic sign in",
    href: new URL("/login", siteOrigins.app).toString(),
    mode: "design-partner"
  }
} as const;

export const validateSiteConfig = (
  config: SiteConfig,
  environment = process.env.NODE_ENV
) => {
  const ctas = Object.values(config.ctas);
  const wrongModeCtas = ctas.filter((cta) => cta.mode !== config.mode);

  if (wrongModeCtas.length > 0) {
    throw new Error(
      `Site mode ${config.mode} has mismatched CTAs: ${wrongModeCtas
        .map(({ ctaId }) => ctaId)
        .join(", ")}`
    );
  }

  if (config.mode === "open") {
    const missing = Object.entries(config.releaseGates)
      .filter(([, passed]) => !passed)
      .map(([gate]) => gate);

    if (config.price === null) {
      missing.push("price");
    }

    if (missing.length > 0) {
      throw new Error(`Open mode is blocked by: ${missing.join(", ")}`);
    }
  }

  if (environment === "production") {
    const missingFoundingTerms = [
      config.foundingSlots.value === null ? "foundingSlots" : null,
      config.foundingPriceLockMonths === null ? "foundingPriceLockMonths" : null,
      config.planTerms === null ? "planTerms" : null,
      config.foundingCommitments.length === 0 ? "foundingCommitments" : null
    ].filter((term): term is string => term !== null);

    if (missingFoundingTerms.length > 0) {
      throw new Error(`Production pricing is blocked by: ${missingFoundingTerms.join(", ")}`);
    }
  }

  return config;
};

export const siteConfig = validateSiteConfig({
  mode: siteMode,
  ctas: designPartnerCtas,
  pricingBand: {
    currency: "PHP",
    minimum: 599,
    maximum: 799,
    status: "draft"
  },
  planTerms: null,
  billingUnit: null,
  billingUnitConfirmedAt: null,
  billingUnitConfirmedBy: "Joshua",
  foundingSlots: {
    value: null,
    setBy: "Joshua",
    reviewedAt: "2026-09-26"
  },
  foundingPriceLockMonths: null,
  foundingCommitments: [
    "A direct line to the Karon team while your clinic tests the full patient visit."
  ],
  price: null,
  trialLengthDays: null,
  releaseGates: {
    "KR-008": false,
    "KR-017": false,
    "KR-018": false,
    "KR-020": false
  }
});
