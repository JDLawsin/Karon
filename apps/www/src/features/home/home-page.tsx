import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  StatusBadge
} from "@karon/design-system";
import Link from "next/link";

import { homepageFaqs, homepageLiveSteps, homepageRoadmap, homepageTrustClaimIds } from "../../../content/homepage";
import { siteConfig } from "../../../content/site.config";
import Claim from "../claim/claim";
import StickyCta from "../site-shell/sticky-cta";

type Props = {
  headlineId: "headline-today-screen" | "headline-one-inbox";
};

const HomePage = ({ headlineId }: Props) => {
  const priceFormatter = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: siteConfig.pricingBand.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: homepageFaqs.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer }
    }))
  };

  return (
    <main className="with-mobile-sticky" data-page="home">
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 sm:py-16 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8 lg:py-24" data-home-section="hero">
        <div className="space-y-5">
          <p className="text-sm font-semibold text-primary"><Claim id="category-small-dental" /></p>
          <h1 className="max-w-2xl text-[2rem] font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            <Claim id={headlineId} slot="shipped-benefit" />
          </h1>
          <p className="text-lg font-semibold"><Claim id="subhead-founding" slot="description" /></p>
          <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
            <Claim id="entity-sentence" />
          </p>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center" data-sticky-cta-origin>
            <Button asChild>
              <Link data-cta-id={siteConfig.ctas.primary.ctaId} href={siteConfig.ctas.primary.href}>
                {siteConfig.ctas.primary.label}
              </Link>
            </Button>
            <Link className="flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline" data-cta-id={siteConfig.ctas.secondary.ctaId} href={siteConfig.ctas.secondary.href}>
              {siteConfig.ctas.secondary.label}
            </Link>
            <Link className="flex min-h-11 items-center font-semibold text-foreground underline-offset-4 hover:underline" href="/features">
              See what works today
            </Link>
          </div>
        </div>

        <figure className="aspect-[4/3] min-w-0 overflow-hidden rounded-lg border border-border bg-card p-3 sm:p-5">
          <figcaption className="sr-only">Illustrative Karon Today preview using fake patient data.</figcaption>
          <div className="flex h-full min-h-0 flex-col rounded-lg bg-background p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <p className="text-sm text-muted-foreground">Demo clinic</p>
                <p className="text-lg font-bold">Today</p>
              </div>
              <StatusBadge tone="primary">Live now</StatusBadge>
            </div>
            <div className="my-3 rounded-md bg-info/10 px-3 py-2 text-sm font-semibold text-info-foreground">
              2 booking requests
            </div>
            <div className="min-h-0 flex-1 rounded-lg bg-muted p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-bold">Booking inbox</p>
                <span className="text-sm text-muted-foreground">Needs review</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 rounded-md bg-background p-3">
                  <div className="min-w-0"><p className="truncate font-semibold">Maria Santos</p><p className="text-sm text-muted-foreground">9:30 AM</p></div>
                  <StatusBadge tone="neutral">Requested</StatusBadge>
                </div>
                <div className="hidden items-center justify-between gap-3 rounded-md bg-background p-3 min-[360px]:flex">
                  <div className="min-w-0"><p className="truncate font-semibold">Paolo Reyes</p><p className="text-sm text-muted-foreground">2:00 PM</p></div>
                  <StatusBadge tone="neutral">Requested</StatusBadge>
                </div>
              </div>
            </div>
          </div>
        </figure>
      </section>

      <section aria-labelledby="day-heading" className="bg-card" data-home-section="live-workflow">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mb-8 flex flex-wrap items-center gap-3">
            <h2 className="text-3xl font-extrabold tracking-tight" id="day-heading">How a day works</h2>
            <StatusBadge tone="primary">Live now</StatusBadge>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {homepageLiveSteps.map(({ id, title }, index) => (
              <Card className="bg-background" key={id}>
                <CardHeader>
                  <p className="text-sm font-semibold text-primary">Step {index + 1}</p>
                  <CardTitle>{title}</CardTitle>
                  <CardDescription><Claim id={id} slot="shipped-benefit" /></CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="roadmap-heading" data-home-section="roadmap">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mb-8 max-w-2xl space-y-3">
            <h2 className="text-3xl font-extrabold tracking-tight" id="roadmap-heading">What founding clinics are shaping next</h2>
            <p className="text-muted-foreground">The next parts of the clinic day stay clearly labeled while they are being built.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {homepageRoadmap.map(({ id, title }) => (
              <Card key={id}>
                <CardHeader>
                  <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Claim id={id} showStatus />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="trust-heading" className="bg-card" data-home-section="trust">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8 lg:py-24">
          <div className="space-y-4">
            <h2 className="text-3xl font-extrabold tracking-tight" id="trust-heading">Built close to the clinic day</h2>
            <p className="text-muted-foreground">Karon starts with the routines of a small dental clinic, then keeps the public promises tied to what the product can do.</p>
            <Link className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline" href="/about">Read why we are building Karon</Link>
            <p className="text-sm text-muted-foreground">
              <Link className="font-semibold text-foreground underline-offset-4 hover:underline" href="/features">What works today</Link>
              {" · Claims checked "}<time dateTime="2026-09-30">September 30, 2026</time>
            </p>
          </div>
          <div>
            <h3 className="mb-4 text-xl font-bold">Plain security controls</h3>
            <ul className="grid gap-3 sm:grid-cols-2">
              {homepageTrustClaimIds.map((id) => (
                <li className="rounded-lg bg-background p-4" key={id}><Claim id={id} slot="shipped-benefit" /></li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section aria-labelledby="pricing-heading" data-home-section="pricing">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <Card>
            <CardHeader>
              <CardTitle id="pricing-heading">One Karon Clinic plan</CardTitle>
              <CardDescription>Philippines launch pricing is planned within one clear monthly band.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
              <p className="text-3xl font-extrabold tabular-nums">
                {priceFormatter.format(siteConfig.pricingBand.minimum)} to {priceFormatter.format(siteConfig.pricingBand.maximum)}{" "}
                <span className="text-base font-normal text-muted-foreground">per month</span>
              </p>
              <Button asChild variant="outline"><Link href="/pricing">See founding clinic pricing</Link></Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <section aria-labelledby="faq-heading" className="bg-card" data-home-section="faq">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <h2 className="mb-8 text-3xl font-extrabold tracking-tight" id="faq-heading">Questions small clinics ask first</h2>
          <div className="divide-y divide-border border-y border-border">
            {homepageFaqs.map(({ question, answer }) => (
              <details className="group py-1" key={question}>
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {question}<span aria-hidden className="text-primary group-open:rotate-45">+</span>
                </summary>
                <p className="max-w-3xl pb-5 text-muted-foreground">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-primary text-primary-foreground" data-home-section="final-cta" data-sticky-cta-stop>
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-6 px-4 py-12 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div><h2 className="text-3xl font-extrabold">Shape Karon with your clinic</h2><p className="mt-2 text-primary-foreground/80">Show us how your team handles the day now.</p></div>
          <Button asChild className="bg-background text-foreground hover:bg-muted">
            <Link data-cta-id={siteConfig.ctas.primary.ctaId} href={siteConfig.ctas.primary.href}>{siteConfig.ctas.primary.label}</Link>
          </Button>
        </div>
      </section>
      <StickyCta cta={siteConfig.ctas.primary} />
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replaceAll("<", "\\u003c") }} type="application/ld+json" />
    </main>
  );
};

export default HomePage;
