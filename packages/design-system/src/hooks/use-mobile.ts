"use client";

import { useSyncExternalStore } from "react";

const MOBILE_BREAKPOINT = 768;
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

const subscribe = (onChange: () => void) => {
  if (typeof window.matchMedia !== "function") {
    return () => {};
  }

  const media = window.matchMedia(MOBILE_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};

const getSnapshot = () =>
  typeof window.matchMedia === "function"
    ? window.innerWidth < MOBILE_BREAKPOINT
    : false;

const useIsMobile = () =>
  useSyncExternalStore(subscribe, getSnapshot, () => false);

export { useIsMobile };
