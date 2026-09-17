import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

import { test as setup, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { LoginPage } from "./pages/login-page";
import { totpFromSecret } from "./totp";

const envFile = resolve(process.cwd(), "apps/clinic/.env");

if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error("Auth setup needs Supabase URL and secret key");
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const TEST_PASSWORD = "Clinic-test-pass-12";
const suffix = randomUUID().slice(0, 8);
const authDir = resolve(process.cwd(), "e2e/.auth");

const identities = {
  password: TEST_PASSWORD,
  owner: {
    email: `karon-e2e-owner-${suffix}@example.com`,
    id: ""
  },
  assistant: {
    email: `karon-e2e-assistant-${suffix}@example.com`,
    id: ""
  },
  otherOwner: {
    email: `karon-e2e-other-${suffix}@example.com`,
    id: ""
  },
  clinicA: "",
  clinicB: ""
};

const createUser = async (email: string) => {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true
  });

  if (error || !data.user) {
    throw error ?? new Error(`Could not create ${email}`);
  }

  return data.user.id;
};

const insertClinic = async (name: string) => {
  const id = randomUUID();
  const { error } = await admin.from("clinics").insert({
    id,
    name,
    region: "ph"
  });

  if (error) {
    throw error;
  }

  return id;
};

const resetBrowserAuth = async (page: Page) => {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
};

const completeOwnerLogin = async (page: Page, email: string) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.submitPassword(email, TEST_PASSWORD);
  await page.waitForURL(/\/(mfa|today|onboarding)/);

  if (!page.url().includes("/mfa")) {
    await page.waitForURL(/\/today$/);
    await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
    return;
  }

  const secret = await login.readTotpSecret();
  await login.submitTotp(totpFromSecret(secret).generate());
  await page.waitForURL(/\/today$/);
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
};

setup.setTimeout(120_000);

setup("seed clinics and storage states", async ({ page }) => {
  mkdirSync(authDir, { recursive: true });

  identities.owner.id = await createUser(identities.owner.email);
  identities.assistant.id = await createUser(identities.assistant.email);
  identities.otherOwner.id = await createUser(identities.otherOwner.email);
  identities.clinicA = await insertClinic(`E2E Clinic A ${suffix}`);
  identities.clinicB = await insertClinic(`E2E Clinic B ${suffix}`);

  const { error: memberError } = await admin.from("clinic_members").insert([
    {
      tenant_id: identities.clinicA,
      user_id: identities.owner.id,
      role: "owner"
    },
    {
      tenant_id: identities.clinicA,
      user_id: identities.assistant.id,
      role: "assistant"
    },
    {
      tenant_id: identities.clinicB,
      user_id: identities.otherOwner.id,
      role: "owner"
    }
  ]);

  if (memberError) {
    throw memberError;
  }

  const { error: serviceError } = await admin.from("clinic_services").insert({
    tenant_id: identities.clinicA,
    name: "E2E Cleaning",
    description: "Routine cleaning for browser tests.",
    icon: "cleaning",
    price_minor: 120_000,
    currency_code: "PHP",
    duration_minutes: 45,
    created_by: identities.owner.id,
    updated_by: identities.owner.id
  });

  if (serviceError) {
    throw serviceError;
  }

  writeFileSync(
    resolve(authDir, "users.json"),
    JSON.stringify(identities, null, 2)
  );

  await completeOwnerLogin(page, identities.owner.email);
  await page.context().storageState({ path: resolve(authDir, "owner.json") });

  await resetBrowserAuth(page);
  const login = new LoginPage(page);
  await login.goto();
  await login.submitPassword(identities.assistant.email, TEST_PASSWORD);
  await page.waitForURL(/\/today$/);
  await page.context().storageState({ path: resolve(authDir, "assistant.json") });

  await resetBrowserAuth(page);
  await completeOwnerLogin(page, identities.otherOwner.email);
  await page.context().storageState({ path: resolve(authDir, "other-owner.json") });
});
