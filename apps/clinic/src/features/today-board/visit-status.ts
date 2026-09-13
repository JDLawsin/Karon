import type { VisitStatus } from "@/lib/sync/event-schema";

const initialVisitStatus = (autoConfirm: boolean): VisitStatus =>
  autoConfirm ? "confirmed" : "pending_review";

const PIPELINE_RANK: Record<VisitStatus, number> = {
  pending_review: 0,
  confirmed: 1,
  waiting: 2,
  in_chair: 3,
  complete: 4,
  cancelled: -1,
  no_show: -1
};

const ALLOWED: Record<VisitStatus, readonly VisitStatus[]> = {
  confirmed: ["waiting", "pending_review", "cancelled", "no_show"],
  pending_review: ["waiting", "confirmed", "cancelled", "no_show"],
  waiting: ["in_chair", "confirmed", "pending_review"],
  in_chair: ["complete", "waiting", "confirmed", "pending_review"],
  complete: ["in_chair", "waiting", "confirmed", "pending_review"],
  cancelled: [],
  no_show: []
};

const transitionVisitStatus = (from: VisitStatus, to: VisitStatus): VisitStatus | null =>
  ALLOWED[from].includes(to) ? to : null;

const isReverseVisitStatus = (from: VisitStatus, to: VisitStatus) => {
  const fromRank = PIPELINE_RANK[from];
  const toRank = PIPELINE_RANK[to];

  return fromRank >= 0 && toRank >= 0 && toRank < fromRank;
};

export { initialVisitStatus, isReverseVisitStatus, transitionVisitStatus };
