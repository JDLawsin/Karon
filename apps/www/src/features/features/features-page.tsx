import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  StatusBadge
} from "@karon/design-system";
import Link from "next/link";

import { claims, type ClaimId } from "../../../content/claims";
import {
  changelog,
  featureFaqs,
  featureGroups,
  featuresLastUpdated
} from "../../../content/features";
import Claim from "../claim/claim";
import StickyCta from "../site-shell/sticky-cta";
import { siteConfig } from "../../../content/site.config";

type FeatureRowProps = {
  id: ClaimId;
};

const FeatureRow = ({ id }: FeatureRowProps) => {
  const claim = claims[id];
  const isLive = claim.status === "live" && "proof" in claim && "lastVerified" in claim;

  return (
    <li className="space-y-2" data-feature-row={id}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="min-w-0 flex-1 font-semibold"><Claim id={id} /></p>
        <StatusBadge className={isLive ? undefined : "border border-current bg-transparent"} tone={isLive ? "primary" : "neutral"}>
          {isLive ? "Live now" : "Building with founding clinics"}
        </StatusBadge>
      </div>
      {isLive && <p className="text-sm text-muted-foreground">Checked {claim.lastVerified}</p>}
      <div className="flex flex-wrap gap-x-4 text-sm">
        <Link className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline" href="/pricing">
          See pricing for this capability
        </Link>
        <Link className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline" href="/demo?intent=application">
          Discuss this capability in a demo
        </Link>
      </div>
    </li>
  );
};

const FeaturesPage = () => {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: featureFaqs.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer }
    }))
  };

  return (
    <main className="with-mobile-sticky" data-page="features">
      <section className="mx-auto max-w-7xl px-4 pb-10 pt-12 sm:px-6 sm:pb-14 sm:pt-16 lg:px-8 lg:pt-20">
        <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">What works today</h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          See what a small dental clinic can use now and what founding clinics are helping us shape next.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: {featuresLastUpdated}</p>
      </section>

      <section aria-label="Capabilities by clinic job" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
        <div className="grid gap-6 md:grid-cols-2">
          {featureGroups.map((group) => (
            <Card className="flex min-w-0 flex-col" key={group.title}>
              <CardHeader>
                <CardTitle><h2>{group.title}</h2></CardTitle>
                <CardDescription>{group.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-5">
                {group.live.length > 0 && (
                  <ul className="space-y-5">
                    {group.live.map((id) => <FeatureRow id={id} key={id} />)}
                  </ul>
                )}
                {group.security && (
                  <div className="border-t border-border pt-5" data-feature-security>
                    <ul><FeatureRow id={group.security} /></ul>
                    <Link className="mt-2 inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline" href="/security">
                      How we protect clinic data
                    </Link>
                  </div>
                )}
                {group.building.length > 0 && (
                  <div className="border-t border-border pt-5">
                    <ul className="space-y-5">
                      {group.building.map((id) => <FeatureRow id={id} key={id} />)}
                    </ul>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col items-start gap-1 border-t border-border pt-4 sm:flex-row sm:flex-wrap sm:gap-x-5">
                <Link className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline" href="/pricing">
                  See pricing for founding clinics
                </Link>
                <Link className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline" href="/demo?intent=application">
                  Apply as a founding clinic
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="recently-shipped-heading" className="bg-card">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <h2 className="text-3xl font-bold tracking-tight" id="recently-shipped-heading">Recently shipped</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">A dated record of capabilities that are live and checked.</p>
          <ol className="mt-8 divide-y divide-border border-y border-border">
            {changelog.map(({ claimId, date, detail }) => (
              <li className="grid gap-2 py-6 sm:grid-cols-[8rem_1fr] sm:gap-6" data-changelog-claim={claimId} key={`${date}-${claimId}`}>
                <time className="font-semibold tabular-nums" dateTime={date}>{date}</time>
                <div>
                  <p className="font-bold"><Claim id={claimId} /></p>
                  <p className="mt-1 text-muted-foreground">{detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="features-faq-heading" className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <h2 className="text-3xl font-bold tracking-tight" id="features-faq-heading">Questions clinics ask first</h2>
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {featureFaqs.map(({ question, answer }) => (
            <article className="rounded-lg bg-card p-6" key={question}>
              <h3 className="text-xl font-bold">{question}</h3>
              <p className="mt-3 text-muted-foreground">{answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-primary text-primary-foreground" data-sticky-cta-stop>
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-5 px-4 py-10 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold">See how the live workflow fits your clinic.</h2>
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

export default FeaturesPage;
