import type { Metadata } from "next";

import PatientDirectory from "@/features/patients/patient-directory";

type Props = {
  searchParams: Promise<{ patient?: string | string[] }>;
};

export const metadata: Metadata = {
  title: "Patients"
};

const PatientsPage = async ({ searchParams }: Props) => {
  const { patient } = await searchParams;

  return (
    <PatientDirectory
      selectedPatientId={Array.isArray(patient) ? patient[0] : patient}
    />
  );
};

export default PatientsPage;
