import type { ClaimId } from "./claims";

type BrandImage = {
  kind: "brand";
  path: string;
  registryIds: ReadonlyArray<ClaimId>;
};

type DemoCapture = {
  kind: "demo-capture";
  path: string;
  sourceTenant: {
    projectRef: string;
    deploymentId: string;
  };
  registryIds: ReadonlyArray<ClaimId>;
  capturedAt: `${number}-${number}-${number}`;
  captureCommit: string;
  autoConfirm?: boolean;
  shows?: ReadonlyArray<"requests-strip" | "inbox-section">;
  buildingBadge?: true;
  reviewerSignOff: string;
};

export type ClaimImage = BrandImage | DemoCapture;

export const imageManifest = [
  {
    kind: "brand",
    path: "apps/www/public/logo.svg",
    registryIds: []
  }
] as const satisfies ReadonlyArray<ClaimImage>;
