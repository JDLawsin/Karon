import { randomUUID } from "node:crypto";

import { type Page } from "@playwright/test";

import { expect, test } from "../fixtures/extended-test";
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
});
