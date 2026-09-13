import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

import { expect, test } from "../fixtures/extended-test";
import { LoginPage } from "./pages/login-page";
import { UpdatePasswordPage } from "./pages/update-password-page";
import { totpFromSecret } from "./totp";

const envFile = resolve(process.cwd(), "apps/clinic/.env");

if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const identities = () =>
  JSON.parse(
    readFileSync(resolve(process.cwd(), "e2e/.auth/users.json"), "utf8")
  ) as {
    password: string;
    owner: { email: string; id: string };
    assistant: { email: string; id: string };
    otherOwner: { email: string; id: string };
    clinicA: string;
  };

const adminClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Test needs Supabase admin env");
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
};

test("signup rejects a weak password before calling auth", async ({ page }) => {
  await page.goto("/signup", { waitUntil: "domcontentloaded" });
  // Native GET would skip React validation and leak the password in the query string.
  await page.locator("form[data-hydrated=true]").waitFor();
  await page.getByLabel("Email", { exact: true }).fill("weak@example.com");
  await page.getByLabel("Password", { exact: true }).fill("short");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: /uppercase letter/i })
  ).toBeVisible();
});

test("password login lands an assistant on today", async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.submitPassword(identities().assistant.email, identities().password);
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
});

test("collapsed rail keeps account menu items in view", async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.submitPassword(identities().assistant.email, identities().password);
  await expect(page).toHaveURL(/\/today$/);
  await page.getByRole("button", { name: "Toggle sidebar", expanded: true }).click();
  await expect(
    page.getByRole("button", { name: "Toggle sidebar", expanded: false })
  ).toBeVisible();
  await page.getByRole("button", { name: "Account menu" }).click();
  await expect(page.getByRole("menuitem", { name: "System theme" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Sign out" })).toBeVisible();
});

test("magic-link start asks the user to check email", async ({ page }) => {
  await page.route("**/auth/v1/otp**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "{}"
    });
  });

  const login = new LoginPage(page);
  await login.goto();
  await page.getByLabel("Email").fill(identities().assistant.email);
  await page.getByRole("button", { name: "Email me a link" }).click();
  await expect(page.getByRole("status")).toContainText(/check your email/i);
});

test("magic-link confirm returns an invited assistant to today", async ({
  page
}) => {
  const { data, error } = await adminClient().auth.admin.generateLink({
    type: "magiclink",
    email: identities().assistant.email
  });

  expect(error).toBeNull();
  const hashedToken = data?.properties?.hashed_token;
  expect(hashedToken).toBeTruthy();

  await page.goto(
    `/auth/confirm?token_hash=${encodeURIComponent(hashedToken!)}&type=magiclink`
  );
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
});

const NEW_PASSWORD = "Clinic-test-pass-99";

const seedClinicUser = async (role: "owner" | "assistant") => {
  const email = `karon-e2e-pw-${role}-${Date.now()}@example.com`;
  const admin = adminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: identities().password,
    email_confirm: true
  });
  expect(error).toBeNull();
  expect(data.user?.id).toBeTruthy();

  const clinicId = randomUUID();
  const { error: clinicError } = await admin.from("clinics").insert({
    id: clinicId,
    name: `Password Clinic ${Date.now()}`,
    region: "ph"
  });
  expect(clinicError).toBeNull();

  const { error: memberError } = await admin.from("clinic_members").insert({
    tenant_id: clinicId,
    user_id: data.user!.id,
    role
  });
  expect(memberError).toBeNull();

  return { email, id: data.user!.id };
};

test("forgot-password start asks the user to check email", async ({ page }) => {
  await page.route("**/auth/v1/recover**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "{}"
    });
  });

  const login = new LoginPage(page);
  await login.gotoForgotPassword();
  await page.getByLabel("Email").fill(identities().assistant.email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("status")).toContainText(/check your email/i);
});

test("recovery link lets an assistant choose a new password and reach today", async ({
  page
}) => {
  test.setTimeout(60_000);
  const { email } = await seedClinicUser("assistant");
  const { data, error } = await adminClient().auth.admin.generateLink({
    type: "recovery",
    email
  });
  expect(error).toBeNull();
  const hashedToken = data?.properties?.hashed_token;
  expect(hashedToken).toBeTruthy();

  await page.goto(
    `/auth/confirm?token_hash=${encodeURIComponent(hashedToken!)}&type=recovery`
  );
  await expect(page).toHaveURL(/\/update-password$/);
  await expect(page.getByLabel("Current password")).toHaveCount(0);
  const update = new UpdatePasswordPage(page);
  await update.submitNew(NEW_PASSWORD);
  await expect(page).toHaveURL(/\/today$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
});

test("recovery link sends an owner to MFA after the new password", async ({
  page
}) => {
  test.setTimeout(60_000);
  const { email } = await seedClinicUser("owner");
  const { data, error } = await adminClient().auth.admin.generateLink({
    type: "recovery",
    email
  });
  expect(error).toBeNull();
  const hashedToken = data?.properties?.hashed_token;
  expect(hashedToken).toBeTruthy();

  await page.goto(
    `/auth/confirm?token_hash=${encodeURIComponent(hashedToken!)}&type=recovery`
  );
  await expect(page).toHaveURL(/\/update-password$/);
  await expect(page.getByLabel("Current password")).toHaveCount(0);
  const update = new UpdatePasswordPage(page);
  await update.submitNew(NEW_PASSWORD);
  await expect(page).toHaveURL(/\/mfa$/, { timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: "Confirm it is you" })
  ).toBeVisible();
});

