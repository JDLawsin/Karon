import { type Page } from "@playwright/test";

class OfflineChairLoopPage {
  constructor(private readonly page: Page) {}

  async goto(patientId: string, visitId: string) {
    await this.page.goto(`/patients/${patientId}?visit=${visitId}`, {
      waitUntil: "domcontentloaded"
    });
    await this.page.getByRole("heading", { name: "Odontogram", level: 2 }).waitFor();
  }

  async chart() {
    const chart = this.page.getByRole("region", { name: "Odontogram" });
    await chart.getByRole("option", { name: "16" }).click();
    await chart.getByLabel("Condition or procedure").selectOption("procedure:filling");
    await chart.getByLabel("Visit note").fill("E2E offline restoration.");
    await chart.getByRole("button", { name: "Add chart entry" }).click();
  }

  async quote() {
    const quote = this.page.getByRole("region", { name: "Quote", exact: true });
    await quote.getByLabel("Service").selectOption({ label: "Cleaning" });
    await quote.getByRole("button", { name: "Add line" }).click();
    await quote.getByRole("button", { name: "Accept quote" }).click();
  }

  async collect() {
    const collect = this.page.getByRole("region", { name: "Collect" });
    await collect.getByRole("button", { name: "Cash", exact: true }).click();
    await collect.getByLabel("Amount (PHP)").fill("1500");
    await collect.getByRole("button", { name: "Record payment" }).click();
  }

  async schedule(date: string) {
    const nextVisit = this.page.getByRole("region", { name: "Next visit" });
    await nextVisit.getByLabel("Date").fill(date);
    await nextVisit.getByLabel("Time (clinic timezone)").fill("10:00");
    await nextVisit
      .getByRole("combobox", { name: "Service" })
      .selectOption("Cleaning");
    await nextVisit.getByRole("button", { name: "Save next visit" }).click();
  }

  async requestSignOut() {
    await this.page.getByRole("button", { name: "Toggle sidebar" }).click();
    const accountMenu = this.page.getByRole("button", { name: "Account menu" });
    await accountMenu.click();
    await this.page.getByRole("menuitem", { name: "Sign out" }).click();
  }
}

export { OfflineChairLoopPage };
