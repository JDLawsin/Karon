import { type Page } from "@playwright/test";

const SLUG = "happytee1";

const publicBookingPayload = {
  clinicName: "Happy Teeth",
  timezone: "Asia/Manila",
  hoursLabel: "Mon–Sat, 9:00 am – 6:00 pm",
  phone: "09171234567",
  address: "123 Osmena Blvd, Cebu City",
  logoUrl: null,
  services: [
    { id: "clean", name: "Cleaning" },
    { id: "exam", name: "Dental examination" },
    { id: "filling", name: "Tooth filling" },
    { id: "extraction", name: "Tooth extraction" },
    { id: "whitening", name: "Teeth whitening" }
  ],
  dates: ["2026-09-14", "2026-09-15"],
  date: "2026-09-14",
  slots: [
    {
      clock: "09:00",
      startsAt: "2026-09-14T01:00:00.000Z",
      label: "9:00 AM"
    }
  ]
};

class PublicBookingPage {
  constructor(private readonly page: Page) {}

  async mockApi(postError?: string) {
    await this.page.addInitScript(() => {
      const turnstile = {
        render: (
          _container: HTMLElement,
          options: { callback: (token: string) => void }
        ) => {
          options.callback("e2e-turnstile");
          return "1";
        },
        remove: () => undefined
      };

      Object.defineProperty(window, "turnstile", {
        configurable: true,
        value: turnstile
      });
    });
    await this.page.route("**/api/book/**", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: postError ? 400 : 200,
          contentType: "application/json",
          body: JSON.stringify(postError ? { error: postError } : { ok: true })
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(publicBookingPayload)
      });
    });
  }

  async goto() {
    await this.page.goto(`/book/${SLUG}`, { waitUntil: "domcontentloaded" });
  }

  welcome() {
    return this.page.getByRole("heading", {
      level: 1,
      name: "Hi! Welcome to Happy Teeth."
    });
  }

  async fillContact() {
    await this.page.getByLabel("Name").fill("Ana Cruz");
    await this.page.getByLabel("Mobile").fill("09171234567");
  }
}

export { PublicBookingPage, publicBookingPayload };
