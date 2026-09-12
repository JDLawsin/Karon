"use client";

import { createContext, useContext } from "react";

const ClinicChromeActionsContext = createContext<HTMLElement | null>(null);

const useClinicChromeActions = () => useContext(ClinicChromeActionsContext);

export { ClinicChromeActionsContext, useClinicChromeActions };
