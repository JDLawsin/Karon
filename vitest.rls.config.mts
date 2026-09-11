process.env.KARON_REQUIRE_RLS = "1";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "packages/db/src/**/*.rls.test.ts",
      "apps/clinic/src/**/*.rls.test.ts"
    ]
  }
});
