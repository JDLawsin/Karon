import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle
} from "@karon/design-system";
import Link from "next/link";

import {
  securityControls,
  securityFaqs,
  securityPageCopy
} from "../../../content/security";
import Claim from "../claim/claim";

const SecurityPage = () => {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: securityFaqs.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer }
    }))
  };

  return (
    <main data-page="security">
      <section className="mx-auto max-w-5xl px-4 pb-10 pt-12 sm:px-6 sm:pb-14 sm:pt-16 lg:px-8 lg:pt-20">
        <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">
          {securityPageCopy.title}
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          {securityPageCopy.description}
        </p>
      </section>

      <section aria-labelledby="security-controls-heading" className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
        <h2 className="text-3xl font-bold tracking-tight" id="security-controls-heading">
          {securityPageCopy.controlsHeading}
        </h2>
        <ul className="mt-8 grid gap-5 md:grid-cols-2">
          {securityControls.map(({ claimId, explanation }) => (
            <li className="min-w-0" key={claimId}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle><h3><Claim id={claimId} /></h3></CardTitle>
                  <CardDescription className="text-base">{explanation}</CardDescription>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ul>
        <p className="mt-8">
          <Link className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline" href="/.well-known/security.txt">
            {securityPageCopy.disclosure}
          </Link>
        </p>
      </section>

      <section aria-labelledby="security-faq-heading" className="bg-card">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <h2 className="text-3xl font-bold tracking-tight" id="security-faq-heading">
            {securityPageCopy.faqHeading}
          </h2>
          <div className="mt-8 space-y-4">
            {securityFaqs.map(({ question, answer }) => (
              <details className="rounded-lg bg-background p-5" key={question}>
                <summary className="min-h-11 cursor-pointer py-2 text-lg font-bold text-foreground marker:text-primary">
                  {question}
                </summary>
                <p className="pb-2 pr-4 text-muted-foreground">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replaceAll("<", "\\u003c") }} type="application/ld+json" />
    </main>
  );
};

export default SecurityPage;
