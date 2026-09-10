import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true
  },
  test: {
    projects: [
      {
        test: {
          name: "node",
          environment: "node",
          include: [
            "apps/clinic/src/**/*.test.ts",
            "packages/db/src/**/*.test.ts",
            "packages/design-system/src/**/*.test.ts"
          ]
        }
      },
      {
        test: {
          name: "react",
          environment: "jsdom",
          include: [
            "apps/clinic/src/**/*.test.tsx",
            "packages/design-system/src/**/*.test.tsx"
          ],
          setupFiles: ["./vitest.setup.ts"]
        }
      }
    ]
  }
});
