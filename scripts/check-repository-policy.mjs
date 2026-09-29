import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const trackedFiles = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .split(/\r?\n/u)
  .filter(Boolean);
const policyFile = ".github/ci/forbidden-hosts.txt";
const policyScript = "scripts/check-repository-policy.mjs";
const allowedLegacyPath = "docs/adr/0004-monorepo.md";
const forbiddenHosts = readFileSync(policyFile, "utf8")
  .split(/\r?\n/u)
  .map((line) => line.trim().toLowerCase())
  .filter((line) => line && !line.startsWith("#"));
const oldAppPath = ["apps", "marketing"].join("/");
const oldPackageName = ["@karon", "marketing"].join("/");
const violations = [];

for (const file of trackedFiles) {
  let content;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    continue;
  }

  if (file !== policyScript && file !== policyFile) {
    const lowerContent = content.toLowerCase();
    for (const host of forbiddenHosts) {
      if (lowerContent.includes(host)) violations.push(`${file}: production host literal ${host}`);
    }
  }

  if (file !== policyScript && file !== allowedLegacyPath && (content.includes(oldAppPath) || content.includes(oldPackageName))) {
    violations.push(`${file}: legacy marketing app path`);
  }

  if (file.startsWith("apps/www/") && file !== policyScript && content.includes("SITE_URL")) {
    violations.push(`${file}: clinic host variable in www`);
  }

  if (/NEXT_PUBLIC_(?:WWW|APP)_URL/u.test(content)) {
    violations.push(`${file}: public host environment variable`);
  }
}

if (violations.length > 0) {
  throw new Error(`Repository policy failed:\n${violations.join("\n")}`);
}

console.log("Repository host and path policy passed.");
