import { describe, expect, it } from "vitest";

import { claims } from "./claims";
import {
  changelog,
  featureGroups,
  isPublishedFeatureId,
  publishedFeatureIds
} from "./features";

describe("features content", () => {
  it("publishes only live features with proof and a checked date", () => {
    const groupedLiveIds = featureGroups.flatMap(({ live, security }) =>
      security ? [...live, security] : [...live]
    );

    expect(publishedFeatureIds.length).toBeGreaterThan(0);
    expect(publishedFeatureIds).toEqual(groupedLiveIds);
    publishedFeatureIds.forEach((id) => {
      const claim = claims[id];
      expect(claim.status).toBe("live");
      expect("proof" in claim).toBe(true);
      expect("lastVerified" in claim).toBe(true);
    });
    expect(isPublishedFeatureId("patient-records")).toBe(false);
  });

  it("keeps live rows before building rows and excludes hidden claims", () => {
    const visibleIds = featureGroups.flatMap(({ live, building, security }) => [
      ...live,
      ...(security ? [security] : []),
      ...building
    ]);

    expect(visibleIds).not.toContain("google-calendar");
    featureGroups.forEach(({ live, building }) => {
      expect(live.every((id) => claims[id].status === "live")).toBe(true);
      expect(building.every((id) => claims[id].status === "building")).toBe(true);
    });
  });

  it("allows shipped changelog entries only for live claims and requires ISO dates", () => {
    changelog.forEach(({ claimId, date }) => {
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
      expect(claims[claimId].status).toBe("live");
      expect(publishedFeatureIds).toContain(claimId);
    });
  });
});
