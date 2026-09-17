"use client";

import { liveQuery } from "dexie";
import { useDebouncedValue } from "@karon/design-system";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { savePatient, type PatientDraft } from "@/features/patients/local";
import {
  findPatientsByMobile,
  parsePatientSearchRows,
  patientSearchTerms
} from "@/features/patients/patient-search";
import { patientsFromEvents } from "@/features/today-board/project-today-board";
import { useClinicSession } from "@/lib/auth/clinic-session";
import { openClinicDb } from "@/lib/db/clinic-db";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import type { ClinicEvent } from "@/lib/sync/event-schema";

const PATIENT_COLUMNS = "id, name, mobile, email";

const fetchRemotePatients = async (tenantId: string, query: string) => {
  const terms = patientSearchTerms(query);
  const supabase = createBrowserSupabase();
  const requests = [];

  if (terms.name) {
    requests.push(
      supabase
        .from("patients")
        .select(PATIENT_COLUMNS)
        .eq("tenant_id", tenantId)
        .ilike("name", `%${terms.name}%`)
        .order("name")
        .limit(50)
    );
  }

  if (terms.mobile) {
    requests.push(
      supabase
        .from("patients")
        .select(PATIENT_COLUMNS)
        .eq("tenant_id", tenantId)
        .like("mobile_digits", `%${terms.mobile}%`)
        .order("name")
        .limit(50)
    );
  }

  const responses = await Promise.all(requests);
  const failed = responses.find((response) => response.error);

  if (failed?.error) {
    throw new Error("Could not search synced patients.");
  }

  return parsePatientSearchRows(responses.flatMap((response) => response.data ?? []));
};

const fetchRemotePatient = async (tenantId: string, patientId: string) => {
  const supabase = createBrowserSupabase();
  const { data, error } = await supabase
    .from("patients")
    .select(PATIENT_COLUMNS)
    .eq("tenant_id", tenantId)
    .eq("id", patientId)
    .maybeSingle();

  if (error) {
    throw new Error("Could not open the synced patient.");
  }

  return data ? parsePatientSearchRows([data])[0] ?? null : null;
};

const useRemotePatientSearch = (query: string) => {
  const { membership } = useClinicSession();
  const debouncedQuery = useDebouncedValue(query, 150);
  const terms = patientSearchTerms(debouncedQuery);
  const remoteSearch = useQuery({
    queryKey: ["patient-search", membership.tenantId, debouncedQuery],
    queryFn: () => fetchRemotePatients(membership.tenantId, debouncedQuery),
    enabled: Boolean(terms.name || terms.mobile),
    staleTime: 10_000
  });

  return {
    remotePatients: remoteSearch.data ?? [],
    searchingRemotePatients: remoteSearch.isFetching
  };
};

const usePatientDirectory = (query: string, selectedPatientId?: string) => {
  const { membership, userId } = useClinicSession();
  const { remotePatients, searchingRemotePatients } = useRemotePatientSearch(query);
  const [events, setEvents] = useState<ClinicEvent[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    void (async () => {
      const db = await openClinicDb(membership.tenantId);

      if (cancelled) {
        return;
      }

      const subscription = liveQuery(() => db.events.toArray()).subscribe({
        next: (rows) => {
          if (!cancelled) {
            setEvents(rows);
            setReady(true);
          }
        },
        error: () => {
          if (!cancelled) {
            setEvents([]);
            setReady(true);
          }
        }
      });
      unsubscribe = () => subscription.unsubscribe();
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [membership.tenantId]);

  const localPatients = useMemo(() => patientsFromEvents(events), [events]);
  const localSelected = selectedPatientId
    ? localPatients.some((patient) => patient.id === selectedPatientId)
    : false;
  const remoteSelected = useQuery({
    queryKey: ["patient", membership.tenantId, selectedPatientId],
    queryFn: () =>
      selectedPatientId
        ? fetchRemotePatient(membership.tenantId, selectedPatientId)
        : Promise.resolve(null),
    enabled: Boolean(selectedPatientId && !localSelected),
    staleTime: 30_000
  });
  const patients = useMemo(() => {
    const combined = new Map(
      [...remotePatients, ...(remoteSelected.data ? [remoteSelected.data] : [])].map(
        (patient) => [patient.id, patient]
      )
    );

    for (const patient of localPatients) {
      combined.set(patient.id, patient);
    }

    return [...combined.values()];
  }, [localPatients, remotePatients, remoteSelected.data]);

  const createPatient = async (draft: PatientDraft) => {
    const db = await openClinicDb(membership.tenantId);

    return savePatient(db, {
      ...draft,
      tenantId: membership.tenantId,
      actorUserId: userId
    });
  };

  const mergePatient = async (patientId: string, draft: PatientDraft) => {
    const db = await openClinicDb(membership.tenantId);
    const existing = patients.find((patient) => patient.id === patientId);
    const email = draft.email ?? existing?.email;

    return savePatient(db, {
      ...draft,
      ...(email ? { email } : {}),
      patientId,
      tenantId: membership.tenantId,
      actorUserId: userId
    });
  };

  const findDuplicatePatients = async (mobile: string) => {
    const localMatches = findPatientsByMobile(localPatients, mobile);

    if (!navigator.onLine) {
      return localMatches;
    }

    try {
      const remoteMatches = findPatientsByMobile(
        await fetchRemotePatients(membership.tenantId, mobile),
        mobile
      );
      const matches = new Map(
        [...remoteMatches, ...localMatches].map((patient) => [patient.id, patient])
      );

      return [...matches.values()];
    } catch {
      return localMatches;
    }
  };

  return {
    createPatient,
    events,
    findDuplicatePatients,
    mergePatient,
    patients,
    ready,
    searchingOnline: searchingRemotePatients || remoteSelected.isFetching
  };
};

export { usePatientDirectory, useRemotePatientSearch };
