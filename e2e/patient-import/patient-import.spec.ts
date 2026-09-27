import { expect, test } from "../fixtures/extended-test";
import { PatientImportPage } from "./pages/patient-import-page";

test.describe("patient import owner flow", { tag: "@owner" }, () => {
  test.use({ storageState: "e2e/.auth/owner.json" });

  for (const width of [320, 768, 1280] as const) {
    test(`keeps choose and upload steps usable at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      const patientImport = new PatientImportPage(page);
      await patientImport.goto();

      await expect(
        page.getByRole("heading", { name: "Import patients", level: 1 })
      ).toBeVisible();
      await expect(page.getByText("Saturday migration checklist")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth
        )
      ).toBe(false);

      await patientImport.openUploadStep();
      await expect(page.getByLabel(/Drop a file here/)).toBeAttached();
      await expect(page.getByRole("button", { name: "Continue · Preview" })).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth
        )
      ).toBe(false);
    });
  }

  for (const width of [320, 768, 1280] as const) {
    test(`keeps the services choose and upload steps usable at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.route("**/api/service-imports", async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ jobs: [] })
          });
          return;
        }

        await route.continue();
      });
      await page.goto("/settings/import", { waitUntil: "domcontentloaded" });
      await page.getByRole("link", { name: "Choose Services" }).click();

      await expect(
        page.getByRole("heading", { name: "Import services", level: 1 })
      ).toBeVisible();
      await page.getByRole("button", { name: /Services · name/ }).click();
      await expect(page.getByLabel(/Drop a file here/)).toBeAttached();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth
        )
      ).toBe(false);
    });
  }

  test("imports valid services, reports bad prices, and preserves unmapped catalog rows", async ({
    page
  }) => {
    const importedName = `E2E Fluoride ${Date.now()}`;
    await page.goto("/settings/import/services", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Services · name/ }).click();
    await page.locator("#service-import-file").setInputFiles({
      name: "services.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        `Code,Service,Price,Minutes,Currency\nFL-${Date.now()},${importedName},950,30,PHP\nBAD,Bad price,free,30,PHP`
      )
    });
    await page.getByRole("button", { name: "Continue · Preview" }).click();

    await expect(page.getByText("Preview and map services", { exact: true })).toBeVisible({
      timeout: 15_000
    });
    await expect(page.getByText("Price must be a plain non-negative amount.")).toBeVisible();
    await page.getByRole("button", { name: "Continue · Confirm" }).click();
    const removal = page.getByRole("checkbox", { name: /Remove 1 unmapped existing service/ });
    await expect(removal).not.toBeChecked();
    await page.getByRole("button", { name: "Confirm import" }).click();

    await expect(page.getByText("Service import complete", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Download 1 error row" })).toBeVisible();
    await page.getByRole("link", { name: "Finish · Go to Services" }).click();
    await expect(page.getByText(importedName)).toBeVisible();
    await expect(page.getByText("E2E Cleaning")).toBeVisible();
  });
});

test.describe("patient import assistant access", { tag: "@assistant" }, () => {
  test.use({ storageState: "e2e/.auth/assistant.json" });

  test("shows an explicit owner-only denial", async ({ page }) => {
    await page.goto("/settings/import", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: "Owner access required", level: 1 })
    ).toBeVisible();
    await expect(
      page.getByText("You do not have permission to import patients.")
    ).toBeVisible();
  });

  test("denies the services import route", async ({ page }) => {
    await page.goto("/settings/import/services", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: "Owner access required", level: 1 })
    ).toBeVisible();
    await expect(
      page.getByText("You do not have permission to import services.")
    ).toBeVisible();
  });
});
