import { defineConfig, devices } from "@playwright/test";

if (process.env.FORCE_COLOR) {
  delete process.env.NO_COLOR;
}

const isCi = Boolean(process.env.CI);
const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = externalBaseUrl ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }]
  ],
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure"
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
      testMatch: "**/*.spec.ts"
    }
  ],
  webServer: externalBaseUrl
    ? undefined
    : {
        command: isCi
          ? "corepack yarn workspace @karon/clinic start --port 3000"
          : "corepack yarn workspace @karon/clinic dev",
        url: baseURL,
        reuseExistingServer: !isCi,
        timeout: 120_000,
        stderr: "pipe",
        stdout: "pipe"
      }
});
