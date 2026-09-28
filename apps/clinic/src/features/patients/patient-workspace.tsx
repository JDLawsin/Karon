"use client";

import {
  Button,
  EmptyState,
  PageHeader
} from "@karon/design-system";
import Link from "next/link";

import Odontogram from "@/features/odontogram/odontogram";
import { useOdontogram } from "@/features/odontogram/use-odontogram";
import CollectPayment from "@/features/payments/collect-payment";
import OpeningBalanceSummary from "@/features/payments/opening-balance-summary";
import { useCollect } from "@/features/payments/use-collect";
import PatientDetail from "@/features/patients/patient-detail";
import NextVisitPanel from "@/features/patients/next-visit-panel";
import { usePatientWorkspace } from "@/features/patients/use-patient-workspace";
import QuoteBuilder from "@/features/quotes/quote-builder";
import { useQuotes } from "@/features/quotes/use-quotes";
import { useClinicServices } from "@/features/services/use-clinic-services";

type Props = {
  patientId: string;
  visitId?: string;
};

const PatientWorkspace = ({ patientId, visitId }: Props) => {
  const { patient, visit, visits, events, ready } = usePatientWorkspace(patientId, visitId);
  const { append, entries, saving } = useOdontogram(patientId, visit?.id, events);
  const {
    services,
    currencyCode,
    locale,
    timezone,
    loading: loadingServices,
    error: serviceError
  } = useClinicServices();
  const { accept, quotes, saving: savingQuote } = useQuotes(patientId, visit?.id, events);
  const {
    balance,
    balanceError,
    balanceLoading,
    collect,
    saving: savingPayment
  } = useCollect(patientId, visit?.id, events);
  const visitLabels = Object.fromEntries(
    visits.map((item) => [
      item.id,
      `Visit · ${new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: timezone
      }).format(new Date(item.startsAt))}`
    ])
  );

  if (!ready) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Patient workspace" />
        <p aria-live="polite" className="text-muted-foreground">
          Opening patient workspace...
        </p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Patient unavailable">
          <Button asChild>
            <Link href="/patients">View patients</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/today">Return to Today</Link>
          </Button>
        </PageHeader>
        <EmptyState title="This patient could not open">
          The patient may not be saved on this device yet. Reconnect, then open them
          from Patients.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader description={patient.mobile} title={patient.name}>
        <Button asChild variant="outline">
          <Link href="/today">Back to Today</Link>
        </Button>
      </PageHeader>
      <PatientDetail
        locale={locale}
        patient={patient}
        timezone={timezone}
        visit={visit}
        visits={visits}
      />
      <OpeningBalanceSummary events={events} locale={locale} patientId={patientId} />
      <Odontogram
        canChart={visit?.status === "in_chair"}
        entries={entries}
        onAppend={append}
        saving={saving}
        visitLabels={visitLabels}
      />
      <QuoteBuilder
        canQuote={visit?.status === "in_chair"}
        currencyCode={currencyCode}
        locale={locale}
        loadingServices={loadingServices}
        onAccept={accept}
        quotes={quotes}
        saving={savingQuote}
        serviceError={serviceError}
        services={services}
        timezone={timezone}
      />
      <CollectPayment
        balance={balance}
        balanceError={balanceError}
        balanceLoading={balanceLoading}
        locale={locale}
        onCollect={collect}
        saving={savingPayment}
      />
      <NextVisitPanel patientId={patientId} />
    </div>
  );
};

export default PatientWorkspace;
