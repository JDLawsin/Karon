import { type Page } from "@playwright/test";

class PatientImportPage {
  private completedItems: string[] = [];

  constructor(private readonly page: Page) {}

  async goto({ mockChecklist = true }: { mockChecklist?: boolean } = {}) {
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
    if (mockChecklist) {
      await this.page.route("**/api/import-checklist", async (route) => {
        if (route.request().method() === "PUT") {
          const body: unknown = route.request().postDataJSON();
          this.completedItems =
            body &&
            typeof body === "object" &&
            "completedItems" in body &&
            Array.isArray(body.completedItems)
              ? body.completedItems.filter((item): item is string => typeof item === "string")
              : [];
        }

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            completedItems: this.completedItems,
            updatedAt: this.completedItems.length > 0 ? new Date().toISOString() : null
          })
        });
      });
    }
    await this.page.goto("/settings/import", { waitUntil: "domcontentloaded" });
  }

  async openUploadStep() {
    await this.page.getByRole("button", { name: "Continue · Upload" }).click();
  }
}

export { PatientImportPage };
