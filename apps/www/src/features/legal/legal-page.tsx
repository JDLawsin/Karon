import { Button } from "@karon/design-system";
import Link from "next/link";

import type { LegalNotice } from "../../../content/legal";
import { legalApproval } from "../../../content/legal-status";

type Props = LegalNotice & {
  pageId: string;
};

const LegalPage = ({ title, description, lastUpdated, sections, pageId }: Props) => (
  <main data-page={pageId}>
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 sm:py-16 md:grid-cols-[13rem_minmax(0,1fr)] lg:gap-16 lg:px-8 lg:py-20">
      <header className="space-y-4 md:col-start-2">
        {legalApproval.status === "pending" && (
          <p className="w-fit rounded-sm bg-warning-subtle px-2 py-1 text-sm font-semibold text-warning-foreground">Pending counsel review</p>
        )}
        <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">{title}</h1>
        <p className="text-sm text-muted-foreground">Last updated: <time dateTime={lastUpdated}>{lastUpdated}</time></p>
        <p className="max-w-[72ch] text-lg text-muted-foreground">{description}</p>
      </header>

      <nav aria-label="On this page" className="rounded-lg bg-card p-4 md:sticky md:top-24 md:row-start-2 md:self-start">
        <h2 className="font-bold">On this page</h2>
        <ol className="mt-3 space-y-1">
          {sections.map(({ id, title: sectionTitle }) => (
            <li key={id}>
              <a className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline" href={`#${id}`}>{sectionTitle}</a>
            </li>
          ))}
        </ol>
      </nav>

      <article className="min-w-0 max-w-[72ch] space-y-10 md:col-start-2 md:row-start-2">
        {sections.map(({ id, title: sectionTitle, content }) => (
          <section className="scroll-mt-28 space-y-4 [&_code]:break-all [&_code]:rounded-sm [&_code]:bg-muted [&_code]:px-1 [&_p]:text-base [&_p]:leading-7" id={id} key={id}>
            <h2 className="text-2xl font-bold tracking-tight">
              <a className="underline-offset-4 hover:text-primary hover:underline" href={`#${id}`}>{sectionTitle}</a>
            </h2>
            {content}
          </section>
        ))}

        <aside className="bg-muted p-6 sm:p-8" aria-labelledby={`${pageId}-contact`}>
          <h2 className="text-xl font-bold" id={`${pageId}-contact`}>Questions about this notice?</h2>
          <p className="mt-2 max-w-[60ch] leading-7 text-muted-foreground">
            Ask for a plain-language explanation or tell us what you need help finding. Do not include patient details.
          </p>
          <Button asChild className="mt-5 w-full sm:w-auto" variant="outline">
            <Link href="/contact">Contact Karon</Link>
          </Button>
        </aside>
      </article>
    </div>
  </main>
);

export default LegalPage;
