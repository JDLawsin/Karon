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
});
