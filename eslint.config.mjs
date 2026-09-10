import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: [
      "packages/**/*.{ts,tsx}",
      "e2e/**/*.ts",
      "*.ts",
      "*.mts"
    ],
    rules: {
      "@next/next/no-html-link-for-pages": "off"
    }
  },
  globalIgnores([
    "**/.next/**",
    "**/coverage/**",
    "**/dist/**",
    "**/node_modules/**",
    "**/playwright-report/**",
    "**/public/sw.js",
    "**/test-results/**",
    "**/next-env.d.ts"
  ])
]);
