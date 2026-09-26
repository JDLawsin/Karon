import { randomUUID } from "node:crypto";

import { type Page } from "@playwright/test";

import { expect, test } from "../fixtures/extended-test";
import { NextVisitPage } from "./pages/next-visit-page";
import { PatientsPage } from "./pages/patients-page";

const fakePatient = (prefix: string) => {
  const suffix = randomUUID().replace(/\D/g, "").padEnd(7, "0").slice(0, 7);

  return {
    name: `${prefix} ${randomUUID().slice(0, 8)}`,
    mobile: `0917${suffix}`
  };
};

const interceptEmptyEvents = async (page: Page) => {
  await page.route("**/rest/v1/clinic_events**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      return;
    }

    if (route.request().method() === "POST") {
      await route.fulfill({ status: 201, contentType: "application/json", body: "" });
      return;
    }

    await route.continue();
  });
};

test.describe("patient directory", { tag: "@assistant" }, () => {
  test.use({ storageState: "e2e/.auth/assistant.json" });

  test(
    "creates, searches, and explicitly resolves a duplicate mobile",
    { tag: "@integration" },
    async ({ page }) => {
      const patients = new PatientsPage(page);
      const original = fakePatient("E2E Patient");
      const duplicate = { ...original, name: `E2E Shared ${randomUUID().slice(0, 8)}` };
      await interceptEmptyEvents(page);
      await patients.goto();
      await patients.create(original.name, original.mobile);

      await expect(page.getByRole("heading", { name: original.name, level: 2 })).toBeVisible();
      await patients.search(original.name);
      await expect(page.getByRole("link", { name: new RegExp(original.name) })).toBeVisible();

      const sheet = await patients.openCreate();
      await sheet.getByLabel("Full name").fill(duplicate.name);
      await sheet.getByLabel("Mobile").fill(duplicate.mobile);
      await sheet.getByRole("button", { name: "Create patient" }).click();

      await expect(sheet.getByText("This mobile is already on a patient")).toBeVisible();
      await expect(
        sheet.getByRole("button", { name: `Merge with ${original.name}` })
      ).toBeVisible();
      await expect(sheet.getByRole("button", { name: "Skip" })).toBeVisible();
      await sheet.getByRole("button", { name: "Create anyway" }).click();
      await expect(page.getByRole("heading", { name: duplicate.name, level: 2 })).toBeVisible();
    }
  );

  for (const width of [320, 768, 1280] as const) {
    test(`keeps patient search usable at ${width}px`, async ({ page }) => {
      await interceptEmptyEvents(page);
      await page.setViewportSize({ width, height: 800 });
      const patients = new PatientsPage(page);
      await patients.goto();

      await expect(page.getByRole("heading", { name: "Patients", level: 1 })).toBeVisible();
      await expect(page.getByRole("button", { name: "Add patient" })).toBeVisible();
      await expect(page.getByText("No patients yet")).toBeVisible();

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
      );
      expect(overflow).toBe(false);

      if (width === 320) {
        const drawer = await patients.openCreate();
        await expect(drawer).toBeVisible();
        await expect
          .poll(async () => (await drawer.boundingBox())?.y ?? 0)
          .toBeGreaterThan(400);
      }
    });
  }

  test(
    "schedules a next visit, warns on overbooking, and copies a safe reminder",
    { tag: "@integration" },
    async ({ context, page }) => {
      const remoteEvents: Record<string, unknown>[] = [];
      const patient = fakePatient("E2E Recall");

      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      await page.route("**/rest/v1/clinic_services**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              id: "10000000-0000-4000-8000-000000000001",
              tenant_id: "10000000-0000-4000-8000-000000000002",
              name: "Follow-up check",
              description: null,
              icon: null,
              price_minor: 50000,
              currency_code: "PHP",
              duration_minutes: 30,
              created_at: "2026-09-18T00:00:00.000Z",
              updated_at: "2026-09-18T00:00:00.000Z",
              created_by: "10000000-0000-4000-8000-000000000003",
              updated_by: "10000000-0000-4000-8000-000000000003"
            }
          ])
        });
      });
      await page.route("**/rest/v1/clinics**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/vnd.pgrst.object+json",
          body: JSON.stringify({
            name: "Cebu Demo Clinic",
            timezone: "Asia/Manila",
            currency_code: "PHP"
          })
        });
      });
      await page.route("**/rest/v1/booking_requests**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: "[]"
        });
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
        const saved = {
          ...body,
          received_at: new Date().toISOString()
        };
        remoteEvents.push(saved);

        if (body.event_type === "appointment.set") {
          await route.fulfill({
            status: 201,
            contentType: "application/vnd.pgrst.object+json",
            body: JSON.stringify(saved)
          });
          return;
        }

        await route.fulfill({
          status: 201,
          contentType: "application/vnd.pgrst.object+json",
          body: JSON.stringify(saved)
        });
      });

      const patients = new PatientsPage(page);
      await patients.goto();
      await patients.create(patient.name, patient.mobile);
      const patientId = new URL(page.url()).searchParams.get("patient");

      if (!patientId) {
        throw new Error("Patient creation did not return a patient id.");
      }

      const nextVisit = new NextVisitPage(page);
      await nextVisit.goto(patientId);

      for (const width of [320, 768, 1280] as const) {
        await page.setViewportSize({ width, height: 800 });
        await expect(page.getByLabel("Date")).toBeVisible();
        await expect(page.getByRole("button", { name: "Save next visit" })).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth > document.documentElement.clientWidth
          )
        ).toBe(false);
      }

      const future = new Date();
      future.setUTCDate(future.getUTCDate() + 14);
      const date = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(future);
      const reminderDate = new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
      }).format(new Date(`${date}T10:00:00+08:00`));
      const reminder = `Hi! Reminder from Cebu Demo Clinic: ${reminderDate}. See you then.`;

      await nextVisit.schedule(date, "10:00", "Follow-up check");
      await expect(page.getByText(reminder, { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Copy reminder" }).click();
      await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(reminder);

      await page.getByRole("button", { name: "Save next visit" }).click();
      await expect(
        page.getByText("This time already has an appointment.")
      ).toBeVisible();
      await page.getByRole("button", { name: "Save as overbooked" }).click();
      await expect(page.getByText(reminder, { exact: true })).toBeVisible();

      await page.goto("/today", { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "Today", level: 1 })).toBeVisible();
      for (let day = 0; day < 14; day += 1) {
        await page.getByRole("button", { name: "Next day" }).click();
      }
      await expect(page.getByRole("textbox", { name: /Clinic date,/ })).toHaveValue(date);
      await expect(
        page.getByRole("button", {
          name: `More actions for ${patient.name}`,
          exact: true
        })
      ).toHaveCount(2);
    }
  );
});
