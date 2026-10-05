import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ChevronDown
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

const formatDate = (value: string) => new Intl.DateTimeFormat("en-PH", {
  dateStyle: "long",
  timeZone: "UTC"
}).format(new Date(`${value}T00:00:00Z`));

const PricingPage = () => {
  const lockedPrice = siteConfig.mode === "open" ? siteConfig.price : null;
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
    <main className="with-mobile-sticky overflow-hidden" data-page="pricing">
      <section className="mx-auto max-w-4xl px-4 pb-10 pt-14 text-center sm:px-6 sm:pb-14 sm:pt-20 lg:px-8 lg:pt-24">
        <h1 className="text-balance text-4xl font-extrabold leading-[1.04] tracking-tight sm:text-6xl lg:text-7xl">One plan for the whole clinic</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
          Talk through one founding-clinic plan while clinics test the full patient visit with us.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Last updated: <time dateTime="2026-09-30">{pricingLastUpdated}</time>
        </p>
      </section>

      <section aria-labelledby="karon-clinic-pricing" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24" role="region">
        <Card className="grid gap-0 overflow-hidden p-0 lg:grid-cols-[0.8fr_1.2fr]" data-testid="pricing-card">
          <div className="flex flex-col bg-primary px-6 py-8 text-primary-foreground sm:px-8 sm:py-10 lg:px-10 lg:py-12">
            <CardHeader className="gap-5">
              <CardTitle className="text-xl"><h2 id="karon-clinic-pricing">Karon Clinic</h2></CardTitle>
              <div>
                <p className="max-w-sm text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">Founding-clinic pricing</p>
                <p className="mt-3 text-lg font-semibold">Confirmed with you before you join.</p>
                <p className="mt-1 text-sm text-primary-foreground">No public list price yet.</p>
              </div>
            </CardHeader>

            <div className="mt-auto pt-8" data-sticky-cta-origin>
              <p className="max-w-md font-semibold leading-relaxed">
                {siteConfig.mode === "design-partner"
                  ? "Public signup opens after our founding clinics finish testing the full patient visit."
                  : "Public signup is open."}
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                <Button asChild className="bg-background text-foreground hover:bg-muted" size="lg">
                  <Link data-cta-id={siteConfig.ctas.primary.ctaId} href={siteConfig.ctas.primary.href}>
                    {siteConfig.ctas.primary.label}
                  </Link>
                </Button>
                <Button asChild className="border-2 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary" size="lg" variant="outline">
                  <Link data-cta-id={siteConfig.ctas.secondary.ctaId} href={siteConfig.ctas.secondary.href}>
                    {siteConfig.ctas.secondary.label}
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          <CardContent className="gap-0 bg-background px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
            <div>
              <h3 className="text-2xl font-extrabold tracking-tight">Included today</h3>
              <ul aria-label="Included today" className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                {pricingIncludedClaimIds.map((id) => (
                  <li className="flex gap-3 leading-relaxed" key={id}>
                    <span aria-hidden className="mt-1 block size-3 shrink-0 rotate-45 border-b-2 border-r-2 border-primary" />
                    <Claim id={id} slot="shipped-benefit" />
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 border-t border-border pt-8">
              <h3 className="text-xl font-bold">Founding-clinic program</h3>
              <ul className="mt-3 space-y-3 leading-relaxed text-muted-foreground">
                {siteConfig.foundingCommitments.map((commitment) => <li key={commitment}>{commitment}</li>)}
                {siteConfig.foundingPriceLockMonths !== null && (
                  <li>Launch price locked for {siteConfig.foundingPriceLockMonths} months.</li>
                )}
                {siteConfig.foundingSlots.value !== null && <li>Founding places: {siteConfig.foundingSlots.value}</li>}
              </ul>
            </div>
          </CardContent>
        </Card>

        <aside aria-label="Pricing context" className="grid gap-4 border-b border-border py-6 text-sm leading-6 text-muted-foreground sm:grid-cols-[1fr_auto] sm:items-start sm:gap-8">
          <p className="max-w-3xl">
            <Claim id={pricingCompetitorClaimId} />{" "}
            <a className="font-semibold text-primary underline underline-offset-4 hover:no-underline" href={competitor.source}>
              ClinicPH pricing
            </a>{" "}
            (as of <time dateTime={competitor.asOf}>{formatDate(competitor.asOf)}</time>).
          </p>
          <p>Pricing in other currencies on request.</p>
        </aside>
      </section>

      <section aria-labelledby="faq-heading" className="scroll-mt-20 bg-card" id="faq">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20 lg:px-8 lg:py-24">
          <div>
            <h2 className="text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl" id="faq-heading">Pricing questions, answered plainly</h2>
            <p className="mt-4 max-w-md text-lg leading-relaxed text-muted-foreground">
              Clear answers about the founding program, clinic access, and your data.
            </p>
          </div>
          <div className="divide-y divide-border border-y border-border">
            {faqEntries.map(({ question, answer, ...entry }) => (
              <details className="group py-1" key={question}>
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 text-lg font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {question}<ChevronDown aria-hidden className="size-5 shrink-0 text-primary transition-transform duration-motion group-open:rotate-180" />
                </summary>
                <p className="max-w-3xl pb-6 leading-relaxed text-muted-foreground">
                  {"claimId" in entry ? <Claim id={entry.claimId} /> : answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-primary text-primary-foreground" data-sticky-cta-stop>
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-12 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight">Talk through the plan with us</h2>
            <p className="mt-2 text-lg text-primary-foreground">Show us how your clinic handles bookings and the day at the chair.</p>
          </div>
          <Button asChild className="bg-background text-foreground hover:bg-muted" size="lg">
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
