import { type Page } from "@playwright/test";

class NextVisitPage {
  constructor(private readonly page: Page) {}

  async goto(patientId: string) {
    await this.page.goto(`/patients/${patientId}`, {
      waitUntil: "domcontentloaded"
    });
    await this.page
      .getByRole("heading", { name: "Next visit", level: 2 })
      .waitFor();
  }

  async schedule(date: string, time: string, service: string) {
    await this.page.getByLabel("Date").fill(date);
    await this.page.getByLabel("Time (clinic timezone)").fill(time);
    await this.page
      .getByRole("combobox", { name: "Service" })
      .selectOption(service);
    await this.page.getByRole("button", { name: "Save next visit" }).click();
  }
}

export { NextVisitPage };
