import { execFileSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync
} from "node:fs";
import { extname, join, relative, resolve } from "node:path";

import { claims } from "../apps/www/content/claims.ts";
import { headlineProof } from "../apps/www/content/headline-proof.ts";
import { imageManifest } from "../apps/www/content/image-manifest.ts";

const root = resolve(import.meta.dirname, "..");
const releaseCandidate = process.env.KARON_RELEASE_CANDIDATE === "1" || process.argv.includes("--release");
const violations = [];
const imageExtensions = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);
const publicExtensions = new Set([".body", ".html", ".txt", ".xml"]);
const inventoryModes = ["design-partner", "open"];

const walk = (path, visit) => {
  if (!existsSync(path)) return;

  for (const entry of readdirSync(path)) {
    const file = join(path, entry);
    if (statSync(file).isDirectory()) walk(file, visit);
    else visit(file);
  }
};

const git = (args) => execFileSync(
  "git",
  ["-c", `safe.directory=${root.replaceAll("\\", "/")}`, ...args],
  { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
).trim();

const currentSha = () => process.env.GITHUB_SHA ?? git(["rev-parse", "HEAD"]);

const validateLiveClaims = () => {
  const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);

  for (const [id, claim] of Object.entries(claims)) {
    if (claim.status !== "live") continue;

    if (!("proof" in claim) || !("lastVerified" in claim)) {
      violations.push(`${id}: live claims require proof and lastVerified`);
      continue;
    }

    const verified = new Date(`${claim.lastVerified}T00:00:00Z`);
    const ageDays = Math.floor((today.getTime() - verified.getTime()) / 86_400_000);
    if (Number.isNaN(verified.getTime()) || ageDays > 30) {
      violations.push(`${id}: proof is ${ageDays} days old (maximum 30)`);
    }

    try {
      git(["cat-file", "-e", `${claim.proof.commit}:${claim.proof.path}`]);
    } catch {
      violations.push(`${id}: missing proof ${claim.proof.path} at ${claim.proof.commit}`);
    }

    try {
      const lastTouched = git(["log", "-1", "--format=%cs", "--", claim.proof.path]);
      if (lastTouched && lastTouched > claim.lastVerified) {
        violations.push(`${id}: proof predates the latest change to ${claim.proof.path}`);
      }
    } catch {
      violations.push(`${id}: could not inspect proof history`);
    }
  }
};

const validateImages = () => {
  const manifestPaths = new Set(imageManifest.map(({ path }) => path.replaceAll("\\", "/")));
  const diskImages = [];

  walk(join(root, "apps/www"), (file) => {
    const normalized = relative(root, file).replaceAll("\\", "/");
    if (normalized.includes("/.next/") || normalized.includes("/node_modules/")) return;
    if (imageExtensions.has(extname(file).toLowerCase())) diskImages.push(normalized);
  });

  diskImages.filter((path) => !manifestPaths.has(path))
    .forEach((path) => violations.push(`${path}: image is missing from image-manifest.ts`));
  [...manifestPaths].filter((path) => !diskImages.includes(path))
    .forEach((path) => violations.push(`${path}: manifest image does not exist`));

  for (const image of imageManifest) {
    for (const id of image.registryIds) {
      if (!(id in claims)) violations.push(`${image.path}: unknown claim ${id}`);
      else if (claims[id].status === "exists-not-marketed") {
        violations.push(`${image.path}: maps to exists-not-marketed claim ${id}`);
      }
    }

    if (image.kind === "demo-capture") {
      if (!process.env.DEMO_SUPABASE_PROJECT_REF || !process.env.DEMO_DEPLOYMENT_ID) {
        violations.push(`${image.path}: demo capture config is missing`);
      } else if (
        image.sourceTenant.projectRef !== process.env.DEMO_SUPABASE_PROJECT_REF ||
        image.sourceTenant.deploymentId !== process.env.DEMO_DEPLOYMENT_ID
      ) {
        violations.push(`${image.path}: sourceTenant does not match the demo deployment`);
      }

      const statuses = image.registryIds.map((id) => claims[id]?.status);
      if (statuses.includes("building") && image.buildingBadge !== true) {
        violations.push(`${image.path}: building captures require a Building badge`);
      }

      if (image.shows) {
        const shows = [...image.shows].sort().join(",");
        if (image.autoConfirm !== false || shows !== "inbox-section,requests-strip" || !image.reviewerSignOff) {
          violations.push(`${image.path}: hero capture declaration or reviewer sign-off is incomplete`);
        }
      }
    }

    if (extname(image.path).toLowerCase() !== ".svg") {
      const content = readFileSync(join(root, image.path));
      if (content.includes(Buffer.from("Exif\0\0"))) violations.push(`${image.path}: EXIF metadata remains`);
    }
  }
};

