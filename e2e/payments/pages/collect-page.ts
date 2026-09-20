import { type Page } from "@playwright/test";

export class CollectPage {
  constructor(private readonly page: Page) {}

  async goto(patientId: string, visitId: string) {
    await this.page.goto(`/patients/${patientId}?visit=${visitId}`, {
      waitUntil: "domcontentloaded"
    });
    await this.page.getByRole("heading", { name: "Collect" }).waitFor();
  }

  async record(method: string, amount: string) {
    await this.page.getByRole("button", { name: method }).click();
    await this.page.getByLabel("Amount (PHP)").fill(amount);
    await this.page.getByRole("button", { name: "Record payment" }).click();
  }
}
