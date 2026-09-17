import { expect, test } from "../fixtures/extended-test";
import { PublicBookingPage } from "./pages/public-booking-page";

test.describe("public booking link", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("shows the clinic, reviews details, and sends a request", async ({
    page
  }) => {
    const booking = new PublicBookingPage(page);
    await booking.mockApi();
    await booking.goto();

    await expect(booking.welcome()).toBeVisible();
    await expect(page.getByText("Address")).toBeVisible();
    await expect(page.getByText("123 Osmena Blvd, Cebu City")).toBeVisible();
    await expect(page.getByText("Powered by Karon")).toBeVisible();

    await page.getByRole("button", { name: "Cleaning" }).click();
    await page.getByRole("button", { name: "Mon, Sep 14" }).click();
    await page.getByRole("button", { name: "9:00 AM" }).click();
    await booking.fillContact();
    await expect(page.getByRole("button", { name: "Review booking" })).toBeEnabled();
    await page.getByRole("button", { name: "Review booking" }).click();

    const dialog = page.getByRole("alertdialog");
    await expect(dialog.getByRole("heading", { name: "Check your booking" })).toBeVisible();
    await expect(
      dialog.getByText("This is a request. Happy Teeth will confirm.")
    ).toBeVisible();
    await expect(dialog.getByText("Mon, Sep 14 · 9:00 AM")).toBeVisible();
    await expect(dialog.getByText("Cleaning")).toBeVisible();
    await expect(dialog.getByText("Ana Cruz")).toBeVisible();
    await expect(dialog.getByText("09171234567")).toBeVisible();
    await expect(dialog.getByText("123 Osmena Blvd, Cebu City")).toBeVisible();

    await expect(dialog.getByRole("button", { name: "Send request" })).toBeEnabled();
    await dialog.getByRole("button", { name: "Send request" }).click();

    await expect(
      page.getByRole("status").getByText("Booking request sent")
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Request sent" })).toBeVisible();
    await expect(
      page.getByText("This is a request. Happy Teeth will confirm.")
    ).toBeVisible();
  });

  test("shows a failed request in an error toast", async ({ page }) => {
    const booking = new PublicBookingPage(page);
    await booking.mockApi("Could not send that booking.");
    await booking.goto();

    await page.getByRole("button", { name: "Cleaning" }).click();
    await page.getByRole("button", { name: "Mon, Sep 14" }).click();
    await page.getByRole("button", { name: "9:00 AM" }).click();
    await booking.fillContact();
    await page.getByRole("button", { name: "Review booking" }).click();
    await page.getByRole("button", { name: "Send request" }).click();

    await expect(
      page.getByRole("alert").getByText("Could not send that booking.")
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Request sent" })).toHaveCount(0);
  });

  test("scrolls services with arrow controls", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    const booking = new PublicBookingPage(page);
    await booking.mockApi();
    await booking.goto();

    const previous = page.getByRole("button", { name: "Previous service" });
    const next = page.getByRole("button", { name: "Next service" });

    await expect(previous).toBeDisabled();
    await expect(next).toBeEnabled();
    await next.click();
    await expect(previous).toBeEnabled();
  });

  for (const width of [320, 768, 1280] as const) {
    test(`stays usable at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      const booking = new PublicBookingPage(page);
      await booking.mockApi();
      await booking.goto();

      await expect(booking.welcome()).toBeVisible();
      await expect(page.getByText("Address")).toBeVisible();
      await expect(page.getByRole("button", { name: "Review booking" })).toBeVisible();
      await expect(page.getByLabel("Name")).toBeVisible();
    });
  }
});
