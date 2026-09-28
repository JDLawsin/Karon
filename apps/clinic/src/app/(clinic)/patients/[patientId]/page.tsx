import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import PatientWorkspace from "@/features/patients/patient-workspace";

type Props = {
  params: Promise<{ patientId: string }>;
  searchParams: Promise<{ visit?: string | string[] }>;
};

const routeIdSchema = z.uuid();

export const metadata: Metadata = {
  title: "Patient workspace"
};

const PatientPage = async ({ params, searchParams }: Props) => {
  const { patientId } = await params;
  const { visit } = await searchParams;
  const visitId = Array.isArray(visit) ? visit[0] : visit;

  if (
    !routeIdSchema.safeParse(patientId).success ||
    (visitId !== undefined && !routeIdSchema.safeParse(visitId).success)
  ) {
    notFound();
  }

  return <PatientWorkspace patientId={patientId} visitId={visitId} />;
};

export default PatientPage;
