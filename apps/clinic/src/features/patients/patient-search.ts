import { z } from "zod";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

const patientSearchRowSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(120),
  mobile: z.string().trim().min(7).max(20),
  email: z.string().trim().email().max(254).nullish()
});

type PatientSearchRow = {
  id: string;
  name: string;
  mobile: string;
  email?: string;
};

type PatientSearchResult = {
  rows: PatientSearchRow[];
  page: number;
  pageCount: number;
  total: number;
};

const mobileDigits = (value: string) => {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("0063") && digits.length === 14) {
    return `0${digits.slice(4)}`;
  }

  return digits.startsWith("63") && digits.length === 12
    ? `0${digits.slice(2)}`
    : digits;
};

const patientSearchTerms = (query: string) => ({
  name: query.trim().toLocaleLowerCase().replace(/[%_*]/g, "").trim(),
  mobile: mobileDigits(query)
});

const parsePatientSearchRows = (input: unknown): PatientSearchRow[] =>
  z.array(patientSearchRowSchema).parse(input).map((patient) => ({
    id: patient.id,
    name: patient.name,
    mobile: patient.mobile,
    ...(patient.email ? { email: patient.email } : {})
  }));

const searchPatients = (
  patients: PatientSearchRow[],
  query: string,
  requestedPage = 1,
  requestedPageSize = DEFAULT_PAGE_SIZE
): PatientSearchResult => {
  const { name, mobile } = patientSearchTerms(query);
  const pageSize = Math.min(Math.max(Math.trunc(requestedPageSize), 1), MAX_PAGE_SIZE);
  const matches = patients
    .filter(
      (patient) =>
        (!name && !mobile) ||
        (name && patient.name.toLocaleLowerCase().includes(name)) ||
        (mobile && mobileDigits(patient.mobile).includes(mobile))
    )
    .sort(
      (left, right) =>
        left.name.localeCompare(right.name, "en", { sensitivity: "base" }) ||
        left.id.localeCompare(right.id)
    );
  const pageCount = Math.max(1, Math.ceil(matches.length / pageSize));
  const page = Math.min(Math.max(Math.trunc(requestedPage), 1), pageCount);
  const offset = (page - 1) * pageSize;

  return {
    rows: matches.slice(offset, offset + pageSize),
    page,
    pageCount,
    total: matches.length
  };
};

const findPatientsByMobile = (patients: PatientSearchRow[], mobile: string) => {
  const needle = mobileDigits(mobile);

  return needle
    ? patients.filter((patient) => mobileDigits(patient.mobile) === needle)
    : [];
};

export {
  findPatientsByMobile,
  mobileDigits,
  parsePatientSearchRows,
  patientSearchTerms,
  searchPatients
};
export type { PatientSearchResult, PatientSearchRow };
