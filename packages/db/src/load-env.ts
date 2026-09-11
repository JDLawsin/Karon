import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

const envFiles = [
  resolve(repoRoot, "apps/clinic/.env.local"),
  resolve(repoRoot, "apps/clinic/.env"),
  resolve(repoRoot, ".env.local"),
  resolve(repoRoot, ".env")
];

const loadEnvFiles = () => {
  for (const file of envFiles) {
    if (existsSync(file)) {
      process.loadEnvFile(file);
    }
  }
};

const databaseUrl = () => {
  const raw = process.env.DATABASE_URL;

  if (!raw) {
    return undefined;
  }

  return raw.replace(/^(postgresql:\/\/[^:]+:)\[([^\]]+)\](@)/, "$1$2$3");
};

export { databaseUrl, loadEnvFiles, repoRoot };
