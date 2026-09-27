import { QueryClient, QueryClientProvider, onlineManager } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const TENANT = "11111111-1111-4111-8111-111111111111";
const cachedSettings = {
  currencyCode: "SGD",
  locale: "en-SG",
  timezone: "Asia/Singapore"
};

const mocks = vi.hoisted(() => {
  const meta = {
    get: vi.fn(),
    put: vi.fn()
  };
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn()
  };

  return {
    meta,
    openClinicDb: vi.fn(async () => ({ meta })),
    supabase: { from: vi.fn(() => query) },
    query
  };
});

vi.mock("@/lib/auth/clinic-session", () => ({
  useClinicSession: () => ({ membership: { tenantId: TENANT } })
}));

vi.mock("@/lib/db/clinic-db", () => ({
  openClinicDb: mocks.openClinicDb
}));

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabase: () => mocks.supabase
}));

import {
  loadClinicRegionalSettings,
  useClinicRegionalSettings
} from "./use-clinic-regional-settings";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = "ClinicRegionalSettingsTestWrapper";

  return Wrapper;
};

describe("useClinicRegionalSettings", () => {
  beforeEach(() => {
    mocks.openClinicDb.mockResolvedValue({ meta: mocks.meta });
    mocks.meta.get.mockResolvedValue({
      key: "clinicRegionalSettings",
      value: JSON.stringify(cachedSettings)
    });
    mocks.meta.put.mockResolvedValue(undefined);
    mocks.query.single.mockResolvedValue({
      data: null,
      error: new Error("offline")
    });
  });

  afterEach(() => {
    onlineManager.setOnline(true);
    vi.clearAllMocks();
  });

  it("loads cached tenant settings while TanStack Query is offline", async () => {
    onlineManager.setOnline(false);
    const { result } = renderHook(() => useClinicRegionalSettings(), {
      wrapper: createWrapper()
    });

    await waitFor(() => expect(result.current.settings).toEqual(cachedSettings));
    expect(mocks.supabase.from).not.toHaveBeenCalled();
  });

  it("loads server settings when IndexedDB cannot open", async () => {
    mocks.openClinicDb.mockRejectedValue(new Error("IndexedDB unavailable"));
    mocks.query.single.mockResolvedValue({
      data: {
        currency_code: "USD",
        locale: "en-US",
        timezone: "America/New_York"
      },
      error: null
    });

    await expect(loadClinicRegionalSettings(TENANT)).resolves.toEqual({
      currencyCode: "USD",
      locale: "en-US",
      timezone: "America/New_York"
    });
  });

  it("keeps validated server settings when the cache write fails", async () => {
    mocks.meta.put.mockRejectedValue(new Error("quota exceeded"));
    mocks.query.single.mockResolvedValue({
      data: {
        currency_code: "EUR",
        locale: "de-DE",
        timezone: "Europe/Berlin"
      },
      error: null
    });

    await expect(loadClinicRegionalSettings(TENANT)).resolves.toEqual({
      currencyCode: "EUR",
      locale: "de-DE",
      timezone: "Europe/Berlin"
    });
  });

  it("does not invent tenant settings when neither server nor cache is available", async () => {
    mocks.meta.get.mockResolvedValue(undefined);

    await expect(loadClinicRegionalSettings(TENANT)).rejects.toThrow(
      "Could not load clinic regional settings."
    );
  });
});
