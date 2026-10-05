import { Button, ChevronDown, KaronWordmark, StatusBadge } from "@karon/design-system";
import Link from "next/link";

import { claims } from "../../../content/claims";
import {
  changelog,
  featureFaqs,
  featureGroups,
  featuresLastUpdated
} from "../../../content/features";
import { securityControls, securityFaqs } from "../../../content/security";
import { siteConfig } from "../../../content/site.config";
import { switchingChecklist, switchingComparison } from "../../../content/switching";
import Claim from "../claim/claim";
import StickyCta from "../site-shell/sticky-cta";

const liveWorkflow = [
  {
    id: "booking-link",
    title: "Give every request one clear way in",
    description: "Patients choose a time from your clinic link. Your team starts with a request that is ready to review, not another message to copy into a notebook."
  },
  {
    id: "booking-inbox",
    title: "Review the day before it gets noisy",
    description: "New requests wait together in one inbox so the team can review the patient, time, and service without opening conversations one by one."
  },
  {
    id: "today-board",
    title: "Keep every chair looking at today",
    description: "Booked, waiting, in chair, late, and done stay visible in one working view built for the person keeping the clinic moving."
  }
] as const;

const ProductPage = () => {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [...featureFaqs, ...securityFaqs].map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer }
    }))
  };

  return (
    <main className="with-mobile-sticky overflow-x-clip" data-page="product">
      <section className="relative border-b border-border">
        <div aria-hidden className="absolute inset-y-0 right-0 hidden w-[38%] bg-primary/5 lg:block" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-16 lg:px-8 lg:py-24">
          <div className="max-w-2xl">
            <h1 className="text-balance text-4xl font-extrabold leading-[1.04] tracking-tight sm:text-6xl lg:text-7xl">
              From booking request to today&apos;s chair.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Karon gives a small dental clinic one clear path to take a request, review it, and run the day without rebuilding the schedule from Messenger and a notebook.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row" data-sticky-cta-origin>
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
              <Claim id="category-small-dental" /> · Latest capability check {featuresLastUpdated}
            </p>
          </div>

          <figure className="relative min-w-0 pb-8 sm:pb-12" data-product-preview="hero">
            <figcaption className="mb-3 text-sm font-semibold text-muted-foreground">Illustrative workflow · fake patient data</figcaption>
            <div aria-hidden className="overflow-hidden rounded-lg border border-border bg-background">
              <div className="grid min-w-0 sm:grid-cols-[8.5rem_minmax(0,1fr)]">
                <div className="hidden border-r border-border bg-card p-4 sm:flex sm:flex-col sm:justify-between">
                  <div>
                    <KaronWordmark />
                    <p className="mt-8 rounded-md bg-primary px-3 py-3 text-sm font-semibold text-primary-foreground">Today</p>
                    <p className="mt-2 px-3 py-3 text-sm font-medium text-muted-foreground">Settings</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Demo clinic</p>
                </div>
                <div className="min-w-0 p-3 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Monday · 5 visits</p>
                      <p className="mt-1 text-2xl font-extrabold tracking-tight">Today</p>
                    </div>
                    <Button asChild><span aria-hidden>Add patient</span></Button>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 rounded-md bg-card px-4 py-3 text-sm font-semibold tabular-nums">
                    <span>2 waiting</span><span className="text-primary">1 in chair</span><span>2 booked</span>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg bg-card p-3">
                      <p className="text-sm font-bold">Booked</p>
                      <div className="mt-3 rounded-md bg-background p-3"><p className="font-semibold">Lina Cruz</p><p className="text-sm text-muted-foreground">9:00 AM · Checkup</p></div>
                    </div>
                    <div className="rounded-lg bg-info-subtle p-3">
                      <p className="text-sm font-bold text-info">Waiting</p>
                      <div className="mt-3 rounded-md bg-background p-3"><p className="font-semibold">Maria Santos</p><p className="text-sm text-muted-foreground">9:30 AM · Cleaning</p></div>
                    </div>
                    <div className="rounded-lg bg-primary/10 p-3">
                      <p className="text-sm font-bold text-primary">In chair</p>
                      <div className="mt-3 rounded-md bg-background p-3"><p className="font-semibold">Jon Reyes</p><p className="text-sm text-muted-foreground">10:00 AM · Extraction</p></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative -mt-4 ml-auto w-[88%] rounded-lg border border-border bg-background p-4 sm:absolute sm:-bottom-1 sm:-right-3 sm:mt-0 sm:w-72">
              <div className="flex items-center justify-between gap-3"><p className="font-bold">Booking inbox</p><StatusBadge tone="info">New</StatusBadge></div>
              <p className="mt-3 font-semibold">Ana Lim</p>
              <p className="text-sm text-muted-foreground">Tomorrow · 11:30 AM · Checkup</p>
            </div>
          </figure>
        </div>
      </section>

      <section aria-labelledby="workflow-heading">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
            <h2 className="max-w-xl text-balance text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl" id="workflow-heading">
              One handoff, all the way through the morning
            </h2>
            <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground lg:justify-self-end">
              Calendars tell you when. Karon keeps the clinic team clear on who asked, what needs review, and who is moving into the chair now.
            </p>
          </div>

          <div className="mt-14 border-y border-border">
            {liveWorkflow.map(({ id, title, description }, index) => (
              <article className="grid gap-10 border-b border-border py-12 last:border-b-0 lg:grid-cols-2 lg:items-center lg:gap-20 lg:py-20" key={id}>
                <div className={index % 2 === 1 ? "lg:order-2" : undefined}>
                  <h3 className="mt-5 max-w-lg text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h3>
                  <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">{description}</p>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <StatusBadge tone="primary">Live now</StatusBadge>
                    <p className="font-semibold text-foreground"><Claim id={id} /></p>
                  </div>
                </div>

                <div aria-hidden className={`min-w-0 rounded-lg bg-card p-4 sm:p-6 ${index % 2 === 1 ? "lg:order-1" : ""}`}>
                  {index === 0 && (
                    <div className="mx-auto max-w-xl rounded-lg bg-background p-4 sm:p-6">
                      <div className="flex items-start justify-between gap-4 border-b border-border pb-4"><div><p className="font-extrabold">Demo Dental Clinic</p><p className="text-sm text-muted-foreground">Request an appointment</p></div><StatusBadge tone="neutral">Public page</StatusBadge></div>
                      <p className="mt-5 font-bold">Choose a time</p>
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"><span className="rounded-md border border-border py-3 text-center font-semibold tabular-nums">9:30</span><span className="rounded-md bg-primary py-3 text-center font-semibold text-primary-foreground tabular-nums">10:00</span><span className="rounded-md border border-border py-3 text-center font-semibold tabular-nums">10:30</span><span className="rounded-md border border-border py-3 text-center font-semibold tabular-nums">11:00</span></div>
                      <p className="mt-5 rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">Your link: /book/demo-clinic</p>
                    </div>
                  )}
                  {index === 1 && (
                    <div className="mx-auto max-w-xl">
                      <div className="flex items-center justify-between gap-3 border-b border-border pb-4"><p className="text-xl font-extrabold">Booking inbox</p><StatusBadge tone="info">2 new</StatusBadge></div>
                      <div className="divide-y divide-border">
                        <div className="flex items-center justify-between gap-4 py-5"><div><p className="font-semibold">Maria Santos</p><p className="text-sm text-muted-foreground">Tomorrow · 10:00 AM · Cleaning</p></div><span className="font-semibold text-primary">Review</span></div>
                        <div className="flex items-center justify-between gap-4 py-5"><div><p className="font-semibold">Paolo Reyes</p><p className="text-sm text-muted-foreground">Friday · 2:00 PM · Checkup</p></div><span className="font-semibold text-primary">Review</span></div>
                      </div>
                    </div>
                  )}
                  {index === 2 && (
                    <div className="mx-auto grid max-w-2xl gap-3 sm:grid-cols-3">
                      <div className="rounded-lg bg-background p-3"><p className="text-sm font-bold">Booked</p><div className="mt-3 rounded-md bg-card p-3"><p className="font-semibold">Lina Cruz</p><p className="text-sm text-muted-foreground">9:00 AM</p></div></div>
                      <div className="rounded-lg bg-info-subtle p-3"><p className="text-sm font-bold text-info">Waiting</p><div className="mt-3 rounded-md bg-background p-3"><p className="font-semibold">Maria Santos</p><p className="text-sm text-muted-foreground">9:30 AM</p></div></div>
                      <div className="rounded-lg bg-primary/10 p-3"><p className="text-sm font-bold text-primary">In chair</p><div className="mt-3 rounded-md bg-background p-3"><p className="font-semibold">Jon Reyes</p><p className="text-sm text-muted-foreground">10:00 AM</p></div></div>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="capabilities-heading" className="bg-card">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <h2 className="max-w-xl text-balance text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl" id="capabilities-heading">Know what is ready before the demo</h2>
            <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground lg:justify-self-end">Every capability stays tied to its public status. Live means checked. Everything else stays labeled while founding clinics help shape it.</p>
          </div>

          <div className="mt-12 border-y border-border bg-background">
            {featureGroups.map((group) => (
              <article className="grid gap-6 border-b border-border p-5 last:border-b-0 sm:p-6 lg:grid-cols-[0.7fr_1.3fr] lg:gap-12" key={group.title}>
                <div><h3 className="text-2xl font-extrabold tracking-tight">{group.title}</h3><p className="mt-2 max-w-md text-muted-foreground">{group.description}</p></div>
                <ul className="divide-y divide-border">
                  {[...group.live, ...(group.security ? [group.security] : []), ...group.building].map((id) => {
                    const claim = claims[id];
                    const isLive = claim.status === "live";
                    return <li className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between" data-feature-row={id} key={id}><div><p className="font-semibold"><Claim id={id} /></p>{isLive && "lastVerified" in claim && <p className="mt-1 text-sm text-muted-foreground">Checked {claim.lastVerified}</p>}</div><StatusBadge className={isLive ? undefined : "border border-current bg-transparent"} tone={isLive ? "primary" : "neutral"}>{isLive ? "Live now" : "Building with founding clinics"}</StatusBadge></li>;
                  })}
                </ul>
              </article>
            ))}
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-[0.65fr_1.35fr]">
            <div><h3 className="text-2xl font-extrabold tracking-tight">Recently shipped</h3><p className="mt-2 text-muted-foreground">A dated record of capabilities that are live and checked.</p></div>
            <ol className="divide-y divide-border border-y border-border">
              {changelog.map(({ claimId, date, detail }) => <li className="grid gap-2 py-5 sm:grid-cols-[8rem_1fr] sm:gap-6" key={`${date}-${claimId}`}><time className="font-semibold tabular-nums" dateTime={date}>{date}</time><div><p className="font-bold"><Claim id={claimId} /></p><p className="mt-1 text-muted-foreground">{detail}</p></div></li>)}
            </ol>
          </div>
        </div>
      </section>

      <section aria-labelledby="switching-heading">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
            <div className="max-w-xl">
              <h2 className="text-balance text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl" id="switching-heading">Keep the routine. Lose the scattered handoffs.</h2>
              <p className="mt-5 text-lg leading-relaxed text-muted-foreground">Karon starts with the jobs your team already does. It brings the request, the review, and the day into one path without pretending the records move is finished.</p>
              <div className="mt-8 rounded-lg bg-card p-5"><p className="font-bold">Can I move from a paper logbook?</p><p className="mt-2 text-muted-foreground">Yes, but the self-serve path for existing records is not available yet.</p><p className="mt-3"><Claim id="import" showStatus /></p></div>
              <details className="group mt-5 border-y border-border py-1">
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 text-lg font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Preview a careful weekend switch<ChevronDown aria-hidden className="size-5 shrink-0 text-primary transition-transform duration-motion group-open:rotate-180" /></summary>
                <ol className="space-y-4 pb-6">{switchingChecklist.map((item, index) => <li className="grid grid-cols-[2rem_1fr] gap-3" key={item}><span aria-hidden className="flex size-8 items-center justify-center rounded-sm bg-muted font-bold tabular-nums">{index + 1}</span><span className="pt-1">{item}</span></li>)}</ol>
              </details>
            </div>

            <div className="min-w-0">
              <h3 className="text-2xl font-extrabold tracking-tight">Karon vs notebook and Messenger</h3>
              <p className="mt-2 text-muted-foreground">A plain comparison of the work, with unfinished Karon parts labeled.</p>
              <table aria-label="Karon compared with a notebook and Messenger" className="product-comparison mt-8">
                <thead><tr><th scope="col">Clinic task</th><th id="comparison-notebook-heading" scope="col">Notebook and Messenger</th><th id="comparison-karon-heading" scope="col">Karon</th></tr></thead>
                {switchingComparison.map(({ task, notebook, karonClaimId }, index) => {
                  const taskHeaderId = `comparison-task-${index}`;
                  return <tbody key={task}><tr><th colSpan={2} id={taskHeaderId} scope="colgroup">{task}</th></tr><tr><td className="wrap-anywhere" data-comparison-side="notebook" headers={`${taskHeaderId} comparison-notebook-heading`}><span aria-hidden className="comparison-mobile-label">Notebook and Messenger</span>{notebook}</td><td className="wrap-anywhere" data-comparison-side="karon" headers={`${taskHeaderId} comparison-karon-heading`}><span aria-hidden className="comparison-mobile-label">Karon</span><Claim id={karonClaimId} showStatus={claims[karonClaimId].status !== "live"} /></td></tr></tbody>;
                })}
              </table>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="security-heading" className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
            <div className="max-w-xl">
              <h2 className="text-balance text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl" id="security-heading">Trust should be plain enough to read</h2>
              <p className="mt-5 text-lg leading-relaxed text-primary-foreground">No seals and no sweeping promises. Just the access controls available today, stated in the same words we can verify.</p>
              <Link className="mt-6 inline-flex min-h-11 items-center font-semibold underline underline-offset-4" href="/.well-known/security.txt">Found a security issue? Here&apos;s how to report it.</Link>
            </div>
            <ul className="grid border-y border-primary-foreground/20 sm:grid-cols-2">
              {securityControls.map(({ claimId, explanation }, index) => <li className={`border-b border-primary-foreground/20 py-6 last:border-b-0 sm:p-6 ${index % 2 === 0 ? "sm:border-r sm:border-primary-foreground/20" : ""} ${index < 2 ? "sm:border-b" : "sm:border-b-0"}`} key={claimId}><h3 className="text-xl font-bold"><Claim id={claimId} /></h3><p className="mt-3 text-primary-foreground">{explanation}</p></li>)}
            </ul>
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
            <h3 className="text-2xl font-extrabold tracking-tight">Security questions, answered</h3>
            <div className="border-y border-primary-foreground/20">
              {securityFaqs.map(({ question, answer }) => <details className="group border-b border-primary-foreground/20 py-1 last:border-b-0" key={question}><summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 text-lg font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground">{question}<ChevronDown aria-hidden className="size-5 shrink-0 transition-transform duration-motion group-open:rotate-180" /></summary><p className="max-w-3xl pb-6 text-primary-foreground">{answer}</p></details>)}
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="faq-heading" className="bg-card">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20 lg:px-8 lg:py-24">
          <div><h2 className="text-balance text-4xl font-extrabold leading-tight tracking-tight" id="faq-heading">Questions before a product demo</h2><p className="mt-4 text-lg text-muted-foreground">Straight answers about what is live and how founding clinics help shape what comes next.</p></div>
          <div className="divide-y divide-border border-y border-border">
            {featureFaqs.map(({ question, answer }) => <details className="group py-1" key={question}><summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 text-lg font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{question}<ChevronDown aria-hidden className="size-5 shrink-0 text-primary transition-transform duration-motion group-open:rotate-180" /></summary><p className="max-w-3xl pb-6 leading-relaxed text-muted-foreground">{answer}</p></details>)}
          </div>
        </div>
      </section>

      <section className="bg-background" data-sticky-cta-stop>
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-14 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div><h2 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">See the clinic day in one place</h2><p className="mt-2 text-lg text-muted-foreground">Bring your current routine. We will show what fits today and what is still being shaped.</p></div>
          <Button asChild size="lg"><Link data-cta-id={siteConfig.ctas.primary.ctaId} href={siteConfig.ctas.primary.href}>{siteConfig.ctas.primary.label}</Link></Button>
        </div>
      </section>
      <StickyCta cta={siteConfig.ctas.primary} />
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replaceAll("<", "\\u003c") }} type="application/ld+json" />
    </main>
  );
};

export default ProductPage;
