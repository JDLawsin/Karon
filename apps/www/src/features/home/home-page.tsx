import { Button, Card, CardContent, ChevronDown, StatusBadge } from "@karon/design-system";
import Link from "next/link";

import { homepageFaqs, homepageLiveSteps, homepageRoadmap, homepageTrustClaimIds } from "../../../content/homepage";
import { siteConfig } from "../../../content/site.config";
import Claim from "../claim/claim";
import StickyCta from "../site-shell/sticky-cta";

type Props = {
  headlineId: "headline-today-screen" | "headline-one-inbox";
};

const HomePage = ({ headlineId }: Props) => {
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
    <main className="with-mobile-sticky overflow-hidden" data-page="home">
      <section className="relative border-b border-border" data-home-section="hero">
        <div aria-hidden className="absolute inset-y-0 right-0 hidden w-[42%] bg-primary/5 lg:block" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:gap-16 lg:px-8 lg:py-28">
          <div className="max-w-2xl">
            <h1 className="text-balance text-4xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              <Claim id={headlineId} slot="shipped-benefit" />
            </h1>
            <p className="mt-6 text-xl font-semibold leading-snug sm:text-2xl">
              <Claim id="subhead-founding" slot="description" />
            </p>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              <Claim id="entity-sentence" />
            </p>
            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center" data-sticky-cta-origin>
              <Button asChild size="lg">
                <Link data-cta-id={siteConfig.ctas.primary.ctaId} href={siteConfig.ctas.primary.href}>
                  {siteConfig.ctas.primary.label}
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link data-cta-id={siteConfig.ctas.secondary.ctaId} href={siteConfig.ctas.secondary.href}>
                  {siteConfig.ctas.secondary.label}
                </Link>
              </Button>
            </div>
            <p className="mt-5 text-sm font-medium text-muted-foreground">
              <Claim id="category-small-dental" />
            </p>
          </div>

          <figure className="relative mx-auto w-full max-w-2xl pb-8 pt-10 sm:px-8 sm:pb-12">
            <figcaption className="mb-3 text-sm font-semibold text-muted-foreground">Illustrative Karon Today preview · fake patient data</figcaption>
            <div aria-hidden className="relative rounded-lg border border-border bg-card p-3 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Demo clinic</p>
                  <p className="mt-1 text-2xl font-extrabold tracking-tight">Today</p>
                </div>
                <StatusBadge tone="primary">Live now</StatusBadge>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm font-semibold">
                <div className="rounded-md bg-background px-2 py-3"><span className="block text-xl tabular-nums">4</span>Booked</div>
                <div className="rounded-md bg-info-subtle px-2 py-3 text-info"><span className="block text-xl tabular-nums">2</span>Waiting</div>
                <div className="rounded-md bg-primary/10 px-2 py-3 text-primary"><span className="block text-xl tabular-nums">1</span>In chair</div>
              </div>

              <div className="mt-4 rounded-lg bg-muted p-3 sm:p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="font-bold">Booking inbox</p>
                  <span className="text-sm text-muted-foreground">Needs review</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3 rounded-md bg-background p-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">Maria Santos</p>
                      <p className="text-sm text-muted-foreground">9:30 AM · Cleaning</p>
                    </div>
                    <StatusBadge tone="neutral">Requested</StatusBadge>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-md bg-background p-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">Paolo Reyes</p>
                      <p className="text-sm text-muted-foreground">2:00 PM · Checkup</p>
                    </div>
                    <StatusBadge tone="neutral">Requested</StatusBadge>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute right-0 top-0 hidden w-52 rounded-lg border border-border bg-background p-4 sm:block">
              <p className="text-sm font-bold">Public booking</p>
              <p className="mt-1 text-sm text-muted-foreground">New request received</p>
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
                <span className="text-sm font-semibold tabular-nums">Tomorrow · 10:00</span>
                <StatusBadge tone="info">New</StatusBadge>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 hidden rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground sm:block">
              Booking request, ready for the chair
            </div>
          </figure>
        </div>
      </section>

      <section aria-labelledby="day-heading" className="bg-card" data-home-section="live-workflow">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <h2 className="max-w-lg text-balance text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl" id="day-heading">
              One clear path from booking to chair
            </h2>
            <div className="max-w-2xl lg:justify-self-end">
              <p className="text-lg leading-relaxed text-muted-foreground">
                Patients get a simple way to ask for a time. Your team gets one place to review it and run the day.
              </p>
              <Link className="mt-4 inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline" href="/product">
                Explore the product
              </Link>
            </div>
          </div>

          <div className="mt-12 border-y border-border">
            {homepageLiveSteps.map(({ id, title }, index) => (
              <article className="grid gap-8 border-b border-border py-10 last:border-b-0 sm:py-14 lg:grid-cols-[0.7fr_1.3fr] lg:items-center lg:gap-16" key={id}>
                <div className={index === 1 ? "lg:order-2" : undefined}>
                  <p className="text-sm font-semibold text-primary">Step {index + 1} of {homepageLiveSteps.length}</p>
                  <h3 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h3>
                  <p className="mt-3 max-w-lg text-lg leading-relaxed text-muted-foreground">
                    <Claim id={id} slot="shipped-benefit" />
                  </p>
                  <div className="mt-5"><StatusBadge tone="primary">Live now</StatusBadge></div>
                </div>

                <div aria-hidden className={`min-w-0 rounded-lg bg-background p-3 sm:p-5 ${index === 1 ? "lg:order-1" : ""}`}>
                  {index === 0 && (
                    <div className="mx-auto max-w-lg rounded-lg border border-border bg-card p-4 sm:p-6">
                      <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
                        <div><p className="font-bold">Demo Dental Clinic</p><p className="text-sm text-muted-foreground">Request an appointment</p></div>
                        <span className="size-3 rounded-full bg-primary" />
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm font-semibold tabular-nums">
                        <span className="rounded-md border border-border py-3">9:30</span>
                        <span className="rounded-md bg-primary py-3 text-primary-foreground">10:00</span>
                        <span className="rounded-md border border-border py-3">10:30</span>
                      </div>
                      <div className="mt-4 rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">Your link: /book/demo-clinic</div>
                    </div>
                  )}

                  {index === 1 && (
                    <div className="mx-auto max-w-xl">
                      <div className="mb-3 flex items-center justify-between gap-3"><p className="font-bold">Booking inbox</p><StatusBadge tone="info">2 new</StatusBadge></div>
                      <div className="divide-y divide-border border-y border-border">
                        <div className="flex items-center justify-between gap-4 py-4"><div><p className="font-semibold">Maria Santos</p><p className="text-sm text-muted-foreground">Tomorrow · 10:00 AM</p></div><span className="font-semibold text-primary">Review</span></div>
                        <div className="flex items-center justify-between gap-4 py-4"><div><p className="font-semibold">Paolo Reyes</p><p className="text-sm text-muted-foreground">Friday · 2:00 PM</p></div><span className="font-semibold text-primary">Review</span></div>
                      </div>
                    </div>
                  )}

                  {index === 2 && (
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg bg-muted p-3"><p className="text-sm font-bold">Booked</p><div className="mt-3 rounded-md bg-card p-3"><p className="font-semibold">Lina Cruz</p><p className="text-sm text-muted-foreground">9:00 AM</p></div></div>
                      <div className="rounded-lg bg-info-subtle p-3"><p className="text-sm font-bold text-info">Waiting</p><div className="mt-3 rounded-md bg-card p-3"><p className="font-semibold">Maria Santos</p><p className="text-sm text-muted-foreground">9:30 AM</p></div></div>
                      <div className="rounded-lg bg-primary/10 p-3"><p className="text-sm font-bold text-primary">In chair</p><div className="mt-3 rounded-md bg-card p-3"><p className="font-semibold">Jon Reyes</p><p className="text-sm text-muted-foreground">10:00 AM</p></div></div>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="roadmap-heading" data-home-section="roadmap">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.78fr_1.22fr] lg:gap-20 lg:px-8 lg:py-24">
          <div className="max-w-lg">
            <h2 className="text-balance text-4xl font-extrabold leading-tight tracking-tight" id="roadmap-heading">What founding clinics are shaping next</h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">The next parts of the clinic day stay clearly labeled while they are being built.</p>
          </div>
          <div className="border-y border-border">
            {homepageRoadmap.map(({ id, title }) => (
              <article className="border-b border-border py-6 last:border-b-0" key={id}>
                <h3 className="text-xl font-bold">{title}</h3>
                <div className="mt-2 max-w-2xl leading-relaxed text-muted-foreground"><Claim id={id} showStatus /></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="trust-heading" className="bg-card" data-home-section="trust">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:px-8 lg:py-24">
          <div className="max-w-lg">
            <h2 className="text-balance text-4xl font-extrabold leading-tight tracking-tight" id="trust-heading">Built close to the clinic day</h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">Karon starts with the routines of a small dental clinic, then keeps the public promises tied to what the product can do.</p>
            <Link className="mt-5 inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline" href="/about">Read why we are building Karon</Link>
            <p className="mt-4 text-sm text-muted-foreground">
              <Link className="font-semibold text-foreground underline-offset-4 hover:underline" href="/product">Product</Link>
              {" · Claims checked "}<time dateTime="2026-09-30">September 30, 2026</time>
            </p>
          </div>
          <div>
            <h3 className="text-2xl font-bold">Plain security controls</h3>
            <ul className="mt-5 grid border-y border-border sm:grid-cols-2">
              {homepageTrustClaimIds.map((id, index) => (
                <li className={`py-5 text-lg font-medium sm:px-5 ${index % 2 === 0 ? "sm:border-r sm:border-border" : ""} ${index < 2 ? "border-b border-border" : ""}`} key={id}>
                  <Claim id={id} slot="shipped-benefit" />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section aria-labelledby="pricing-heading" data-home-section="pricing">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <Card className="grid gap-8 bg-primary p-6 text-primary-foreground sm:p-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:p-12">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl" id="pricing-heading">One Karon Clinic plan</h2>
              <p className="mt-3 max-w-md text-lg text-primary-foreground">Founding-clinic pricing is discussed and confirmed before you join.</p>
            </div>
            <CardContent className="items-start lg:items-end">
              <p className="text-4xl font-extrabold leading-tight sm:text-5xl">No public list price yet</p>
              <Button asChild className="bg-background text-foreground hover:bg-muted">
                <Link href="/pricing">Talk through the founding plan</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <section aria-labelledby="faq-heading" className="bg-card" data-home-section="faq">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20 lg:px-8 lg:py-24">
          <div>
            <h2 className="text-balance text-4xl font-extrabold leading-tight tracking-tight" id="faq-heading">Questions small clinics ask first</h2>
            <p className="mt-4 text-lg text-muted-foreground">Straight answers about what is live, what works offline, and how to join.</p>
          </div>
          <div className="divide-y divide-border border-y border-border">
            {homepageFaqs.map(({ question, answer }) => (
              <details className="group py-1" key={question}>
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 text-lg font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {question}<ChevronDown aria-hidden className="size-5 shrink-0 text-primary transition-transform duration-motion group-open:rotate-180" />
                </summary>
                <p className="max-w-3xl pb-6 leading-relaxed text-muted-foreground">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-primary text-primary-foreground" data-home-section="final-cta" data-sticky-cta-stop>
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-14 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div><h2 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">Shape Karon with your clinic</h2><p className="mt-2 text-lg text-primary-foreground">Show us how your team handles the day now.</p></div>
          <Button asChild className="bg-background text-foreground hover:bg-muted" size="lg">
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
