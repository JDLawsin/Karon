import { expect, type Page } from "@playwright/test";

class ServicesPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/services", { waitUntil: "domcontentloaded" });
    await expect(
      this.page.getByRole("heading", { name: "Services", level: 1 })
    ).toBeVisible();
  }

  async addService(name: string, price: string, duration: string) {
    await this.page.getByRole("button", { name: "Add service" }).click();
    const drawer = this.page.getByRole("dialog");

    await drawer.getByLabel("Name", { exact: true }).fill(name);
    await drawer.getByLabel("Price (PHP)").fill(price);
    await drawer.getByLabel("Default duration (minutes)").fill(duration);
    await drawer.getByRole("button", { name: "Add service" }).click();
  }

  async openService(name: string) {
    await this.page
      .getByRole("listitem")
      .filter({ hasText: name })
      .getByRole("button")
      .first()
      .click();
  }

  async expectServicePricing(name: string, price: string, duration: string) {
    const row = this.page.getByRole("listitem").filter({ hasText: name });

    await expect(row).toContainText(price);
    await expect(row).toContainText(duration);
  }

  async deleteService(name: string) {
    await this.page.getByRole("button", { name: `Actions for ${name}` }).click();
    await this.page.getByRole("menuitem", { name: "Delete" }).click();
    await this.page.getByRole("button", { name: "Delete" }).click();
    await expect(this.page.getByText(name)).not.toBeVisible();
  }
}

export { ServicesPage };
