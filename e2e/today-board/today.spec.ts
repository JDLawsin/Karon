import { randomUUID } from "node:crypto";

import { type Page } from "@playwright/test";

import { expect, test } from "../fixtures/extended-test";
import { TodayBoardPage } from "./pages/today-board-page";

const fakeWalkIn = () => {
  const suffix = randomUUID().slice(0, 8);

  return {
    name: `E2E Walk-in ${suffix}`,
    mobile: `0917${suffix.replace(/\D/g, "").padEnd(7, "0").slice(0, 7)}`
  };
};

const fakeBookingRequest = () => ({
  id: randomUUID(),
  name: "E2E Booking Patient",
  mobile: "09170000001",
  service_name: "Checkup",
  note: null,
  starts_at: "2026-09-18T02:00:00.000Z"
});

const installFakeAudio = async (page: Page) => {
  await page.addInitScript(() => {
    class FakeAudioContext {
      currentTime = 0;
      destination = {};
      state: AudioContextState = "running";

      constructor() {
        const target = window as typeof window & { __e2eChimeAttempts?: number };
        target.__e2eChimeAttempts = (target.__e2eChimeAttempts ?? 0) + 1;
      }

      createGain() {
        return {
          connect() {},
          gain: {
            exponentialRampToValueAtTime() {},
            setValueAtTime() {}
          }
        };
      }

      createOscillator() {
        return {
          connect() {},
          frequency: {
            exponentialRampToValueAtTime() {},
            setValueAtTime() {}
          },
          start() {},
          stop() {},
          type: "sine"
        };
      }

      close() {
        this.state = "closed";
        return Promise.resolve();
      }
    }

    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      value: FakeAudioContext
    });
  });
};

const interceptEmptyBoard = async (
  page: Page,
  bookingRequests: unknown[] = []
) => {
  await page.route("**/rest/v1/clinic_events**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "[]"
      });
      return;
    }

    await route.continue();
  });
  await page.route("**/rest/v1/calendar_imports**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "[]"
      });
      return;
    }

    await route.continue();
  });
  await page.route("**/rest/v1/booking_requests**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(bookingRequests)
      });
      return;
    }

    await route.continue();
  });
  await page.route("**/rest/v1/clinics**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ auto_confirm_bookings: true })
      });
      return;
    }

    await route.continue();
  });
};

