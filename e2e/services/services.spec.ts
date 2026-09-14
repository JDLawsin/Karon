import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

import { expect, test } from "../fixtures/extended-test";

test.use({ storageState: resolve(process.cwd(), "e2e/.auth/assistant.json") });

test(
  "assistant can add and delete a service",
  { tag: "@integration" },
  async ({ page }) => {
    const name = `E2E Service ${randomUUID().slice(0, 8)}`;

    await page.goto("/services", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Services", level: 1 })).toBeVisible();

    await page.getByRole("button", { name: "Add service" }).click();
    await page.getByLabel("Name", { exact: true }).fill(name);
    await page.locator("form").getByRole("button", { name: "Add service" }).click();

    await expect(page.getByText(name)).toBeVisible();

    await page.getByRole("button", { name: `Actions for ${name}` }).click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Delete" }).click();

    await expect(page.getByText(name)).not.toBeVisible();
  }
);
