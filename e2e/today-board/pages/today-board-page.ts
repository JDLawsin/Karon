import { type Page } from "@playwright/test";

class TodayBoardPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/today", { waitUntil: "domcontentloaded" });
    await this.page.getByRole("heading", { name: "Today", level: 1 }).waitFor();
  }

  async addWalkIn(name: string, mobile: string) {
    await this.page.getByRole("button", { name: "Add patient" }).click();
    const drawer = this.page.getByRole("dialog", { name: "Add patient" });
    await drawer.getByLabel("Full name").fill(name);
    await drawer.getByLabel("Mobile").fill(mobile);
    await drawer.getByRole("button", { name: "Add patient" }).click();
    await this.row(name).waitFor();
  }

  async openVisit(name: string) {
    await this.row(name).getByRole("link", { name: "Open visit" }).click();
  }

  row(name: string) {
    return this.page
      .getByRole("listitem")
      .filter({ hasText: name, visible: true });
  }
}

export { TodayBoardPage };
