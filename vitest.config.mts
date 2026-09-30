import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    alias: {
      "@": path.join(root, "apps/clinic/src"),
      "server-only": path.join(root, "vitest.server-only.ts")
    }
  },
  test: {
    projects: [
      {
        test: {
          name: "node",
          environment: "node",
          include: [
            "apps/clinic/src/**/*.test.ts",
            "apps/www/**/*.test.ts",
            "packages/db/src/**/*.test.ts",
            "packages/design-system/src/**/*.test.ts",
            "supabase/templates/**/*.test.ts"
          ],
          exclude: [
            "packages/db/src/**/*.rls.test.ts",
            "apps/clinic/src/**/*.rls.test.ts"
          ],
          env: {
            WWW_URL: "https://www.example.test",
            APP_URL: "https://app.example.test"
          }
        }
      },
      {
        test: {
          name: "react",
          environment: "jsdom",
          include: [
            "apps/clinic/src/**/*.test.tsx",
            "apps/www/src/**/*.test.tsx",
            "packages/design-system/src/**/*.test.tsx"
          ],
          setupFiles: ["./vitest.setup.ts"],
          env: {
            WWW_URL: "https://www.example.test",
            APP_URL: "https://app.example.test"
          }
        }
      }
    ]
  }
});
