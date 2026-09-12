"use client";

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  StatusBadge,
  cn
} from "@karon/design-system";

import {
  BOARD_STATUS_LABEL,
  VISIT_STATUS_LABEL,
  formatVisitTime,
  nextVisitStatus,
  type BoardStatus,
  type TodayBoardRow
} from "@/features/today-board/project-today-board";
import { transitionVisitStatus } from "@/features/today-board/visit-status";
import type { VisitStatus } from "@/lib/sync/event-schema";

type Props = {
  status: BoardStatus;
  rows: TodayBoardRow[];
  onMark: (visitId: string, status: VisitStatus) => void;
};

const STATUS_TONE = {
  pending_review: "info",
  confirmed: "neutral",
  waiting: "info",
  in_chair: "primary",
  late: "warning",
  complete: "success"
} as const;

const TodayStatusGroup = ({ status, rows, onMark }: Props) => {
  const headingId = `today-${status}`;

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "flex min-w-0 flex-col gap-2",
        rows.length === 0 && "max-md:hidden",
        "md:rounded-lg md:bg-surface-sunken md:p-3"
      )}
    >
      <h2
        className={cn(
          "flex min-w-0 items-baseline justify-between gap-2 text-sm font-medium text-foreground",
          status === "late" && "text-warning",
          rows.length === 0 && "max-md:sr-only"
        )}
        id={headingId}
      >
        <span>{BOARD_STATUS_LABEL[status]}</span>
        <span className="tabular-nums text-muted-foreground">{rows.length}</span>
      </h2>
      {rows.length > 0 ? (
        <ul className="flex min-w-0 flex-col gap-1">
          {rows.map((row) => {
            const next = nextVisitStatus(row.status);
            const nextLabel = next ? VISIT_STATUS_LABEL[next] : null;
            const canCancel =
              transitionVisitStatus(row.storedStatus, "cancelled") !== null;
            const canNoShow =
              transitionVisitStatus(row.storedStatus, "no_show") !== null;

            return (
              <li
                className="flex min-h-(--control-min-height) min-w-0 flex-wrap items-center gap-2 border-b-(length:var(--surface-border-width)) border-border py-2 last:border-b-0 md:border-0 md:py-1"
                key={row.visitId}
              >
                <p className="shrink-0 tabular-nums text-sm text-muted-foreground">
                  {formatVisitTime(row.startsAt)}
                </p>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{row.name}</p>
                  <div className="flex min-w-0 flex-wrap items-center gap-1">
                    <StatusBadge
                      className={
                        row.status === "late" ? "text-warning-foreground" : undefined
                      }
                      tone={STATUS_TONE[row.status]}
                    >
                      {BOARD_STATUS_LABEL[row.status]}
                    </StatusBadge>
                    <StatusBadge tone={row.syncState === "local" ? "info" : "success"}>
                      {row.syncState === "local" ? "On this device" : "Synced"}
                    </StatusBadge>
                  </div>
                </div>
                {next && nextLabel ? (
                  <Button
                    aria-label={`Mark ${row.name} ${nextLabel.toLowerCase()}`}
                    onClick={() => onMark(row.visitId, next)}
                    type="button"
                    variant="outline"
                  >
                    {nextLabel}
                  </Button>
                ) : null}
                {canCancel || canNoShow ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        aria-label={`More actions for ${row.name}`}
                        type="button"
                        variant="ghost"
                      >
                        More
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" collisionPadding={8}>
                      {canCancel ? (
                        <DropdownMenuItem
                          onSelect={() => onMark(row.visitId, "cancelled")}
                        >
                          Cancel
                        </DropdownMenuItem>
                      ) : null}
                      {canNoShow ? (
                        <DropdownMenuItem
                          onSelect={() => onMark(row.visitId, "no_show")}
                        >
                          No-show
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
};

export default TodayStatusGroup;
