import { Button } from "@karon/design-system";
import Link from "next/link";

import { siteConfig } from "../../../content/site.config";
import Claim from "../claim/claim";
import StickyCta from "../site-shell/sticky-cta";

const AboutPage = () => (
  <main className="with-mobile-sticky" data-page="about">
    <section className="mx-auto max-w-5xl px-4 pb-10 pt-12 sm:px-6 sm:pb-14 sm:pt-16 lg:px-8 lg:pt-20">
      <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">
        Why we are building Karon
      </h1>
      <p className="mt-5 max-w-[70ch] text-lg text-muted-foreground sm:text-xl">
        <Claim id="entity-sentence" />
      </p>
    </section>

    <section aria-labelledby="morning-heading" className="mx-auto grid max-w-7xl gap-12 px-4 pb-16 sm:px-6 md:grid-cols-[minmax(0,1fr)_16rem] lg:gap-20 lg:px-8 lg:pb-24">
      <article className="min-w-0 max-w-[72ch]">
        <h2 className="text-3xl font-extrabold tracking-tight" id="morning-heading">
          The morning behind the idea
        </h2>
        <p className="mt-5 text-lg leading-8">
          Karon started with a close look at the ordinary work of a small dental clinic: a day held together across conversations, paper, payment screenshots, and memory. The software idea came after the routine, not before it.
        </p>

        <figure className="mt-10">
          <figcaption className="mb-3 text-sm font-semibold text-muted-foreground">
            An illustrative morning, based on clinics we spoke with
          </figcaption>
          <blockquote className="space-y-5 rounded-lg bg-card p-5 text-lg leading-8 sm:p-8">
            <p>
              It is 8:40 on a Tuesday. Three Messenger threads are open on the assistant&apos;s phone while the paper appointment book carries names, notes, and question marks for the day.
            </p>
            <p>
              A patient is waiting with a GCash screenshot from the last visit. The clinic Wi-Fi drops while someone tries to check another screen, so the assistant returns to the conversation that is already moving.
            </p>
            <p>
              By noon, the chairs may look busy while the unanswered questions pile up: who is confirmed, what was paid, and what must happen next?
            </p>
          </blockquote>
        </figure>

        <div className="mt-10 space-y-5 text-lg leading-8">
          <p>
            That is the founder&apos;s reason for building Karon. The aim is to make the clinic day easier to hold together, starting with the work that is already happening at the front desk and around the chair.
          </p>
          <p>
            The name keeps that focus close. <dfn className="font-semibold not-italic">Karon</dfn> means <q>now</q> in Cebuano, as recorded by{" "}
            <a className="font-semibold text-primary underline underline-offset-4" href="https://en.wiktionary.org/wiki/karon">
              Wiktionary&apos;s Cebuano entry
            </a>
            {" "}and the{" "}
            <a className="font-semibold text-primary underline underline-offset-4" href="https://www.binisaya.com/cebuano/karon">
              Binisaya dictionary
            </a>
            . It is a reminder to begin with what a clinic needs in the present moment.
          </p>
        </div>
      </article>

      <aside aria-labelledby="principle-heading" className="self-start bg-primary p-6 text-primary-foreground md:sticky md:top-6">
        <h2 className="text-2xl font-extrabold tracking-tight" id="principle-heading">
          The principle
        </h2>
        <p className="mt-4 text-lg leading-8 text-primary-foreground/85">
          Start with the real clinic day. Say plainly what the product can do. Keep unfinished work labeled as unfinished.
        </p>
      </aside>
    </section>

    <section className="bg-primary text-primary-foreground" data-sticky-cta-stop>
      <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-5 px-4 py-10 sm:flex-row sm:items-center sm:px-6 lg:px-8">
        <div>
          <h2 className="text-2xl font-bold">Tell us how your clinic day works.</h2>
          <p className="mt-2 text-primary-foreground/80">We will show what Karon can support now and what is still being built.</p>
        </div>
        <Button asChild className="bg-background text-foreground hover:bg-muted">
          <Link data-cta-id={siteConfig.ctas.primary.ctaId} href={siteConfig.ctas.primary.href}>
            {siteConfig.ctas.primary.label}
          </Link>
        </Button>
      </div>
    </section>
    <StickyCta cta={siteConfig.ctas.primary} />
  </main>
);

export default AboutPage;