const validateRenderedOutput = () => {
  const never = [
    /\bHIPAA\b/iu,
    /\bGDPR\b/iu,
    /\bNPC\s+(?:compliant|registered)\b/iu,
    /\bcertified\b/iu,
    /\bbank[ -]level\b/iu,
    /\bmilitary[ -]grade\b/iu,
    /\bunhackable\b/iu,
    /\b100%\s+secure\b/iu,
    /\bguaranteed\b.{0,40}\b(?:data|security)\b/isu,
    /\b(?:google calendar|gcal|calendar sync)\b/iu,
    /\b(?:hidden fees|nickel and dime)\b/iu,
    /\b(?:hurry|limited time|countdown)\b/iu,
    /\bonly\s+\d+\s+(?:left|remaining)\b/iu,
    /\bends in\b/iu,
    /\bfree forever\b/iu,
    /\b(?:affordable|cheapest|lowest price|budget-friendly)\b/iu,
    /\bAI(?:-powered)?\s+(?:diagnosis|diagnostic)\b/iu,
    /\b(?:testimonial|logo wall|customer stories)\b/iu,
    /\b\d+\s+clinics?\s+(?:trust|use|choose)\b/iu,
    /â‚±/u,
    /—/u
  ];
  const gated = [
    ["offline-durable", /\boffline[ -](?:first|durable|durability)\b/iu],
    ["import", /\b(?:data|patient|service)\s+import(?:s|ing)?\b/iu],
    ["online-billing", /\bonline billing\b/iu],
    ["sound-alerts", /\b(?:sound alert|soft sound)s?\b/iu],
    ["multi-currency-locale", /\b(?:multi-currency|multiple currencies)\b/iu],
    ["no-show-outcome", /\b(?:reduce|prevent|stop)\s+no-shows?\b/iu]
  ];

  for (const outputRoot of ["apps/www/.next/server/app", "apps/clinic/.next/server/app"]) {
    walk(join(root, outputRoot), (file) => {
      if (!publicExtensions.has(extname(file).toLowerCase())) return;
      const content = readFileSync(file, "utf8");
      if (extname(file).toLowerCase() === ".body" && !/^[\s<{#[\]]/u.test(content)) return;
      never.forEach((pattern) => {
        if (pattern.test(content)) violations.push(`${relative(root, file)}: forbidden public claim ${pattern}`);
      });
      gated.forEach(([id, pattern]) => {
        if (claims[id].status !== "live" && pattern.test(content)) {
          violations.push(`${relative(root, file)}: ${id} is not live`);
        }
      });

      const claimElements = content.match(/<[^>]+data-claim-(?:id|status|slot)=[^>]+>/gu) ?? [];
      claimElements.forEach((element) => {
        if (/data-claim-slot="shipped-benefit"/u.test(element) && !/data-claim-status="live"/u.test(element)) {
          violations.push(`${relative(root, file)}: non-live claim in shipped-benefit slot`);
        }
      });

      if (/data-claim-status="(?:building|absent|exists-not-marketed)"[^<]{0,200}Live now/isu.test(content)) {
        violations.push(`${relative(root, file)}: non-live claim carries the Live now label`);
      }

      const siteConfig = readFileSync(join(root, "apps/www/content/site.config.ts"), "utf8");
      const endpoints = [...siteConfig.matchAll(/(?:minimum|maximum):\s*(\d+)/gu)].map((match) => Number(match[1]));
      for (const match of content.matchAll(/(?:\$(?=\s*\d{3})|\bUSD\b|₱)\s*([\d,]+)/giu)) {
        const amount = Number(match[1].replaceAll(",", ""));
        if (!endpoints.includes(amount)) violations.push(`${relative(root, file)}: unapproved price ${match[0]}`);
      }
    });
  }

  walk(join(root, "apps/www"), (file) => {
    if (extname(file).toLowerCase() !== ".csv") return;
    if (/\b(?:google calendar|gcal|calendar sync)\b/iu.test(readFileSync(file, "utf8"))) {
      violations.push(`${relative(root, file)}: exists-not-marketed calendar term`);
    }
  });

  const clinicMetadata = [
    "apps/clinic/src/app/layout.tsx",
    "apps/clinic/src/app/manifest.ts"
  ].map((path) => readFileSync(join(root, path), "utf8")).join("\n");
  if (/offline[ -]first/iu.test(clinicMetadata)) {
    violations.push("clinic metadata: offline-first is not registry-backed");
  }
  if (!clinicMetadata.includes("entitySentence")) {
    violations.push("clinic metadata: entity sentence is not registry-backed");
  }
};

const validateChangedCopy = () => {
  let diff = "";
  try {
    let base = "HEAD";
    if (process.env.GITHUB_BASE_REF) {
      base = git(["merge-base", "HEAD", `origin/${process.env.GITHUB_BASE_REF}`]);
    } else if (process.env.GITHUB_EVENT_BEFORE && !/^0+$/u.test(process.env.GITHUB_EVENT_BEFORE)) {
      base = process.env.GITHUB_EVENT_BEFORE;
    }
    diff = git(["diff", "--unified=0", base, "--", "apps/www/src"]);
  } catch {
    return;
  }

  let file = "";
  const literalClaim = /^(?:const\s+(?:title|description)\s*=|.*(?:title|description|alt)=)[^\n]*["'][A-Z][^"']+["']/u;

  for (const line of diff.split(/\r?\n/u)) {
    if (line.startsWith("+++ b/")) file = line.slice(6);
    if (!line.startsWith("+") || line.startsWith("+++")) continue;
    if (literalClaim.test(line.slice(1).trim())) {
      violations.push(`${file}: added claim-slot copy must use a registry id`);
    }
  }
};

const validateCompetitors = async () => {
  const today = new Date();

  for (const [id, claim] of Object.entries(claims)) {
    if (!("type" in claim) || claim.type !== "competitor") continue;
    const ageDays = Math.floor((today.getTime() - new Date(`${claim.asOf}T00:00:00Z`).getTime()) / 86_400_000);
    if (ageDays > 90 || claim.approvedBy.length === 0) {
      violations.push(`${id}: competitor source is stale or unapproved`);
    }

    try {
      const response = await fetch(claim.source, { method: "HEAD", redirect: "follow" });
      if (response.status >= 400) violations.push(`${id}: competitor source returned ${response.status}`);
    } catch {
      violations.push(`${id}: competitor source could not be verified`);
    }
  }
};

const validateInventories = () => {
  const inventory = Object.fromEntries(Object.entries(claims).map(([id, claim]) => [id, {
    status: claim.status,
    text: claim.text
  }]));
  const serialized = `${JSON.stringify(inventory, null, 2)}\n`;

  for (const mode of inventoryModes) {
    const path = join(root, `apps/www/content/claims-inventory.${mode}.json`);
    if (!existsSync(path) || readFileSync(path, "utf8") !== serialized) {
      violations.push(`${relative(root, path)}: inventory differs from the registry`);
    }
  }
};

const validateRelease = () => {
  if (!releaseCandidate) return;

  const sha = currentSha();
  if (!headlineProof.autoConfirmOff || !headlineProof.autoConfirmOn || headlineProof.commit !== sha) {
    violations.push("release: headline proof must pass with auto-confirm off and on at the release SHA");
  }

  const oracle = readFileSync(join(root, "product/launch/round2/CLAIMED-CURRENT-CODE-GROUND.md"), "utf8");
  if (!oracle.includes(sha)) violations.push(`release: oracle is not pinned to ${sha}`);

  for (const [id, claim] of Object.entries(claims)) {
    if (claim.status !== "live") continue;
    const row = oracle.split(/\r?\n/u).find((line) => line.includes(`| ${claim.oracleRef.row} |`));
    if (!row || !/\|\s*GROUNDED(?:\s|\(|\|)/u.test(row) || !/\*\*PASS/u.test(row)) {
      violations.push(`${id}: oracle row is not GROUNDED with a PASS oracle`);
    }
  }
};

validateLiveClaims();
validateImages();
validateRenderedOutput();
validateChangedCopy();
validateInventories();
validateRelease();
await validateCompetitors();

if (violations.length > 0) throw new Error(`Claims check failed:\n${violations.join("\n")}`);
console.log("Claims registry, images, inventories, and rendered output passed.");
