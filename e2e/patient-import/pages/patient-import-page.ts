import { type Page } from "@playwright/test";

class PatientImportPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.route("**/api/imports", async (route) => {
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
    await this.page.goto("/settings/import", { waitUntil: "domcontentloaded" });
  }

  async openUploadStep() {
    await this.page.getByRole("button", { name: "Continue · Upload" }).click();
  }
}

export { PatientImportPage };
