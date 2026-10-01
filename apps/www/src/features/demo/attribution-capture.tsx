"use client";

import { useEffect } from "react";

const UTM_STORAGE_KEY = "karon_utm";
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;

declare global {
  interface Window {
    __karonLanding?: { landingPath: string; referrerDomain?: string };
  }
}

const AttributionCapture = () => {
  useEffect(() => {
    const url = new URL(window.location.href);
    const values = Object.fromEntries(UTM_KEYS.flatMap((key) => {
      const value = url.searchParams.get(key)?.trim().toLowerCase().slice(0, 100);
      return value ? [[key, value]] : [];
    }));

    if (Object.keys(values).length > 0) {
      sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(values));
    }

    let referrerDomain: string | undefined;
    try {
      referrerDomain = document.referrer ? new URL(document.referrer).hostname.toLowerCase() : undefined;
    } catch {
      referrerDomain = undefined;
    }

    window.__karonLanding ??= { landingPath: url.pathname, referrerDomain };
  }, []);

  return null;
};

export { UTM_STORAGE_KEY };
export default AttributionCapture;
