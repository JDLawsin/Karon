"use client";

import {
  Button,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  EmptyState,
  Input,
  Label,
  PageHeader,
  useIsMobile
} from "@karon/design-system";
import { ArrowLeft, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import PatientDetail from "@/features/patients/patient-detail";
import PatientForm from "@/features/patients/patient-form";
import { searchPatients } from "@/features/patients/patient-search";
import { usePatientDirectory } from "@/features/patients/use-patient-directory";
import { foldVisits } from "@/features/today-board/project-today-board";

type Props = {
  selectedPatientId?: string;
};

const PatientDirectory = ({ selectedPatientId }: Props) => {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const {
    createPatient,
    events,
    findDuplicatePatients,
    mergePatient,
    patients,
    ready,
    searchingOnline
  } = usePatientDirectory(query, selectedPatientId);
  const results = useMemo(
    () => searchPatients(patients, query, page),
    [page, patients, query]
  );
  const workspace = useMemo(() => {
    const { patients: patientMap, visits: visitMap } = foldVisits(events);
    const patient = selectedPatientId
      ? patientMap.get(selectedPatientId) ??
        patients.find((item) => item.id === selectedPatientId) ??
        null
      : null;
    const visits = selectedPatientId
      ? [...visitMap.entries()]
          .filter(([, visit]) => visit.patientId === selectedPatientId)
          .map(([id, visit]) => ({ id, ...visit }))
          .sort((left, right) => right.startsAt.localeCompare(left.startsAt))
      : [];

    return { patient, visits };
  }, [events, patients, selectedPatientId]);

  const openPatient = (patientId: string) => {
    setCreateOpen(false);
    router.push(`/patients?patient=${encodeURIComponent(patientId)}`);
  };

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        description="Search this clinic by name or mobile."
        title="Patients"
      >
        <Button onClick={() => setCreateOpen(true)} type="button">
          Add patient
        </Button>
      </PageHeader>

      <div className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(20rem,0.85fr)] xl:grid-cols-[minmax(0,1fr)_minmax(24rem,0.7fr)]">
        <section
          aria-label="Patient search"
          className={selectedPatientId ? "hidden min-w-0 flex-col gap-4 md:flex" : "flex min-w-0 flex-col gap-4"}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="patient-search">Search</Label>
            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                autoComplete="off"
                className="pl-10"
                id="patient-search"
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Name or mobile"
                type="search"
                value={query}
              />
            </div>
          </div>

          {!ready ? (
            <p aria-live="polite" className="text-muted-foreground">
              Loading patients...
            </p>
          ) : patients.length === 0 ? (
            <EmptyState title="No patients yet">
              Add the first walk-in now. Clinic import will appear here when Import ships.
            </EmptyState>
          ) : results.rows.length === 0 ? (
            <EmptyState title="No matching patients">
              Try another name or mobile number.
            </EmptyState>
          ) : (
            <>
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {results.total} {results.total === 1 ? "patient" : "patients"}
                {searchingOnline ? " · Searching synced patients..." : ""}
              </p>
              <ul className="flex min-w-0 flex-col gap-2">
                {results.rows.map((patient) => {
                  const active = patient.id === selectedPatientId;

                  return (
                    <li key={patient.id}>
                      <Link
                        aria-current={active ? "page" : undefined}
                        className={`flex min-h-(--control-min-height) min-w-0 flex-col justify-center gap-1 rounded-lg border bg-card px-4 py-3 transition-colors duration-(--motion-duration) focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                          active
                            ? "border-primary"
                            : "border-border hover:bg-muted"
                        }`}
                        href={`/patients?patient=${encodeURIComponent(patient.id)}`}
                      >
                        <span className="wrap-anywhere font-medium">{patient.name}</span>
                        <span className="text-sm tabular-nums text-muted-foreground">
                          {patient.mobile}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {results.pageCount > 1 ? (
                <nav
                  aria-label="Patient search pages"
                  className="flex items-center justify-between gap-3"
                >
                  <Button
                    disabled={results.page === 1}
                    onClick={() => setPage((current) => current - 1)}
                    type="button"
                    variant="outline"
                  >
                    Previous
                  </Button>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    Page {results.page} of {results.pageCount}
                  </span>
                  <Button
                    disabled={results.page === results.pageCount}
                    onClick={() => setPage((current) => current + 1)}
                    type="button"
                    variant="outline"
                  >
                    Next
                  </Button>
                </nav>
              ) : null}
            </>
          )}
        </section>

        <aside
          aria-label="Patient workspace"
          className={`min-w-0 rounded-lg border border-border bg-card p-4 sm:p-5 ${
            selectedPatientId ? "block" : "hidden md:block"
          }`}
        >
          {workspace.patient ? (
            <div className="flex min-w-0 flex-col gap-4">
              <Button asChild className="w-fit md:hidden" variant="outline">
                <Link href="/patients">
                  <ArrowLeft aria-hidden />
                  Back to patients
                </Link>
              </Button>
              <PatientDetail
                patient={workspace.patient}
                visit={workspace.visits.find((visit) =>
                  ["pending_review", "confirmed", "waiting", "in_chair"].includes(
                    visit.status
                  )
                )}
                visits={workspace.visits}
              />
            </div>
          ) : selectedPatientId && searchingOnline ? (
            <p aria-live="polite" className="text-muted-foreground">
              Opening patient workspace...
            </p>
          ) : selectedPatientId && ready ? (
            <EmptyState title="Patient not found">
              This patient is not available in this clinic on this device.
            </EmptyState>
          ) : (
            <EmptyState title="Select a patient">
              Choose a search result to open the workspace.
            </EmptyState>
          )}
        </aside>
      </div>

      <Drawer
        onOpenChange={setCreateOpen}
        open={createOpen}
        showSwipeHandle={isMobile}
        swipeDirection={isMobile ? "down" : "right"}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Add patient</DrawerTitle>
            <DrawerDescription>
              Saves on this device first and syncs when online.
            </DrawerDescription>
          </DrawerHeader>
          <PatientForm
            onComplete={openPatient}
            onCreate={createPatient}
            onFindDuplicates={findDuplicatePatients}
            onMerge={mergePatient}
            onSkip={() => setCreateOpen(false)}
          />
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default PatientDirectory;
