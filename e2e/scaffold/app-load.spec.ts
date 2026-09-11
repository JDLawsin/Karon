import { expect, test } from "../fixtures/extended-test";

test("loads login and the offline fallback", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("link", { name: "Karon" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();

  await page.getByRole("link", { name: "Offline fallback" }).click();

  await expect(page).toHaveURL(/\/~offline$/);
  await expect(page).toHaveTitle(/Offline/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "The clinic is still available."
    })
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
});

for (const width of [320, 768, 1280] as const) {
  test(`login stays usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
      "type",
      "password"
    );
    await expect(
      page.getByRole("button", { name: "Continue with Google" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Forgot password?" })
    ).toBeVisible();

    const hero = page.getByRole("img", {
      name: "A bright dental treatment room with modern equipment."
    });
    if (width >= 768) {
      await expect(hero).toBeVisible();
    } else {
      await expect(hero).toBeHidden();
    }
  });
}
