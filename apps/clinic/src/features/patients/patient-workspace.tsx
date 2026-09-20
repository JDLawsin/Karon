"use client";

import {
  Button,
  EmptyState,
  PageHeader
} from "@karon/design-system";
import Link from "next/link";

import Odontogram from "@/features/odontogram/odontogram";
import { useOdontogram } from "@/features/odontogram/use-odontogram";
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
    loading: loadingServices,
    error: serviceError
  } = useClinicServices();
  const { accept, quotes, saving: savingQuote } = useQuotes(patientId, visit?.id, events);
  const visitLabels = Object.fromEntries(
    visits.map((item) => [
      item.id,
      `Visit · ${new Intl.DateTimeFormat("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "Asia/Manila"
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
        <PageHeader title="Patient not found">
          <Button asChild variant="outline">
            <Link href="/today">Back to Today</Link>
          </Button>
        </PageHeader>
        <EmptyState title="Not available on this device">
          This patient is not available in this clinic on this device.
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
      <PatientDetail patient={patient} visit={visit} visits={visits} />
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
        loadingServices={loadingServices}
        onAccept={accept}
        quotes={quotes}
        saving={savingQuote}
        serviceError={serviceError}
        services={services}
      />
      <NextVisitPanel patientId={patientId} />
    </div>
  );
};

export default PatientWorkspace;
