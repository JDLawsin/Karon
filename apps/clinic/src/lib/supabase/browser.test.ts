import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));

describe("browser supabase client source", () => {
  it("never mentions a service-role or secret key", () => {
    for (const file of ["browser.ts", "auth-route.ts", "proxy-session.ts"] as const) {
      const source = readFileSync(join(here, file), "utf8");
      expect(source, file).not.toMatch(
        /SERVICE_ROLE|SECRET_KEY|service_role|sb_secret/i
      );
    }
  });
});
