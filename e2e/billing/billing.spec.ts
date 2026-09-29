import { resolve } from "node:path";

import { expect, test } from "../fixtures/extended-test";
import { BillingPage } from "./pages/billing-page";

test.describe("owner access status", { tag: "@owner" }, () => {
  test.use({ storageState: resolve(process.cwd(), "e2e/.auth/owner.json") });

  test("shows server access without horizontal overflow", async ({ page }) => {
    const billing = new BillingPage(page);
    await billing.goto();

    await expect(billing.heading()).toBeVisible();
    if (process.env.KARON_TEST_ACCESS_ENABLED === "true") {
      await expect(
        page.getByText("Design partner access", { exact: true })
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Your clinic has access" })
      ).toBeVisible();
    } else {
      await expect(page.getByText("Trial", { exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: /days? left/ })).toBeVisible();
    }

    for (const width of [320, 768, 1280] as const) {
      await page.setViewportSize({ width, height: 800 });
      await expect(billing.heading()).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth
        )
      ).toBe(false);
    }
  });
});
