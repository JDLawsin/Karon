import { type Page } from "@playwright/test";

import { expect, test } from "../fixtures/extended-test";
import { QuotePage } from "./pages/quote-page";

const TENANT = "10000000-0000-4000-8000-000000000001";
const ACTOR = "10000000-0000-4000-8000-000000000002";
const PATIENT = "10000000-0000-4000-8000-000000000003";
const VISIT = "10000000-0000-4000-8000-000000000004";
const CLEANING = "10000000-0000-4000-8000-000000000005";
const CONSULTATION = "10000000-0000-4000-8000-000000000006";

const clinicEvent = (
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

const interceptQuoteData = async (page: Page) => {
  const remoteEvents: Record<string, unknown>[] = [
    clinicEvent(
      "20000000-0000-4000-8000-000000000001",
      "patient.created",
      PATIENT,
      { name: "E2E Quote Patient", mobile: "09170000000" },
      "2026-09-20T01:00:00.000Z"
    ),
    clinicEvent(
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

  await page.route("**/rest/v1/clinic_services**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: CLEANING,
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
        },
        {
          id: CONSULTATION,
          tenant_id: TENANT,
          name: "Consultation",
          description: null,
          icon: null,
          price_minor: null,
          currency_code: null,
          duration_minutes: null,
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
    remoteEvents.push({ ...body, received_at: "2026-09-20T03:00:00.000Z" });
    await route.fulfill({ status: 201, contentType: "application/json", body: "" });
  });

  return remoteEvents;
};

test.describe("visit quote", { tag: "@assistant" }, () => {
  test.use({ storageState: "e2e/.auth/assistant.json" });

  test(
    "builds, accepts, and reopens a clinic-currency quote",
    { tag: "@integration" },
    async ({ page }) => {
      const remoteEvents = await interceptQuoteData(page);
      const quote = new QuotePage(page);
      await quote.goto(PATIENT, VISIT);

      for (const width of [320, 768, 1280] as const) {
        await page.setViewportSize({ width, height: 900 });
        await expect(page.getByRole("button", { name: "Accept quote" })).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth > document.documentElement.clientWidth
          )
        ).toBe(false);
      }

      await page.getByRole("button", { name: "Accept quote" }).click();
      await expect(page.getByRole("alert")).toContainText("Add at least one service");

      await page.getByLabel("Service").selectOption({ label: "Consultation" });
      await page.getByRole("button", { name: "Add line" }).click();
      await expect(page.getByRole("alert")).toContainText(
        "Enter a price for Consultation"
      );
      await page.getByLabel(/Price for Consultation/).fill("300");
      await page.getByRole("button", { name: "Add line" }).click();

      await quote.addService("Cleaning");
      await page.getByLabel("Cleaning quantity").fill("2");
      await page.getByLabel("Cleaning unit price (PHP)").fill("1600");
      await expect(page.getByText("₱3,500.00")).toBeVisible();
      await page.getByRole("button", { name: "Accept quote" }).click();

      await expect(page.getByText("Accepted")).toBeVisible();
      await expect(page.getByText("Total ₱3,500.00")).toBeVisible();
      expect(remoteEvents.at(-1)).toMatchObject({
        event_type: "quote.created",
        payload: { totalMinor: 350_000, currency: "PHP", status: "accepted" }
      });

      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.getByText("Total ₱3,500.00")).toBeVisible();
    }
  );
});
