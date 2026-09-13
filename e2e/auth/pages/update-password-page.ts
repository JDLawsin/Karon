import { type Page } from "@playwright/test";

class UpdatePasswordPage {
  constructor(private readonly page: Page) {}

  async waitReady() {
    // Native GET would skip React validation and leak the password in the query string.
    await this.page.locator("form[data-hydrated=true]").waitFor();
  }

  async openFromSettings() {
    await this.page.getByRole("button", { name: "Change password" }).click();
    await this.page
      .getByRole("dialog", { name: "Change password" })
      .waitFor({ state: "visible" });
    await this.waitReady();
  }

  async submitNew(password: string) {
    await this.waitReady();
    await this.page.getByLabel("New password").fill(password);
    await this.page.getByLabel("Confirm password").fill(password);
    await this.page.getByRole("button", { name: "Update password" }).click();
  }

  async submitChange(currentPassword: string, password: string) {
    await this.waitReady();
    await this.page.getByLabel("Current password").fill(currentPassword);
    await this.page.getByLabel("New password").fill(password);
    await this.page.getByLabel("Confirm password").fill(password);
    await this.page.getByRole("button", { name: "Update password" }).click();
  }
}

export { UpdatePasswordPage };
