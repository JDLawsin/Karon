import { pageMetadata } from "@/lib/page-metadata";
import DemoForm from "@/features/demo/demo-form";
import Claim from "@/features/claim/claim";
import { claimText } from "../../../content/claims";
import { randomUUID } from "node:crypto";

const title = claimText("demo-page-title");
const description = claimText("demo-page-description");

export const dynamic = "force-dynamic";
export const metadata = pageMetadata("/demo", title, description);

type Props = { searchParams: Promise<{ intent?: string }> };

const DemoPage = async ({ searchParams }: Props) => {
  const query = await searchParams;
  const initialIntent = query.intent === "demo" ? "demo" : "application";
  const configuredResponsePromise = process.env.LEAD_RESPONSE_PROMISE?.trim();
  const configuredContactEmail = process.env.LEAD_CONTACT_EMAIL?.trim();
  const turnstileSiteKey = process.env.TURNSTILE_SITE_KEY?.trim();
  const responsePromise = configuredResponsePromise || "within one business day";
  const contactEmail = configuredContactEmail || "hello@example.test";
  const formEnabled = process.env.NODE_ENV !== "production" || Boolean(
    process.env.LEAD_FORM_ENABLED === "true" &&
    configuredResponsePromise &&
    configuredContactEmail &&
    turnstileSiteKey
  );

  return (
    <main data-page="demo">
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="mb-10 max-w-3xl space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl"><Claim id="demo-page-title" /></h1>
          <p className="text-lg text-muted-foreground"><Claim id="demo-page-description" /></p>
        </div>
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-12">
          <aside className="rounded-lg bg-card p-5 lg:sticky lg:top-24" aria-labelledby="next-heading">
            <h2 className="text-xl font-bold" id="next-heading">What happens next</h2>
            <p className="mt-2 text-muted-foreground">Joshua reviews each request, then replies {responsePromise}.</p>
          </aside>
          {formEnabled ? (
            <DemoForm
              contactEmail={contactEmail}
              initialIntent={initialIntent}
              responsePromise={responsePromise}
              submissionId={randomUUID()}
              turnstileSiteKey={turnstileSiteKey}
            />
          ) : (
            <div className="rounded-lg border border-border bg-background p-6">
              <h2 className="text-2xl font-bold">Applications are not open yet</h2>
              <p className="mt-2 text-muted-foreground">The privacy and email launch checks must be complete before this form opens.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default DemoPage;
