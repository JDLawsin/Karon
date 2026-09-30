import { Button, Card, CardContent, CardHeader, CardTitle, StatusBadge } from "@karon/design-system";
import Link from "next/link";

import { claims } from "../../../content/claims";
import { siteConfig } from "../../../content/site.config";
import { switchingChecklist, switchingComparison } from "../../../content/switching";
import Claim from "../claim/claim";
import StickyCta from "../site-shell/sticky-cta";

const SwitchingPage = () => (
  <main className="with-mobile-sticky" data-page="switching">
    <section className="mx-auto max-w-5xl px-4 pb-10 pt-12 sm:px-6 sm:pb-14 sm:pt-16 lg:px-8 lg:pt-20">
      <p className="text-sm font-semibold text-primary">A careful move, at your team’s pace</p>
      <h1 className="mt-3 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">Switching to Karon</h1>
      <p className="mt-5 max-w-2xl text-lg text-muted-foreground sm:text-xl">
        See how the daily routine changes, what is ready now, and what still needs to be built before a clinic can move its existing records.
      </p>
    </section>

    <section aria-labelledby="paper-logbook-heading" className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
      <Card className="gap-3 bg-card p-5 sm:p-6">
        <CardHeader>
          <CardTitle><h2 id="paper-logbook-heading">Can I move from a paper logbook?</h2></CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Yes, but the self-serve path for existing records is not available yet.</p>
          <p><Claim id="import" showStatus /></p>
        </CardContent>
      </Card>
    </section>

    <section aria-labelledby="comparison-heading" className="bg-card">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,0.8fr)] lg:px-8 lg:py-24">
        <div className="min-w-0">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-extrabold tracking-tight" id="comparison-heading">Karon vs notebook and Messenger</h2>
            <p className="mt-3 text-muted-foreground">Both columns describe the work plainly. Status labels show which Karon parts are still being built.</p>
          </div>

          <table className="switching-comparison mt-8" aria-label="Karon compared with a notebook and Messenger">
            <thead>
              <tr>
                <th scope="col">Clinic task</th>
                <th id="comparison-notebook-heading" scope="col">Notebook and Messenger</th>
                <th id="comparison-karon-heading" scope="col">Karon</th>
              </tr>
            </thead>
            {switchingComparison.map(({ task, notebook, karonClaimId }, index) => {
              const showStatus = claims[karonClaimId].status !== "live";
              const taskHeaderId = `comparison-task-${index}`;

              return (
                <tbody key={task}>
                  <tr>
                    <th colSpan={2} id={taskHeaderId} scope="colgroup">{task}</th>
                  </tr>
                  <tr>
                    <td className="wrap-anywhere" data-comparison-side="notebook" headers={`${taskHeaderId} comparison-notebook-heading`}>
                      <span aria-hidden className="comparison-mobile-label">Notebook and Messenger</span>
                      {notebook}
                    </td>
                    <td className="wrap-anywhere" data-comparison-side="karon" headers={`${taskHeaderId} comparison-karon-heading`}>
                      <span aria-hidden className="comparison-mobile-label">Karon</span>
                      <Claim id={karonClaimId} showStatus={showStatus} />
                    </td>
                  </tr>
                </tbody>
              );
            })}
          </table>
        </div>

        <aside aria-labelledby="checklist-heading">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-extrabold tracking-tight" id="checklist-heading">A weekend switching checklist</h2>
            <StatusBadge className="border border-dashed border-current bg-transparent" tone="neutral">Preview</StatusBadge>
          </div>
          <p className="mt-3 text-muted-foreground">This is a planning preview, not an available records-migration service.</p>
          <ol className="mt-8 space-y-5">
            {switchingChecklist.map((item, index) => (
              <li className="grid grid-cols-[2rem_1fr] gap-3" key={item}>
                <span aria-hidden className="flex size-8 items-center justify-center rounded-sm bg-muted font-bold tabular-nums">{index + 1}</span>
                <span className="pt-1">{item}</span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </section>

    <section className="bg-primary text-primary-foreground" data-sticky-cta-stop>
      <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-5 px-4 py-10 sm:flex-row sm:items-center sm:px-6 lg:px-8">
        <div>
          <h2 className="text-2xl font-bold">Talk through your clinic’s current routine.</h2>
          <p className="mt-2 text-primary-foreground/80">We will show what fits today and label what is still being built.</p>
        </div>
        <Button asChild className="bg-background text-foreground hover:bg-muted">
          <Link data-cta-id={siteConfig.ctas.primary.ctaId} href={siteConfig.ctas.primary.href}>{siteConfig.ctas.primary.label}</Link>
        </Button>
      </div>
    </section>
    <StickyCta cta={siteConfig.ctas.primary} />
  </main>
);

export default SwitchingPage;