test.describe("today board", { tag: "@assistant" }, () => {
  test.use({ storageState: "e2e/.auth/assistant.json" });

  test("empty morning shows empty copy, not an error", async ({ page }) => {
    await interceptEmptyBoard(page);
    const today = new TodayBoardPage(page);
    await today.goto();

    await expect(page.getByRole("heading", { name: "Today", level: 1 })).toBeVisible();
    await expect(page.getByText("No patients this day")).toBeVisible();
    await expect(page.getByRole("button", { name: "Add patient" })).toBeVisible();
    await expect(page.getByText("To collect", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  });

  test("opens pending booking requests from the attention strip", async ({ page }) => {
    await interceptEmptyBoard(page, [fakeBookingRequest()]);
    const today = new TodayBoardPage(page);
    await today.goto();

    const attention = page.getByRole("link", { name: /1 booking request/ });
    await expect(attention).toBeVisible();
    await attention.click();

    await expect(page).toHaveURL(/#booking-inbox$/);
    await expect(page.getByRole("heading", { name: "New bookings" })).toBeVisible();
  });

  test("live signal keeps visuals while this clinic browser is muted", async ({ page }) => {
    const bookingRequests: unknown[] = [];
    await installFakeAudio(page);
    await interceptEmptyBoard(page, bookingRequests);
    const today = new TodayBoardPage(page);
    await today.goto();
    await expect(page.getByText("No new bookings", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Mute" }).click();
    await expect(page.getByText("Muted by you", { exact: true })).toBeVisible();
    bookingRequests.push(fakeBookingRequest());
    await page.evaluate(() => window.dispatchEvent(new Event("online")));

    await expect(page.getByRole("link", { name: /1 booking request/ })).toBeVisible();
    await expect(page.getByText("1 pending", { exact: true })).toBeVisible();
    await expect.poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { __e2eChimeAttempts?: number })
            .__e2eChimeAttempts ?? 0
      )
    ).toBe(0);

    await page.getByRole("button", { name: "Turn on" }).click();
    await expect(page.getByText("Soft chime on", { exact: true })).toBeVisible();
    await expect.poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { __e2eChimeAttempts?: number })
            .__e2eChimeAttempts ?? 0
      )
    ).toBe(1);
  });

  test("adds a walk-in as confirmed", { tag: "@integration" }, async ({ page }) => {
    const today = new TodayBoardPage(page);
    const person = fakeWalkIn();
    await today.goto();
    await today.addWalkIn(person.name, person.mobile);

    await expect(
      today.row(person.name).getByRole("button", { name: `Mark ${person.name} waiting` })
    ).toBeVisible();
  });

  test("charts an in-chair visit and keeps its history", { tag: "@integration" }, async ({ page }) => {
    const today = new TodayBoardPage(page);
    const person = fakeWalkIn();
    await today.goto();
    await today.addWalkIn(person.name, person.mobile);

    await page.getByRole("button", { name: `Mark ${person.name} waiting` }).click();
    await expect(
      today.row(person.name).getByRole("button", { name: `Mark ${person.name} in chair` })
    ).toBeVisible();

    await page.getByRole("button", { name: `Mark ${person.name} in chair` }).click();
    await expect(today.row(person.name).getByRole("link", { name: "Open visit" })).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Today", level: 1 })).toBeVisible();
    await expect(today.row(person.name).getByRole("link", { name: "Open visit" })).toBeVisible();
    await expect(today.row(person.name).getByRole("button", { name: `Mark ${person.name} done` })).toBeVisible();

    await today.openVisit(person.name);
    await expect(page).toHaveURL(/\/patients\/.+\?visit=.+/);
    await expect(page.getByRole("heading", { name: person.name, level: 1 })).toBeVisible();
    const currentVisit = page.getByRole("region", { name: "Current visit" });
    await expect(currentVisit).toBeVisible();
    await expect(currentVisit.getByText("In chair", { exact: true })).toBeVisible();

    await page.route("**/rest/v1/clinic_events**", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({ status: 201, contentType: "application/json", body: "" });
        return;
      }

      await route.continue();
    });

    const chart = page.getByRole("region", { name: "Odontogram" });
    await chart.getByRole("option", { name: "16" }).click();
    await chart.getByLabel("Condition or procedure").selectOption("procedure:filling");
    await chart.getByLabel("Visit note").fill("Composite restoration placed.");
    await chart.getByRole("button", { name: "Add chart entry" }).click();

    await expect(chart.getByText("Tooth 16", { exact: true })).toBeVisible();
    await expect(chart.getByRole("list").getByText("Filling", { exact: true })).toBeVisible();
    await expect(chart.getByText("Composite restoration placed.")).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByText("Composite restoration placed.")).toBeVisible();

    for (const width of [320, 768, 1280] as const) {
      await page.setViewportSize({ width, height: 800 });
      await expect(page.getByRole("region", { name: "Odontogram" })).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth
        )
      ).toBe(false);
    }

    await page.context().setOffline(true);
    await page.getByRole("option", { name: "26" }).click();
    await page.getByLabel("Condition or procedure").selectOption("condition:caries");
    await page.getByLabel("Visit note").fill("Should not be queued.");
    await page.getByRole("button", { name: "Add chart entry" }).click();
    await expect(page.getByText("Should not be queued.")).toBeVisible();
    await expect(
      page.getByRole("status").filter({ hasText: "Will sync when online" })
    ).toBeVisible();
  });

  test("keeps the local board in airplane mode", { tag: "@integration" }, async ({
    page
  }) => {
    const today = new TodayBoardPage(page);
    const person = fakeWalkIn();
    await today.goto();
    await today.addWalkIn(person.name, person.mobile);

    await page.context().setOffline(true);

    await expect(page.getByRole("heading", { name: "Today", level: 1 })).toBeVisible();
    await expect(today.row(person.name)).toBeVisible();
    await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  });

  for (const width of [320, 768, 1280] as const) {
    test(`stays usable at ${width}px`, async ({ page }) => {
      await interceptEmptyBoard(page);
      await page.setViewportSize({ width, height: 800 });
      const today = new TodayBoardPage(page);
      await today.goto();

      await expect(page.getByRole("heading", { name: "Today", level: 1 })).toBeVisible();
      await expect(page.getByRole("button", { name: "Add patient" })).toBeVisible();
      await expect(page.getByText("No patients this day")).toBeVisible();

      if (width === 320) {
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth
        );
        expect(overflow).toBe(false);
      }
    });
  }
});
