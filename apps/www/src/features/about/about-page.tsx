import { Button } from "@karon/design-system";
import Link from "next/link";

import { siteConfig } from "../../../content/site.config";
import Claim from "../claim/claim";
import StickyCta from "../site-shell/sticky-cta";

const AboutPage = () => (
  <main className="with-mobile-sticky overflow-x-clip" data-page="about">
    <section className="relative border-b border-border">
      <div aria-hidden className="absolute inset-y-0 right-0 hidden w-[44%] bg-primary lg:block" />
      <div className="relative mx-auto grid max-w-7xl lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
        <div className="flex flex-col justify-center px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-28">
          <h1 className="max-w-3xl text-balance text-5xl font-extrabold leading-[0.98] tracking-[-0.035em] sm:text-6xl lg:text-7xl">
            Why we are building Karon
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            <Claim id="entity-sentence" />
          </p>
          <a
            className="mt-7 inline-flex min-h-11 w-fit items-center font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href="#the-morning"
          >
            See the morning behind the idea
          </a>
        </div>

        <div className="relative bg-primary px-4 py-10 text-primary-foreground sm:px-6 sm:py-14 lg:flex lg:items-center lg:px-12 lg:py-20">
          <div className="w-full rounded-lg bg-background p-4 text-foreground sm:p-6">
            <div className="flex items-end justify-between gap-4 border-b border-border pb-5">
              <div>
                <p className="font-semibold text-muted-foreground">Illustrative clinic morning</p>
                <p className="mt-1 text-3xl font-extrabold tracking-tight">Front desk</p>
              </div>
              <time className="text-3xl font-extrabold tabular-nums text-primary" dateTime="08:40">
                8:40
              </time>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="bg-muted p-4 sm:col-span-2">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-bold">Messenger</p>
                  <span className="rounded-sm bg-primary px-2 py-1 text-sm font-semibold text-primary-foreground">3 open threads</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Conversations already moving before the first chair.</p>
              </div>
              <div className="bg-muted p-4">
                <p className="font-bold">Paper appointment book</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Names, notes, and question marks for the day.</p>
              </div>
              <div className="bg-muted p-4">
                <p className="font-bold">Payment proof</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">A GCash screenshot from the last visit.</p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-semibold">The clinic day is already in motion.</p>
              <p className="text-sm text-muted-foreground">Wi-Fi may not be.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <article>
      <section className="bg-card" id="the-morning" aria-labelledby="morning-heading">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20 lg:px-8 lg:py-24">
          <div className="self-start lg:sticky lg:top-8">
            <h2 className="max-w-md text-balance text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl" id="morning-heading">
              The morning behind the idea
            </h2>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">
              Karon started with a close look at the ordinary work of a small dental clinic. The software idea came after the routine, not before it.
            </p>

            <aside aria-labelledby="principle-heading" className="mt-8 bg-primary p-6 text-primary-foreground sm:p-8">
              <h3 className="text-2xl font-extrabold tracking-tight" id="principle-heading">
                The principle
              </h3>
              <p className="mt-3 text-lg leading-relaxed text-primary-foreground">
                Start with the real clinic day. Say plainly what the product can do. Keep unfinished work labeled as unfinished.
              </p>
            </aside>
          </div>

          <figure className="min-w-0">
            <figcaption className="mb-5 font-semibold text-muted-foreground">
              An illustrative morning, based on clinics we spoke with
            </figcaption>
            <blockquote className="border-y border-border">
              <ol>
                <li className="grid gap-3 border-b border-border py-7 sm:grid-cols-[8rem_1fr] sm:gap-8 sm:py-9">
                  <time className="text-3xl font-extrabold tracking-tight tabular-nums text-primary" dateTime="08:40">
                    8:40
                  </time>
                  <p className="text-lg leading-8 sm:text-xl sm:leading-9">
                    It is 8:40 on a Tuesday. Three Messenger threads are open on the assistant&apos;s phone while the paper appointment book carries names, notes, and question marks for the day.
                  </p>
                </li>
                <li className="grid gap-3 border-b border-border py-7 sm:grid-cols-[8rem_1fr] sm:gap-8 sm:py-9">
                  <p className="text-lg font-extrabold text-primary">Between visits</p>
                  <p className="text-lg leading-8 sm:text-xl sm:leading-9">
                    A patient is waiting with a GCash screenshot from the last visit. The clinic Wi-Fi drops while someone tries to check another screen, so the assistant returns to the conversation that is already moving.
                  </p>
                </li>
                <li className="grid gap-3 py-7 sm:grid-cols-[8rem_1fr] sm:gap-8 sm:py-9">
                  <time className="text-lg font-extrabold text-primary" dateTime="12:00">
                    By noon
                  </time>
                  <p className="text-lg leading-8 sm:text-xl sm:leading-9">
                    The chairs may look busy while the unanswered questions pile up: who is confirmed, what was paid, and what must happen next?
                  </p>
                </li>
              </ol>
            </blockquote>
          </figure>
        </div>
      </section>

      <section aria-labelledby="reason-heading">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:px-8 lg:py-24">
          <div>
            <h2 className="max-w-xl text-balance text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl" id="reason-heading">
              Make the clinic day easier to hold together.
            </h2>
          </div>
          <div className="max-w-[65ch] text-lg leading-8">
            <p>
              That is the founder&apos;s reason for building Karon. The aim is to make the clinic day easier to hold together, starting with the work that is already happening at the front desk and around the chair.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="name-heading" className="bg-muted">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-20 lg:px-8 lg:py-24">
          <div>
            <p className="text-6xl font-extrabold leading-none tracking-[-0.035em] text-primary sm:text-7xl lg:text-8xl">
              Karon
            </p>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl" id="name-heading">
              means <dfn className="not-italic">now</dfn> in Cebuano.
            </h2>
          </div>
          <p className="max-w-[65ch] text-lg leading-8">
            The name keeps that focus close. As recorded by{" "}
            <a className="font-semibold text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href="https://en.wiktionary.org/wiki/karon">
              Wiktionary&apos;s Cebuano entry
            </a>
            {" "}and the{" "}
            <a className="font-semibold text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href="https://www.binisaya.com/cebuano/karon">
              Binisaya dictionary
            </a>
            , it is a reminder to begin with what a clinic needs in the present moment.
          </p>
        </div>
      </section>
    </article>

    <section className="bg-primary text-primary-foreground" data-sticky-cta-stop>
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-14 sm:flex-row sm:items-center sm:px-6 lg:px-8">
        <div>
          <h2 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">Tell us how your clinic day works.</h2>
          <p className="mt-2 max-w-2xl text-lg text-primary-foreground">We will show what Karon can support now and what is still being built.</p>
        </div>
        <Button asChild className="bg-background text-foreground hover:bg-muted" size="lg">
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
