import { type Page } from "@playwright/test";

class PatientsPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/patients", { waitUntil: "domcontentloaded" });
    await this.page.getByRole("heading", { name: "Patients", level: 1 }).waitFor();
  }

  async openCreate() {
    await this.page.getByRole("button", { name: "Add patient" }).click();
    return this.page.getByRole("dialog", { name: "Add patient" });
  }

  async create(name: string, mobile: string) {
    const sheet = await this.openCreate();
    await sheet.getByLabel("Full name").fill(name);
    await sheet.getByLabel("Mobile").fill(mobile);
    await sheet.getByRole("button", { name: "Create patient" }).click();
    await this.page.waitForURL(/\/patients\?patient=.+/);
  }

  async search(query: string) {
    await this.page.getByRole("searchbox", { name: "Search" }).fill(query);
  }
}

export { PatientsPage };
