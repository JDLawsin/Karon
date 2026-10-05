import { claimText, type ClaimId } from "./claims";
import { siteConfig } from "./site.config";

export const pricingLastUpdated = "September 30, 2026";

export const pricingIncludedClaimIds = [
  "booking-link",
  "booking-inbox",
  "today-board",
  "services-catalog"
] as const satisfies ReadonlyArray<ClaimId>;

export const pricingCompetitorClaimId = "clinicph-patient-staff-cap" as const satisfies ClaimId;

export const pricingFaqs = [
  {
    question: "Why is there no free plan?",
    answer: "One honest price. No locked features, no fake free plan."
  },
  {
    question: "What do founding clinics get?",
    answer: `${siteConfig.foundingCommitments.join(" ")} ${siteConfig.foundingPriceLockMonths === null
      ? "Final slot count and price-lock period will be confirmed before a clinic joins."
      : `The launch price stays locked for ${siteConfig.foundingPriceLockMonths} months.`}`
  },
  {
    question: "Do assistants see money?",
    answer: "Clinic money is designed for owners, not assistants. The owner collections view is still being built with founding clinics."
  },
  {
    question: "Does Karon take patient payments today?",
    answer: "Not yet. Recording patient payments and the owner collections view are still being built with founding clinics. Karon does not present them as available today."
  },
  {
    question: "Can I export my data?",
    answer: claimText("clinic-data-export"),
    claimId: "clinic-data-export" as const
  },
  {
    question: "Is there a contract?",
    answer: siteConfig.planTerms ?? "Contract terms will be confirmed with each founding clinic before joining."
  }
] as const;
