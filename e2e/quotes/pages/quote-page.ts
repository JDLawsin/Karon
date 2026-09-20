import { type Page } from "@playwright/test";

class QuotePage {
  constructor(private readonly page: Page) {}

  async goto(patientId: string, visitId: string) {
    await this.page.goto(`/patients/${patientId}?visit=${visitId}`, {
      waitUntil: "domcontentloaded"
    });
    await this.page.getByRole("heading", { name: "Quote", level: 2 }).waitFor();
  }

  async addService(serviceName: string, inlinePrice?: string) {
    await this.page.getByLabel("Service").selectOption({ label: serviceName });

    if (inlinePrice !== undefined) {
      await this.page.getByLabel(new RegExp(`Price for ${serviceName}`)).fill(inlinePrice);
    }

    await this.page.getByRole("button", { name: "Add line" }).click();
  }
}

export { QuotePage };
