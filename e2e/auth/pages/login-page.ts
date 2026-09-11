import { type Page } from "@playwright/test";

class LoginPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/login", { waitUntil: "domcontentloaded" });
    // Native GET would leak the password in the query string before React attaches.
    await this.page.locator("form[data-hydrated=true]").waitFor();
  }

  async gotoForgotPassword() {
    await this.goto();
    await this.page.getByRole("link", { name: "Forgot password?" }).click();
    await this.page.waitForURL(/\/forgot-password$/);
    // Native GET would skip React validation and leak the email in the query string.
    await this.page.locator("form[data-hydrated=true]").waitFor();
  }

  async submitPassword(email: string, password: string) {
    await this.page.getByLabel("Email", { exact: true }).fill(email);
    await this.page.getByLabel("Password", { exact: true }).fill(password);
    await this.page.getByRole("button", { name: "Log in" }).click();
  }

  async readTotpSecret() {
    await this.page
      .getByRole("img", { name: "Authenticator setup QR code" })
      .waitFor({ timeout: 30_000 });
    await this.page.getByText("Can't scan?", { exact: true }).click();
    const key = this.page.getByText(/Authenticator key:/);
    await key.waitFor();
    const keyText = await key.textContent();
    const secret = keyText?.replace("Authenticator key:", "").trim();

    if (!secret) {
      throw new Error("TOTP secret was not shown");
    }

    return secret;
  }

  async submitTotp(code: string) {
    await this.page.getByLabel("Authenticator code").fill(code);
    await this.page.getByRole("button", { name: "Confirm code" }).click();
  }
}

export { LoginPage };