test("a signed-in assistant can change their password", async ({ page }) => {
  const { email } = await seedClinicUser("assistant");
  const login = new LoginPage(page);
  await login.goto();
  await login.submitPassword(email, identities().password);
  await expect(page).toHaveURL(/\/today$/);
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/settings$/);
  const update = new UpdatePasswordPage(page);
  await update.submitChange(identities().password, NEW_PASSWORD);
  await expect(page).toHaveURL(/\/today$/, { timeout: 30_000 });
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await login.goto();
  await login.submitPassword(email, NEW_PASSWORD);
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
});

test("new owner onboards a clinic", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  const email = `karon-e2e-onboard-${Date.now()}@example.com`;
  const { data, error } = await adminClient().auth.admin.createUser({
    email,
    password: identities().password,
    email_confirm: true
  });

  expect(error).toBeNull();
  expect(data.user?.id).toBeTruthy();

  const login = new LoginPage(page);
  await login.goto();
  await login.submitPassword(email, identities().password);
  await expect(page).toHaveURL(/\/mfa$/);
  await expect(
    page.getByRole("heading", { name: "Confirm it is you" })
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Authenticator setup QR code" })
  ).toBeVisible({ timeout: 30_000 });
  await expect(
    page.getByRole("link", { name: "Add to authenticator app" })
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Play Store" })).toHaveAttribute(
    "href",
    "https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2"
  );
  await expect(page.getByRole("link", { name: "App Store" })).toHaveAttribute(
    "href",
    "https://apps.apple.com/app/google-authenticator/id388497605"
  );
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("img", { name: "Authenticator setup QR code" })
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();

  const secret = await login.readTotpSecret();
  await login.submitTotp(totpFromSecret(secret).generate());
  await expect(page).toHaveURL(/\/onboarding$/);
  // Native GET would skip create_clinic before React attaches.
  await page.locator("form[data-hydrated=true]").waitFor();
  await page.getByLabel("Clinic name").fill("Onboarded Clinic");
  await page.getByLabel("Clinic phone").fill("09171234567");
  await page.getByLabel("Clinic email").fill(email);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText(/step 2 of 5/i)).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText(/step 3 of 5/i)).toBeVisible();
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.getByText(/step 4 of 5/i)).toBeVisible();
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.getByRole("button", { name: "Create clinic" })).toBeVisible();
  await page.getByRole("button", { name: "Create clinic" }).click();
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
});

test("trusted device skips owner TOTP on the next login", async ({ page }) => {
  const email = `karon-e2e-trust-${Date.now()}@example.com`;
  const admin = adminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: identities().password,
    email_confirm: true
  });

  expect(error).toBeNull();
  expect(data.user?.id).toBeTruthy();

  const clinicId = randomUUID();
  const { error: clinicError } = await admin.from("clinics").insert({
    id: clinicId,
    name: `Trust Clinic ${Date.now()}`,
    region: "ph"
  });
  expect(clinicError).toBeNull();

  const { error: memberError } = await admin.from("clinic_members").insert({
    tenant_id: clinicId,
    user_id: data.user!.id,
    role: "owner"
  });
  expect(memberError).toBeNull();

  const login = new LoginPage(page);
  await login.goto();
  await login.submitPassword(email, identities().password);
  await expect(page).toHaveURL(/\/mfa$/);
  const secret = await login.readTotpSecret();
  await login.submitTotp(totpFromSecret(secret).generate());
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await login.goto();
  await login.submitPassword(email, identities().password);
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
});

test("Google sign-in starts at the app callback boundary", async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await page.getByRole("button", { name: "Continue with Google" }).click();

  await Promise.race([
    page.waitForURL(/google|oauth/i, { timeout: 8_000 }),
    page
      .getByText(/Google sign-in is not available/i)
      .waitFor({ timeout: 8_000 })
  ]);

  if (!/google|oauth/i.test(page.url())) {
    await expect(
      page.getByText(/Google sign-in is not available/i)
    ).toBeVisible();
  }
});

