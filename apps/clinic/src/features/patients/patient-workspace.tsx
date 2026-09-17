"use client";

import {
  Button,
  EmptyState,
  PageHeader
} from "@karon/design-system";
import Link from "next/link";

import PatientDetail from "@/features/patients/patient-detail";
import { usePatientWorkspace } from "@/features/patients/use-patient-workspace";

type Props = {
  patientId: string;
  visitId?: string;
};

const PatientWorkspace = ({ patientId, visitId }: Props) => {
  const { patient, visit, visits, ready } = usePatientWorkspace(patientId, visitId);

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
    </div>
  );
};

export default PatientWorkspace;
