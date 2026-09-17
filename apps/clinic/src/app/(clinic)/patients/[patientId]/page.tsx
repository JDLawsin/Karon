import type { Metadata } from "next";

import PatientWorkspace from "@/features/patients/patient-workspace";

type Props = {
  params: Promise<{ patientId: string }>;
  searchParams: Promise<{ visit?: string | string[] }>;
};

export const metadata: Metadata = {
  title: "Patient workspace"
};

const PatientPage = async ({ params, searchParams }: Props) => {
  const { patientId } = await params;
  const { visit } = await searchParams;

  return (
    <PatientWorkspace
      patientId={patientId}
      visitId={Array.isArray(visit) ? visit[0] : visit}
    />
  );
};

export default PatientPage;
