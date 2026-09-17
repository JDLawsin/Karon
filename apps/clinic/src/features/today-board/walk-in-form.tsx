"use client";

import {
  Alert,
  Button,
  DrawerClose,
  DrawerFooter,
  Input,
  Label
} from "@karon/design-system";
import { useState } from "react";
import { z } from "zod";

import { searchPatients, type PatientSearchRow } from "@/features/patients/patient-search";
import { useRemotePatientSearch } from "@/features/patients/use-patient-directory";
import {
  clinicLocalParts,
  startsAtFromClinicLocal
} from "@/features/today-board/project-today-board";
import FieldError from "@/lib/forms/field-error";
import { markHydrated, useClinicForm } from "@/lib/forms/use-clinic-form";

const walkInSchema = z.object({
  name: z.string().trim().min(1, "Enter a name."),
  mobile: z.string().trim().min(1, "Enter a mobile."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a date."),
  time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Enter a time.")
});

type WalkInDraft = {
  name: string;
  mobile: string;
  startsAt: string;
  patientId?: string;
};

type Props = {
  isDuplicateMobile: (mobile: string) => boolean;
  onSave: (draft: WalkInDraft) => Promise<void>;
  patients: PatientSearchRow[];
};

const WalkInForm = ({ isDuplicateMobile, onSave, patients }: Props) => {
  const [error, setError] = useState<string | null>(null);
  const [existingQuery, setExistingQuery] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const defaults = clinicLocalParts(new Date());
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useClinicForm(walkInSchema, {
    defaultValues: { name: "", mobile: "", date: defaults.date, time: defaults.time }
  });
  const mobile = watch("mobile") ?? "";
  const duplicate = isDuplicateMobile(mobile);
  const { remotePatients, searchingRemotePatients } =
    useRemotePatientSearch(existingQuery);
  const searchablePatients = [
    ...new Map(
      [...remotePatients, ...patients].map((patient) => [patient.id, patient])
    ).values()
  ];
  const selectedPatient = selectedPatientId
    ? searchablePatients.find((patient) => patient.id === selectedPatientId) ?? null
    : null;
  const matches = existingQuery.trim()
    ? searchPatients(searchablePatients, existingQuery, 1, 3).rows
    : [];

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      method="post"
      onSubmit={handleSubmit(async (draft) => {
        setError(null);
        try {
          await onSave({
            name: selectedPatient?.name ?? draft.name,
            mobile: selectedPatient?.mobile ?? draft.mobile,
            startsAt: startsAtFromClinicLocal(draft.date, draft.time),
            ...(selectedPatient ? { patientId: selectedPatient.id } : {})
          });
        } catch {
          setError("Could not save on this device.");
        }
      })}
      ref={markHydrated}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
        <Alert title="Works offline" variant="info">
          Saved on this device. Will sync when online.
        </Alert>
        <div className="flex flex-col gap-2">
          <Label htmlFor="walk-in-existing">Search existing</Label>
          <Input
            autoComplete="off"
            id="walk-in-existing"
            onChange={(event) => {
              setExistingQuery(event.target.value);
              setSelectedPatientId(null);
            }}
            placeholder="Name or mobile"
            type="search"
            value={existingQuery}
          />
        </div>
        {selectedPatient ? (
          <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-primary bg-info-subtle p-3">
            <div className="min-w-0">
              <p className="font-medium">{selectedPatient.name}</p>
              <p className="text-sm tabular-nums text-muted-foreground">
                {selectedPatient.mobile}
              </p>
            </div>
            <Button
              className="w-fit"
              onClick={() => setSelectedPatientId(null)}
              type="button"
              variant="outline"
            >
              Choose another
            </Button>
          </div>
        ) : matches.length > 0 ? (
          <ul className="flex min-w-0 flex-col gap-2" aria-label="Existing patient matches">
            {matches.map((patient) => (
              <li className="flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-card p-3" key={patient.id}>
                <div className="min-w-0">
                  <p className="wrap-anywhere font-medium">{patient.name}</p>
                  <p className="text-sm tabular-nums text-muted-foreground">
                    {patient.mobile}
                  </p>
                </div>
                <Button
                  className="w-fit"
                  onClick={() => {
                    setSelectedPatientId(patient.id);
                    setValue("name", patient.name, { shouldValidate: true });
                    setValue("mobile", patient.mobile, { shouldValidate: true });
                  }}
                  type="button"
                >
                  Use this patient
                </Button>
              </li>
            ))}
          </ul>
        ) : searchingRemotePatients ? (
          <p aria-live="polite" className="text-sm text-muted-foreground">
            Searching synced patients...
          </p>
        ) : null}
        {!selectedPatient ? (
          <>
            <p className="text-sm font-medium text-muted-foreground">Or create new</p>
            <div className="flex flex-col gap-2">
              <Label htmlFor="walk-in-name">Full name</Label>
              <Input
                aria-describedby={errors.name ? "walk-in-name-error" : undefined}
                aria-invalid={Boolean(errors.name)}
                autoComplete="name"
                id="walk-in-name"
                {...register("name")}
              />
              <FieldError id="walk-in-name-error" message={errors.name?.message} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="walk-in-mobile">Mobile</Label>
              <Input
                aria-describedby={
                  errors.mobile
                    ? "walk-in-mobile-error"
                    : duplicate
                      ? "walk-in-mobile-duplicate"
                      : undefined
                }
                aria-invalid={Boolean(errors.mobile)}
                autoComplete="tel"
                id="walk-in-mobile"
                inputMode="tel"
                {...register("mobile")}
              />
              <FieldError id="walk-in-mobile-error" message={errors.mobile?.message} />
            </div>
          </>
        ) : null}
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="walk-in-date">Date</Label>
            <Input
              aria-describedby={errors.date ? "walk-in-date-error" : undefined}
              aria-invalid={Boolean(errors.date)}
              id="walk-in-date"
              type="date"
              {...register("date")}
            />
            <FieldError id="walk-in-date-error" message={errors.date?.message} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="walk-in-time">Time</Label>
            <Input
              aria-describedby={errors.time ? "walk-in-time-error" : undefined}
              aria-invalid={Boolean(errors.time)}
              id="walk-in-time"
              type="time"
              {...register("time")}
            />
            <FieldError id="walk-in-time-error" message={errors.time?.message} />
          </div>
        </div>
        {duplicate && !selectedPatient ? (
          <Alert
            id="walk-in-mobile-duplicate"
            title="This mobile is already on a patient"
            variant="info"
          >
            You can still add.
          </Alert>
        ) : null}
        {error ? (
          <Alert title="Could not add patient" variant="danger">
            {error}
          </Alert>
        ) : null}
      </div>
      <DrawerFooter>
        <Button disabled={isSubmitting} type="submit">
          Add patient
        </Button>
        <DrawerClose render={<Button type="button" variant="outline" />}>
          Cancel
        </DrawerClose>
      </DrawerFooter>
    </form>
  );
};

export default WalkInForm;