test.describe("owner", { tag: "@owner" }, () => {
  test.use({ storageState: "e2e/.auth/owner.json" });

  test("opens today's collections", async ({ page }) => {
    await page.goto("/owner/today");
    await expect(
      page.getByRole("heading", { name: "Today's collections" })
    ).toBeVisible();
  });

  test("invites and removes an assistant", async ({ page }) => {
    await page.goto("/settings?tab=members");
    await expect(page).toHaveURL(/\/settings\?tab=members/);
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Members" })).toBeVisible();
    const email = `karon-e2e-invite-${Date.now()}@example.com`;
    await page.getByLabel("Assistant email").fill(email);
    const [response] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes("/api/members") && res.request().method() === "POST"
      ),
      page.getByRole("button", { name: "Add assistant" }).click()
    ]);
    const payload: unknown = await response.json();
    expect(payload).toEqual({
      ok: true,
      userId: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      )
    });
    const userId = (payload as { userId: string }).userId;
    await expect(page.getByText(/invite sent/i)).toBeVisible();
    await expect(page.getByText(userId)).toBeVisible();
    await page
      .getByRole("listitem")
      .filter({ hasText: userId })
      .getByRole("button", { name: "Remove" })
      .click();
    await expect(page.getByText(userId)).toHaveCount(0);
  });

  test("clinic staff is usable at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/owner/clinic");
    await expect(page).toHaveURL(/\/settings\?tab=clinic/);
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Clinic" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Integrations" })).toBeVisible();
    await page.getByRole("tab", { name: "Members" }).click();
    await expect(page.getByRole("button", { name: "Add assistant" })).toBeVisible();
    await page.getByRole("button", { name: "Toggle sidebar" }).click();
    await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Clinic" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Today's collections" })
    ).toBeVisible();
    await page.getByRole("link", { name: "Settings" }).click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByLabel("Current password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Revoke all other devices" })
    ).toBeVisible();
  });

  test("revokes a listed device", async ({ page }) => {
    const { data, error } = await adminClient()
      .from("clinic_sessions")
      .insert({
        tenant_id: identities().clinicA,
        user_id: identities().owner.id,
        session_id: randomUUID()
      })
      .select("id")
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();

    await page.goto("/settings");
    await expect(page.getByText(data!.id)).toBeVisible();
    await page
      .getByRole("listitem")
      .filter({ hasText: data!.id })
      .getByRole("button", { name: "Revoke device" })
      .click();
    await expect(
      page.getByRole("listitem").filter({ hasText: data!.id })
    ).toContainText("Revoked");
    await page.reload();
    await expect(
      page.getByRole("listitem").filter({ hasText: data!.id })
    ).toContainText("Revoked");
  });

  test("revokes all other devices", async ({ page }) => {
    const { data, error } = await adminClient()
      .from("clinic_sessions")
      .insert({
        tenant_id: identities().clinicA,
        user_id: identities().owner.id,
        session_id: randomUUID()
      })
      .select("id")
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();

    await page.goto("/settings");
    await expect(page.getByText(data!.id)).toBeVisible();
    await page.getByRole("button", { name: "Revoke all other devices" }).click();
    await expect(
      page.getByRole("listitem").filter({ hasText: data!.id })
    ).toContainText("Revoked");
    await page.goto("/today");
    await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
  });

  test("warns before the idle lock", async ({ page }) => {
    const start = new Date("2024-06-01T08:00:00Z");
    await page.clock.install({ time: start });
    await page.goto("/today");
    await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
    await page.clock.runFor(1500);
    await page.clock.setSystemTime(new Date("2024-06-01T08:25:00Z"));
    await page.clock.runFor(1500);
    await expect(page.getByRole("status")).toContainText(/will lock/i);
    await page.getByRole("button", { name: "Stay signed in" }).click();
    await expect(page.getByRole("status")).toHaveCount(0);
    await page.clock.setSystemTime(new Date("2024-06-01T08:55:00Z"));
    await page.clock.runFor(1500);
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Session locked" })
    ).toBeVisible();
  });
});

test.describe("assistant", { tag: "@assistant" }, () => {
  test.use({ storageState: "e2e/.auth/assistant.json" });

  test("cannot open owner collections", async ({ page }) => {
    await page.goto("/owner/today");
    await expect(page).toHaveURL(/\/today$/);
    await expect(
      page.getByRole("heading", { name: "Today's collections" })
    ).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
  });

  test("cannot invite assistants", async ({ page }) => {
    const response = await page.request.post("/api/members", {
      data: { email: "karon-e2e-denied@example.com" }
    });
    expect(response.status()).toBe(403);
  });
});

test.describe("other clinic", { tag: "@owner" }, () => {
  test.use({ storageState: "e2e/.auth/other-owner.json" });

  test("does not list the first clinic owner as staff", async ({ page }) => {
    await page.goto("/settings?tab=members");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Staff" })).toBeVisible();
    await expect(page.getByText(identities().owner.id)).toHaveCount(0);
  });
});
