import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const dir = path.dirname(fileURLToPath(import.meta.url));

const templates = [
  { file: "confirmation.html", type: "signup" },
  { file: "magic-link.html", type: "magiclink" },
  { file: "invite.html", type: "invite" },
  { file: "recovery.html", type: "recovery" }
] as const;

describe("auth email templates", () => {
  it.each(templates)("$file is PKCE-safe and branded", ({ file, type }) => {
    const html = readFileSync(path.join(dir, file), "utf8");

    expect(html).toContain("{{ .TokenHash }}");
    expect(html).toContain("/auth/confirm");
    expect(html).toContain(`type=${type}`);
    expect(html).not.toContain("{{ .ConfirmationURL }}");
    expect(html).not.toContain("{{ .Token }}");
    expect(html).toContain('role="presentation"');
    expect(html).toContain('lang="en"');
    expect(html).toContain("#2563EB");
  });
});
