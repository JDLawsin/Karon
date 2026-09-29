import { describe, expect, it } from "vitest";

import { siteConfig, type SiteConfig, validateSiteConfig } from "./site.config";

const openConfig = (redGate?: keyof SiteConfig["releaseGates"]): SiteConfig => ({
  ...siteConfig,
  mode: "open",
  ctas: {
    primary: { ctaId: "open-signup", label: "Start", href: "https://app.example.test/signup", mode: "open" },
    secondary: { ctaId: "open-demo", label: "Book a demo", href: "/demo?intent=demo", mode: "open" },
    existingClinic: { ctaId: "existing-clinic", label: "Sign in", href: "https://app.example.test/login", mode: "open" }
  },
  price: 700,
  releaseGates: {
    "KR-008": redGate !== "KR-008",
    "KR-017": redGate !== "KR-017",
    "KR-018": redGate !== "KR-018",
    "KR-020": redGate !== "KR-020"
  }
});

describe("site mode guard", () => {
  it.each(["KR-008", "KR-017", "KR-018", "KR-020"] as const)("rejects %s", (gate) => {
    expect(() => validateSiteConfig(openConfig(gate))).toThrow(gate);
  });

  it("rejects price", () => {
    expect(() => validateSiteConfig({ ...openConfig(), price: null })).toThrow("price");
  });

  it("accepts open mode only when every gate and price pass", () => {
    expect(validateSiteConfig(openConfig()).mode).toBe("open");
  });

  it("keeps design-partner CTAs away from signup", () => {
    const renderedCtas = Object.values(siteConfig.ctas).map(({ href, label }) => `${label} ${href}`).join(" ");
    expect(renderedCtas).not.toMatch(/signup|checkout|paymongo/i);
    expect(siteConfig.ctas.primary.label).toBe("Apply as a founding clinic");
  });
});
