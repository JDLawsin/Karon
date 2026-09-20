import { type Page } from "@playwright/test";

import { expect, test } from "../fixtures/extended-test";
import { CollectPage } from "./pages/collect-page";

const TENANT = "10000000-0000-4000-8000-000000000001";
const ACTOR = "10000000-0000-4000-8000-000000000002";
const PATIENT = "10000000-0000-4000-8000-000000000003";
const VISIT = "10000000-0000-4000-8000-000000000004";
const SERVICE = "10000000-0000-4000-8000-000000000005";

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

const interceptCollectData = async (page: Page) => {
  const remoteEvents: Record<string, unknown>[] = [
    clinicEvent(
      "20000000-0000-4000-8000-000000000001",
      "patient.created",
      PATIENT,
      { name: "E2E Collect Patient", mobile: "09170000000" },
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
    ),
    clinicEvent(
      "20000000-0000-4000-8000-000000000003",
      "quote.created",
      "20000000-0000-4000-8000-000000000004",
      {
        patientId: PATIENT,
        visitId: VISIT,
        status: "accepted",
        lines: [
          {
            serviceId: SERVICE,
            serviceName: "Cleaning",
            qty: 1,
            amountMinor: 280_000,
            currency: "PHP"
          }
        ],
        totalMinor: 280_000,
        currency: "PHP"
      },
      "2026-09-20T01:02:00.000Z"
    )
  ];
  const paymentWrites: Record<string, unknown>[] = [];

  await page.route("**/rest/v1/clinic_services**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
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
  await page.route("**/rest/v1/rpc/get_visit_balance", async (route) => {
    const paidMinor = paymentWrites.reduce((total, event) => {
      const payload = event.payload as Record<string, unknown>;

      return payload.method === "unpaid"
        ? total
        : total + (payload.amountMinor as number);
    }, 0);

    await route.fulfill({
      status: 200,
      contentType: "application/vnd.pgrst.object+json",
      body: JSON.stringify({
        quote_id: "20000000-0000-4000-8000-000000000004",
        quote_total_minor: 280_000,
        paid_minor: paidMinor,
        remaining_minor: 280_000 - paidMinor,
        currency: "PHP"
      })
    });
  });
  await page.route("**/rest/v1/clinic_events**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          remoteEvents.filter((event) => event.event_type !== "payment.recorded")
        )
      });
      return;
    }

    const body = route.request().postDataJSON() as Record<string, unknown>;
    paymentWrites.push(body);
    remoteEvents.push({ ...body, received_at: "2026-09-20T03:00:00.000Z" });
    await route.fulfill({ status: 201, contentType: "application/json", body: "" });
  });

  return paymentWrites;
};

test.describe("collect payment", { tag: "@assistant" }, () => {
  test.use({ storageState: "e2e/.auth/assistant.json" });

  test(
    "records partial, unpaid, and final payment without exposing assistant reads",
    { tag: "@integration" },
    async ({ page }) => {
      const paymentWrites = await interceptCollectData(page);
      const collect = new CollectPage(page);
      await collect.goto(PATIENT, VISIT);

      for (const width of [320, 768, 1280] as const) {
        await page.setViewportSize({ width, height: 900 });
        await expect(page.getByRole("button", { name: "Record payment" })).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth > document.documentElement.clientWidth
          )
        ).toBe(false);
      }

      await page.getByLabel("Amount (PHP)").fill("0");
      await page.getByRole("button", { name: "Record payment" }).click();
      expect(paymentWrites).toHaveLength(0);

      await collect.record("GCash", "2000");
      await expect(page.getByText("GCash", { exact: true })).toHaveCount(1);
      await expect(page.getByText("₱800.00", { exact: true })).toHaveCount(1);
      expect(paymentWrites.at(-1)).toMatchObject({
        event_type: "payment.recorded",
        payload: {
          patientId: PATIENT,
          visitId: VISIT,
          amountMinor: 200_000,
          currency: "PHP",
          method: "gcash"
        }
      });

      await collect.record("Unpaid", "800");
      await expect(page.getByText("₱800.00", { exact: true })).toHaveCount(2);

      await collect.record("Card", "800");
      await expect(page.getByText("Paid in full")).toBeVisible();
      expect(paymentWrites).toHaveLength(3);

      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.getByText("Paid in full")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Payment history" })).toHaveCount(0);
    }
  );
});
