import { Alert, KaronWordmark } from "@karon/design-system";
import Link from "next/link";

import { BOOKING_PRIVACY_NOTICE } from "@/features/privacy/privacy-policy";

type Props = {
  clinicName?: string;
  clinicPhone?: string | null;
  returnHref?: string;
};

const PrivacyNotice = ({
  clinicName = "your clinic",
  clinicPhone,
  returnHref = "/settings"
}: Props) => (
  <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
    <header className="flex min-w-0 flex-wrap items-center justify-between gap-4">
      <KaronWordmark className="h-8 w-auto" />
      <Link
        className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        href={returnHref}
      >
        Back
      </Link>
    </header>

    <article className="flex min-w-0 flex-col gap-8">
      <div className="flex min-w-0 flex-col gap-3">
        <p className="text-sm font-medium text-primary">Design-partner minimum</p>
        <h1 className="text-3xl font-(--heading-weight) tracking-(--heading-tracking) sm:text-4xl">
          Privacy notice
        </h1>
        <p className="text-sm text-muted-foreground">
          Version {BOOKING_PRIVACY_NOTICE.version}
        </p>
      </div>

      <Alert title="Counsel review is pending.">
        {BOOKING_PRIVACY_NOTICE.counselNotice}
      </Alert>

      <section className="flex flex-col gap-3" aria-labelledby="privacy-who">
        <h2 className="text-xl font-(--heading-weight)" id="privacy-who">
          Who handles your information
        </h2>
        <p>{BOOKING_PRIVACY_NOTICE.controller(clinicName)}</p>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="privacy-collect">
        <h2 className="text-xl font-(--heading-weight)" id="privacy-collect">
          What booking collects
        </h2>
        <ul className="list-disc space-y-2 pl-6">
          {BOOKING_PRIVACY_NOTICE.collected.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="privacy-use">
        <h2 className="text-xl font-(--heading-weight)" id="privacy-use">
          Why it is used
        </h2>
        <p>{BOOKING_PRIVACY_NOTICE.use}</p>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="privacy-share">
        <h2 className="text-xl font-(--heading-weight)" id="privacy-share">
          Who can receive it
        </h2>
        <p>{BOOKING_PRIVACY_NOTICE.recipients}</p>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="privacy-retention">
        <h2 className="text-xl font-(--heading-weight)" id="privacy-retention">
          Retention and deletion
        </h2>
        <p>{BOOKING_PRIVACY_NOTICE.retention}</p>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="privacy-rights">
        <h2 className="text-xl font-(--heading-weight)" id="privacy-rights">
          Your choices and rights
        </h2>
        <p>{BOOKING_PRIVACY_NOTICE.rights}</p>
        {clinicPhone ? (
          <p>
            Contact {clinicName} at{" "}
            <a
              className="font-medium text-primary underline-offset-4 hover:underline"
              href={`tel:${clinicPhone.replace(/[^\d+]/g, "")}`}
            >
              {clinicPhone}
            </a>
            .
          </p>
        ) : (
          <p>{BOOKING_PRIVACY_NOTICE.clinicContactFallback}</p>
        )}
        <p>
          You can also read the{" "}
          <a
            className="font-medium text-primary underline-offset-4 hover:underline"
            href="https://privacy.gov.ph/data-subject-rights/"
            rel="noopener noreferrer"
            target="_blank"
          >
            National Privacy Commission guide to data-subject rights
          </a>
          .
        </p>
      </section>

      <section className="flex flex-col gap-3 border-t border-border pt-6" aria-labelledby="privacy-clinics">
        <h2 className="text-xl font-(--heading-weight)" id="privacy-clinics">
          For clinics
        </h2>
        <p>{BOOKING_PRIVACY_NOTICE.clinicAgreement}</p>
        <a
          className="inline-flex min-h-11 w-fit items-center font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          download
          href={BOOKING_PRIVACY_NOTICE.processingAgreementDownload}
        >
          Download processing-agreement template
        </a>
      </section>
    </article>
  </main>
);

export default PrivacyNotice;
