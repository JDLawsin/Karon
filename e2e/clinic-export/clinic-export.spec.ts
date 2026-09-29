import { resolve } from "node:path";

import { expect, test } from "../fixtures/extended-test";
import { ClinicExportPage } from "./pages/clinic-export-page";

test.describe("assistant clinic export access", { tag: "@assistant" }, () => {
  test.use({ storageState: resolve(process.cwd(), "e2e/.auth/assistant.json") });

  test("assistant has no export entry and sees an owner-only explanation", async ({
    page
  }) => {
    await page.goto("/settings", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: "Export clinic data" })).toHaveCount(0);

    await page.goto("/settings/export", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Owner access required", level: 1 })
    ).toBeVisible();
    await expect(page.getByText("You do not have permission to export clinic data.")).toBeVisible();
  });
});

test.describe("owner clinic exports", { tag: "@owner" }, () => {
  test.use({ storageState: resolve(process.cwd(), "e2e/.auth/owner.json") });

  test("owner downloads a patients CSV without responsive overflow", async ({ page }) => {
    const exports = new ClinicExportPage(page);
    await exports.mockPatientsExport();
    await exports.goto();

    for (const width of [320, 768, 1280] as const) {
      await page.setViewportSize({ width, height: 800 });
      await expect(exports.heading()).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth
        )
      ).toBe(false);
    }

    const download = await exports.exportPatients();
    expect(download.suggestedFilename()).toBe("karon-patients-2026-09-29.csv");
  });
});
