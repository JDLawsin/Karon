import { expect, type Page } from "@playwright/test";

class ClinicExportPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/settings/export", { waitUntil: "domcontentloaded" });
    await expect(
      this.page.getByRole("heading", { name: "Export clinic data", level: 1 })
    ).toBeVisible();
  }

  async mockPatientsExport() {
    await this.page.route("**/api/exports/patients", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/csv; charset=utf-8",
        headers: {
          "Content-Disposition": 'attachment; filename="karon-patients-2026-09-29.csv"',
          "X-Export-Row-Count": "1"
        },
        body: [
          "patient_id,name,mobile,email,created_at,updated_at",
          "11111111-1111-4111-8111-111111111111,E2E Patient,09170000000,,2026-09-29T00:00:00.000Z,2026-09-29T00:00:00.000Z"
        ].join("\r\n")
      });
    });
  }

  async exportPatients() {
    const downloadPromise = this.page.waitForEvent("download");
    await this.page.getByRole("link", { name: "Export patients" }).click();
    return downloadPromise;
  }

  heading() {
    return this.page.getByRole("heading", { name: "Export clinic data", level: 1 });
  }
}

export { ClinicExportPage };
