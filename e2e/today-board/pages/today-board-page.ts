import { type Page } from "@playwright/test";

class TodayBoardPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/today", { waitUntil: "domcontentloaded" });
    await this.page.getByRole("heading", { name: "Today", level: 1 }).waitFor();
  }

  async addWalkIn(name: string, mobile: string) {
    await this.page.getByRole("button", { name: "Add patient" }).click();
    await this.page.getByLabel("Name").fill(name);
    await this.page.getByLabel("Mobile").fill(mobile);
    await this.page.getByRole("button", { name: "Add patient" }).click();
    await this.page.getByText(name, { exact: true }).waitFor();
  }

  row(name: string) {
    return this.page.getByRole("listitem").filter({ hasText: name });
  }
}

export { TodayBoardPage };
