import { Button } from "@karon/design-system";
import Link from "next/link";

type Props = {
  contactEmail?: string;
  responsePromise?: string;
};

const firstNotePrompts = [
  {
    title: "Your clinic",
    description: "Your clinic name and city are enough to begin."
  },
  {
    title: "The work",
    description: "Tell us which part of the clinic day is hardest to hold together."
  },
  {
    title: "The next step",
    description: "Ask a question, share a concern, or tell us what you want to see."
  }
] as const;

const ContactPage = ({ contactEmail, responsePromise }: Props) => {
  const mailtoHref = contactEmail
    ? `mailto:${contactEmail}?subject=${encodeURIComponent("A question for Karon")}`
    : null;

  return (
    <main className="selection:bg-foreground selection:text-background" data-page="contact">
      <section className="relative overflow-hidden border-b border-border lg:min-h-[calc(100svh-4rem)]">
        <div aria-hidden className="absolute inset-y-0 left-0 hidden w-1/2 bg-primary lg:block" />

        <div className="relative mx-auto grid max-w-7xl lg:min-h-[calc(100svh-4rem)] lg:grid-cols-2 lg:grid-rows-[1fr_auto]">
          <div className="bg-primary px-4 py-10 text-primary-foreground sm:px-6 sm:py-20 lg:col-start-1 lg:row-start-1 lg:bg-transparent lg:px-8 lg:pb-8 lg:pt-24">
            <h1 className="max-w-xl text-balance text-5xl font-extrabold leading-[0.98] tracking-[-0.035em] sm:text-6xl lg:text-7xl">
              Tell us what your clinic day needs.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-primary-foreground sm:mt-6 sm:text-xl">
              Bring us a booking question, a workflow you want to show, or a concern about Karon. Start with the part that matters today.
            </p>
          </div>

          <div className="order-2 flex items-center px-4 py-10 sm:px-6 sm:py-20 lg:order-none lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:px-12 lg:py-24">
            <div className="w-full max-w-xl lg:ml-auto">
              <h2 className="text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
                {mailtoHref ? "Start with an email" : "Send us a request"}
              </h2>

              {mailtoHref && contactEmail ? (
                <>
                  <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground sm:mt-5 sm:text-lg">
                    Send your note directly to the Karon team.
                    {responsePromise && <> We aim to reply {responsePromise}.</>}
                  </p>
                  <div className="mt-6 bg-muted p-4 sm:mt-8 sm:p-6">
                    <p className="text-sm font-semibold text-muted-foreground">Email</p>
                    <p className="mt-2 break-all text-2xl font-extrabold tracking-tight sm:text-3xl">
                      {contactEmail}
                    </p>
                  </div>
                  <Button asChild className="mt-5 w-full sm:mt-6 sm:w-auto" size="lg">
                    <a href={mailtoHref}>Write an email</a>
                  </Button>
                </>
              ) : (
                <>
                  <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">
                    The direct email address is still being set up. Use the request page and we will route your note.
                  </p>
                  <Button asChild className="mt-6 w-full sm:w-auto" size="lg">
                    <Link href="/demo?intent=demo">Send a request</Link>
                  </Button>
                </>
              )}

              <p className="mt-5 max-w-lg text-sm leading-relaxed text-muted-foreground">
                Please do not include patient names, phone numbers, diagnoses, or other patient details.
              </p>

              {mailtoHref && (
                <div className="mt-10 border-t border-border pt-8">
                  <h3 className="text-xl font-bold">Prefer to walk us through it?</h3>
                  <p className="mt-2 max-w-lg leading-relaxed text-muted-foreground">
                    Request a guided demo and include a time that usually works for your clinic.
                  </p>
                  <Button asChild className="mt-5 w-full border-2 border-primary sm:w-auto" variant="outline">
                    <Link href="/demo?intent=demo">Book a demo</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="order-3 bg-muted px-4 pb-14 pt-6 text-foreground sm:px-6 sm:pb-20 lg:order-none lg:col-start-1 lg:row-start-2 lg:bg-transparent lg:px-8 lg:pb-24 lg:pt-8 lg:text-primary-foreground">
            <div className="max-w-xl">
              <h2 className="text-xl font-bold">A useful first note includes</h2>
              <dl className="mt-5 border-y border-border lg:border-primary-foreground/30">
                {firstNotePrompts.map(({ title, description }) => (
                  <div className="grid gap-1 border-b border-border py-4 last:border-b-0 sm:grid-cols-[8rem_1fr] sm:gap-6 lg:border-primary-foreground/30" key={title}>
                    <dt className="font-bold">{title}</dt>
                    <dd className="leading-relaxed text-muted-foreground lg:text-primary-foreground">{description}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default ContactPage;
