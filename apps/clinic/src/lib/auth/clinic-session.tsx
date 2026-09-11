"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { Membership } from "@/features/auth/resolve-auth-destination";

type ClinicSession = {
  membership: Membership;
  userId: string;
};

const ClinicSessionContext = createContext<ClinicSession | null>(null);

type ClinicSessionProviderProps = {
  membership: Membership;
  userId: string;
  children: ReactNode;
};

const ClinicSessionProvider = ({
  membership,
  userId,
  children
}: ClinicSessionProviderProps) => (
  <ClinicSessionContext.Provider value={{ membership, userId }}>
    {children}
  </ClinicSessionContext.Provider>
);

const useClinicSession = () => {
  const session = useContext(ClinicSessionContext);

  if (!session) {
    throw new Error("useClinicSession requires ClinicSessionProvider");
  }

  return session;
};

export { ClinicSessionProvider, useClinicSession };
export type { ClinicSession };
