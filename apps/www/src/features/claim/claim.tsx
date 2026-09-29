import { StatusBadge } from "@karon/design-system";

import { claims, type ClaimId } from "../../../content/claims";

const statusLabels = {
  live: "Live now",
  building: "Building with founding clinics",
  absent: "Coming before public launch"
} as const;

type Props = {
  id: ClaimId;
  showStatus?: boolean;
  slot?: "description" | "headline" | "shipped-benefit";
};

const Claim = ({ id, showStatus = false, slot }: Props) => {
  const claim = claims[id];

  if (claim.status === "exists-not-marketed") {
    throw new Error(`Claim ${id} is marked exists-not-marketed and cannot render`);
  }

  return (
    <span
      className="inline-flex max-w-full flex-wrap items-baseline gap-2"
      data-claim-id={id}
      data-claim-slot={slot}
      data-claim-status={claim.status}
    >
      <span>{claim.text}</span>
      {showStatus && (
        <StatusBadge
          className={
            claim.status === "building"
              ? "border border-current bg-transparent"
              : claim.status === "absent"
                ? "border border-dashed border-current bg-transparent"
                : undefined
          }
          tone={claim.status === "live" ? "primary" : "neutral"}
        >
          {statusLabels[claim.status]}
        </StatusBadge>
      )}
    </span>
  );
};

export default Claim;
