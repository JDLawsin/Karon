import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";

const roots = ["apps/www/.next/server/app", "apps/www/.next/static"];
const allowedExtensions = new Set([".html", ".js", ".json", ".rsc", ".txt", ".xml"]);
const forbidden = /\b(?:trial|checkout|paymongo|offer|rating|review)\b/iu;
const signupLink = `${new URL(process.env.APP_URL).origin}/signup`;
const violations = [];

const visit = (path) => {
  for (const entry of readdirSync(path)) {
    const file = join(path, entry);
    if (statSync(file).isDirectory()) {
      visit(file);
    } else if (allowedExtensions.has(extname(file))) {
      const content = readFileSync(file, "utf8");
      if (forbidden.test(content)) violations.push(`${file}: forbidden design-partner term`);
      if (content.includes(signupLink)) violations.push(`${file}: signup link`);
    }
  }
};

roots.forEach(visit);

if (violations.length > 0) throw new Error(violations.join("\n"));
console.log("Design-partner build output passed.");
