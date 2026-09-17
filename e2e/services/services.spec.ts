import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

import { expect, test } from "../fixtures/extended-test";
import { ServicesPage } from "./pages/services-page";

test.describe("assistant service access", () => {
  test.use({ storageState: resolve(process.cwd(), "e2e/.auth/assistant.json") });

  test("assistant can view prices but cannot edit services", async ({ page }) => {
    const services = new ServicesPage(page);

    await services.goto();
    await expect(page.getByRole("button", { name: "Add service" })).toHaveCount(0);
    await services.expectServicePricing("E2E Cleaning", "₱1,200.00", "45 min");
    await services.openService("E2E Cleaning");

    const drawer = page.getByRole("dialog");
    await expect(drawer.getByLabel("Price (PHP)")).toBeDisabled();
    await expect(drawer.getByLabel("Default duration (minutes)")).toBeDisabled();
    await expect(drawer.getByRole("button", { name: "Save changes" })).toHaveCount(0);
  });
});

test.describe("owner service access", () => {
  test.use({ storageState: resolve(process.cwd(), "e2e/.auth/owner.json") });

  test(
    "owner can add a priced service and remove it",
    { tag: "@integration" },
    async ({ page }) => {
      const name = `E2E Service ${randomUUID().slice(0, 8)}`;
      const services = new ServicesPage(page);

      await services.goto();
      await services.addService(name, "2500", "60");
      await services.expectServicePricing(name, "₱2,500.00", "60 min");
      await services.deleteService(name);
    }
  );
});
