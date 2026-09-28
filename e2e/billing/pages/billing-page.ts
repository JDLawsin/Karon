import { type Page } from "@playwright/test";

export class BillingPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/billing", { waitUntil: "domcontentloaded" });
  }

  heading() {
    return this.page.getByRole("heading", { name: "Trial and Pay Karon", level: 1 });
  }
}
