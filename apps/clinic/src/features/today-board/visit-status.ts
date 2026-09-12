import type { VisitStatus } from "@/lib/sync/event-schema";

const initialVisitStatus = (autoConfirm: boolean): VisitStatus =>
  autoConfirm ? "confirmed" : "pending_review";

const ALLOWED: Record<VisitStatus, readonly VisitStatus[]> = {
  confirmed: ["waiting", "cancelled", "no_show"],
  pending_review: ["waiting", "cancelled", "no_show"],
  waiting: ["in_chair"],
  in_chair: ["complete"],
  complete: [],
  cancelled: [],
  no_show: []
};

const transitionVisitStatus = (from: VisitStatus, to: VisitStatus): VisitStatus | null =>
  ALLOWED[from].includes(to) ? to : null;

export { initialVisitStatus, transitionVisitStatus };
