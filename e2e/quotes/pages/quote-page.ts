import { type Page } from "@playwright/test";

class QuotePage {
  constructor(private readonly page: Page) {}

  async goto(patientId: string, visitId: string) {
    await this.page.goto(`/patients/${patientId}?visit=${visitId}`, {
      waitUntil: "domcontentloaded"
    });
    await this.page
      .getByRole("heading", { name: "Quote", exact: true, level: 2 })
      .waitFor();
  }

  async addService(serviceName: string, inlinePrice?: string) {
    const quote = this.page.getByRole("region", { name: "Quote", exact: true });
    await quote.getByLabel("Service").selectOption({ label: serviceName });

    if (inlinePrice !== undefined) {
      await quote.getByLabel(new RegExp(`Price for ${serviceName}`)).fill(inlinePrice);
    }

    await quote.getByRole("button", { name: "Add line" }).click();
  }
}

export { QuotePage };
