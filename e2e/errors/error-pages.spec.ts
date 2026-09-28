import { randomUUID } from "node:crypto";

import { expect, test } from "../fixtures/extended-test";

test.describe("error recovery", { tag: "@assistant" }, () => {
  test.use({ storageState: "e2e/.auth/assistant.json" });

  test("gives an unknown route a branded way back", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/this-route-does-not-exist");

    await expect(page).toHaveTitle(/Page not found/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Page not found" })
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to Karon" })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
      )
    ).toBe(false);
  });

  test("keeps a missing patient private and actionable", async ({ page }) => {
    await page.goto(`/patients/${randomUUID()}`);

    await expect(
      page.getByRole("heading", { level: 1, name: "Patient unavailable" })
    ).toBeVisible();
    await expect(page.getByText(/another clinic/i)).toHaveCount(0);
    await expect(page.getByRole("link", { name: "View patients" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Return to Today" })).toBeVisible();
  });

  test("treats a malformed patient address as not found", async ({ page }) => {
    await page.goto("/patients/not-a-uuid");

    await expect(
      page.getByRole("heading", { level: 1, name: "Page not found" })
    ).toBeVisible();
  });
});
