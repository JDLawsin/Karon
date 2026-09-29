import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import Claim from "../src/features/claim/claim";
import { claims, claimText, liveLlmsClaims } from "./claims";
import { headlineClaimId, headlineProof } from "./headline-proof";
import { imageManifest } from "./image-manifest";

describe("claims registry", () => {
  it("keeps internal proof out of public claim text", () => {
    const publicText = Object.values(claims).map(({ text }) => text).join(" ");

    expect(publicText).not.toMatch(/apps\/(?:clinic|www)|[0-9a-f]{7,40}/u);
    expect(claimText("entity-sentence")).toContain("dental clinic management app");
  });

  it("lists only live claims in llms.txt", () => {
    const listed = liveLlmsClaims();

    expect(listed.length).toBeGreaterThan(0);
    expect(listed).not.toContain(claimText("google-calendar"));
    expect(listed).not.toContain(claimText("patient-records"));
  });

  it("uses the inbox headline until both release proofs pass", () => {
    expect(headlineProof.autoConfirmOff).toBe(false);
    expect(headlineProof.autoConfirmOn).toBe(false);
    expect(headlineClaimId()).toBe("headline-one-inbox");
  });

  it("maps every image to known registry ids", () => {
    expect(imageManifest.every(({ registryIds }) =>
      registryIds.every((id) => id in claims)
    )).toBe(true);
  });

  it("renders status and slot markers without exposing proof", () => {
    const html = renderToStaticMarkup(createElement(Claim, {
      id: "patient-records",
      showStatus: true,
      slot: "description"
    }));

    expect(html).toContain('data-claim-status="building"');
    expect(html).toContain('data-claim-slot="description"');
    expect(html).toContain("Building with founding clinics");
    expect(html).not.toMatch(/oracle|proof|commit/iu);
  });

  it("refuses to render exists-not-marketed entries", () => {
    expect(() => renderToStaticMarkup(createElement(Claim, { id: "google-calendar" })))
      .toThrow("google-calendar");
  });
});
