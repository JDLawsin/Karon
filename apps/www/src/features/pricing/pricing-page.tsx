import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@karon/design-system";
import Link from "next/link";

import { claims } from "../../../content/claims";
import {
  pricingCompetitorClaimId,
  pricingFaqs,
  pricingIncludedClaimIds,
  pricingLastUpdated
} from "../../../content/pricing";
import { siteConfig } from "../../../content/site.config";
import Claim from "../claim/claim";
import StickyCta from "../site-shell/sticky-cta";

const formatPeso = (value: number) => new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
}).format(value);

const PricingPage = () => {
  const isPerClinicConfirmed = siteConfig.billingUnit === "clinic" &&
    siteConfig.billingUnitConfirmedBy === "Joshua" &&
    siteConfig.billingUnitConfirmedAt !== null;
  const lockedPrice = siteConfig.mode === "open" ? siteConfig.price : null;
  const visiblePrice = lockedPrice !== null
    ? formatPeso(lockedPrice)
    : `${formatPeso(siteConfig.pricingBand.minimum)} to ${formatPeso(siteConfig.pricingBand.maximum)}`;
  const priceUnit = isPerClinicConfirmed ? "per clinic per month" : "per month";
  const competitor = claims[pricingCompetitorClaimId];
  const faqEntries = [
    ...pricingFaqs,
    ...(siteConfig.mode === "open" && siteConfig.trialLengthDays !== null
      ? [{
          question: "What happens when a trial ends?",
          answer: `After ${siteConfig.trialLengthDays} days, clinic access follows the confirmed plan terms.`
        }]
      : [])
  ];
  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Karon",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    ...(lockedPrice !== null && {
      offers: {
        "@type": "Offer",
        price: lockedPrice,
        priceCurrency: siteConfig.pricingBand.currency
      }
    })
  };
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqEntries.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer }
    }))
  };

  return (
    <main className="with-mobile-sticky" data-page="pricing">
      <section className="mx-auto max-w-5xl px-4 pb-10 pt-12 sm:px-6 sm:pb-14 sm:pt-16 lg:px-8 lg:pt-20">
        <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">One plan for the whole clinic</h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          Start with a clear Philippines launch band while founding clinics test the full patient visit with us.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: {pricingLastUpdated}</p>
      </section>

      <section aria-labelledby="karon-clinic-pricing" className="mx-auto max-w-xl px-4 pb-16 sm:px-6 lg:pb-24" role="region">
        <Card className="gap-6 p-5 sm:p-7" data-testid="pricing-card">
          <CardHeader className="gap-4">
            <CardTitle><h2 id="karon-clinic-pricing">Karon Clinic</h2></CardTitle>
            <div>
              <p className="whitespace-nowrap text-[clamp(1.75rem,9vw,3rem)] font-extrabold tracking-tight tabular-nums">{visiblePrice}</p>
              <p className="mt-2 font-semibold text-foreground">{priceUnit}</p>
              <p className="text-sm text-muted-foreground">Philippines launch pricing</p>
            </div>
            {isPerClinicConfirmed && (
              <p className="font-semibold">One price per clinic, every staff account included.</p>
            )}
          </CardHeader>

          <CardContent className="gap-6">
            <div>
              <h3 className="font-bold">Included today</h3>
              <ul aria-label="Included today" className="mt-3 space-y-3">
                {pricingIncludedClaimIds.map((id) => (
                  <li className="flex gap-3" key={id}>
                    <span aria-hidden className="font-bold text-primary">✓</span>
                    <Claim id={id} slot="shipped-benefit" />
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg bg-muted p-4">
              <h3 className="font-bold">Founding-clinic program</h3>
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                {siteConfig.foundingCommitments.map((commitment) => <li key={commitment}>{commitment}</li>)}
                {siteConfig.foundingPriceLockMonths !== null && (
                  <li>Launch price locked for {siteConfig.foundingPriceLockMonths} months.</li>
                )}
                {siteConfig.foundingSlots.value !== null && <li>Founding places: {siteConfig.foundingSlots.value}</li>}
              </ul>
            </div>

            <p className="font-semibold">
              {siteConfig.mode === "design-partner"
                ? "Public signup opens after our founding clinics finish testing the full patient visit."
                : "Public signup is open."}
            </p>
            <Button asChild>
              <Link data-cta-id={siteConfig.ctas.primary.ctaId} href={siteConfig.ctas.primary.href}>
                {siteConfig.ctas.primary.label}
              </Link>
            </Button>
          </CardContent>
        </Card>

        <p className="mt-5 text-sm leading-6 text-muted-foreground">
          <Claim id={pricingCompetitorClaimId} />{" "}
          <a className="font-semibold text-primary underline-offset-4 hover:underline" href={competitor.source} rel="noreferrer" target="_blank">
            ClinicPH pricing
          </a>{" "}
          (as of <time dateTime={competitor.asOf}>September 26, 2026</time>).
        </p>
        <p className="mt-4 text-sm text-muted-foreground">Pricing in other currencies on request.</p>
      </section>

      <section aria-labelledby="pricing-faq" className="bg-card">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <h2 className="text-3xl font-extrabold tracking-tight" id="pricing-faq">Pricing questions, answered plainly</h2>
          <div className="mt-8 divide-y divide-border border-y border-border">
            {faqEntries.map(({ question, answer, ...entry }) => (
              <details className="group py-1" key={question}>
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {question}<span aria-hidden className="text-primary group-open:rotate-45">+</span>
                </summary>
                <p className="max-w-3xl pb-5 text-muted-foreground">
                  {"claimId" in entry ? <Claim id={entry.claimId} /> : answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-primary text-primary-foreground" data-sticky-cta-stop>
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-5 px-4 py-10 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold">Talk through the plan with us.</h2>
          <Button asChild className="bg-background text-foreground hover:bg-muted">
            <Link data-cta-id={siteConfig.ctas.primary.ctaId} href={siteConfig.ctas.primary.href}>{siteConfig.ctas.primary.label}</Link>
          </Button>
        </div>
      </section>
      <StickyCta cta={siteConfig.ctas.primary} />
      {[softwareSchema, faqSchema].map((schema) => (
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replaceAll("<", "\\u003c") }}
          key={schema["@type"]}
          type="application/ld+json"
        />
      ))}
    </main>
  );
};

export default PricingPage;
