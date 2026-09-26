import { devices, type Page } from "@playwright/test";

import { expect, test } from "../fixtures/extended-test";
import { OfflineChairLoopPage } from "./pages/offline-chair-loop-page";

const TENANT = "10000000-0000-4000-8000-000000000001";
const ACTOR = "10000000-0000-4000-8000-000000000002";
const PATIENT = "10000000-0000-4000-8000-000000000003";
const VISIT = "10000000-0000-4000-8000-000000000004";
const SERVICE = "10000000-0000-4000-8000-000000000005";
const pixel5 = devices["Pixel 5"];
const pixel5Use = {
  deviceScaleFactor: pixel5.deviceScaleFactor,
  hasTouch: pixel5.hasTouch,
  isMobile: pixel5.isMobile,
  userAgent: pixel5.userAgent,
  viewport: pixel5.viewport
};

const event = (
  id: string,
  eventType: string,
  recordId: string,
  payload: Record<string, unknown>,
  occurredAt: string
) => ({
  id,
  tenant_id: TENANT,
  actor_user_id: ACTOR,
  event_type: eventType,
  record_id: recordId,
  payload,
  occurred_at: occurredAt,
  received_at: occurredAt
});

const interceptChairData = async (page: Page) => {
  const remoteEvents: Record<string, unknown>[] = [
    event(
      "20000000-0000-4000-8000-000000000001",
      "patient.created",
      PATIENT,
      { name: "E2E Offline Patient", mobile: "09170000000" },
      "2026-09-20T01:00:00.000Z"
    ),
    event(
      "20000000-0000-4000-8000-000000000002",
      "appointment.set",
      VISIT,
      {
        patientId: PATIENT,
        startsAt: "2026-09-20T02:00:00.000Z",
        status: "in_chair",
        serviceName: "Cleaning"
      },
      "2026-09-20T01:01:00.000Z"
    )
  ];
  const writes: Record<string, unknown>[] = [];

  await page.route("**/rest/v1/clinic_services**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: SERVICE,
          tenant_id: TENANT,
          name: "Cleaning",
          description: null,
          icon: null,
          price_minor: 150_000,
          currency_code: "PHP",
          duration_minutes: 45,
          created_at: "2026-09-20T00:00:00.000Z",
          updated_at: "2026-09-20T00:00:00.000Z",
          created_by: ACTOR,
          updated_by: ACTOR
        }
      ])
    });
  });
  await page.route("**/rest/v1/clinics**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/vnd.pgrst.object+json",
      body: JSON.stringify({
        id: TENANT,
        name: "Cebu Demo Clinic",
        timezone: "Asia/Manila",
        currency_code: "PHP"
      })
    });
  });
  await page.route("**/rest/v1/booking_requests**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });
  await page.route("**/rest/v1/clinic_events**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(remoteEvents)
      });
      return;
    }

    const body = route.request().postDataJSON() as Record<string, unknown>;
    writes.push(body);
    remoteEvents.push({ ...body, received_at: new Date().toISOString() });
    await route.fulfill({ status: 201, contentType: "application/json", body: "" });
  });

  return writes;
};

test.describe("durable offline chair loop", { tag: "@assistant" }, () => {
  test.use({
    ...pixel5Use,
    storageState: "e2e/.auth/assistant.json"
  });

  test(
    "protects chart, quote, collect, and next visit until reconnect drains once",
    { tag: "@integration" },
    async ({ context, page }) => {
      const writes = await interceptChairData(page);
      const chair = new OfflineChairLoopPage(page);
      await chair.goto(PATIENT, VISIT);

      await context.setOffline(true);
      await chair.chart();
      await expect(page.getByText("E2E offline restoration.")).toBeVisible();
      await chair.quote();
      await expect(page.getByText("Accepted")).toBeVisible();
      await chair.collect();
      await expect(page.getByText("Paid in full")).toBeVisible();

      const future = new Date();
      future.setUTCDate(future.getUTCDate() + 14);
      const date = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(future);
      await chair.schedule(date);

      await expect(
        page.getByRole("status").filter({ hasText: "Will sync when online" })
      ).toBeVisible();
      expect(writes).toHaveLength(0);

      await chair.requestSignOut();
      await expect(
        page.getByRole("heading", { name: "Unsynced work is protected" })
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "Export pending work" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Stay signed in" })).toBeVisible();

      for (const width of [320, 768, 1280] as const) {
        await page.setViewportSize({ width, height: 844 });
        await expect(page.getByRole("button", { name: "Export pending work" })).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth > document.documentElement.clientWidth
          )
        ).toBe(false);
      }

      await page.getByRole("button", { name: "Stay signed in" }).click();

      await context.setOffline(false);
      await expect.poll(() => writes.length).toBe(4);
      expect(writes.map((write) => write.event_type).sort()).toEqual([
        "appointment.set",
        "chart.appended",
        "payment.recorded",
        "quote.created"
      ]);
      expect(new Set(writes.map((write) => write.id)).size).toBe(4);
    }
  );
});
