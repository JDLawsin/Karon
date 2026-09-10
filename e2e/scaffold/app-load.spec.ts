import { expect, test } from "../fixtures/extended-test";

test("loads the clinic shell and offline fallback", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("link", { name: "Karon" })).toBeVisible();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Ready for the first chair workflow."
    })
  ).toBeVisible();

  await page
    .getByRole("link", { name: "Preview the offline fallback" })
    .click();

  await expect(page).toHaveURL(/\/~offline$/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "The clinic is still available."
    })
  ).toBeVisible();
});
