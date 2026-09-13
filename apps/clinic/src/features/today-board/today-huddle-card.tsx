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
import { EllipsisVertical } from "lucide-react";
import type { ComponentProps } from "react";

import {
  BOARD_STATUS_LABEL,
  VISIT_STATUS_LABEL,
  formatVisitTime,
  nextVisitStatus,
  type TodayBoardRow
} from "@/features/today-board/project-today-board";
import {
  isReverseVisitStatus,
  transitionVisitStatus
} from "@/features/today-board/visit-status";
import type { VisitStatus } from "@/lib/sync/event-schema";

type Props = {
  row: TodayBoardRow;
  onMark: (visitId: string, status: VisitStatus) => void;
  showStatus?: boolean;
  isDragging?: boolean;
  overlay?: boolean;
  draggable?: boolean;
  dragRef?: (node: HTMLLIElement | null) => void;
  dragProps?: ComponentProps<"li">;
};

const STATUS_TONE = {
  pending_review: "info",
  confirmed: "neutral",
  waiting: "info",
  in_chair: "primary",
  late: "warning",
  complete: "success"
} as const;

const ACCENT = {
  pending_review: "border-l-info",
  confirmed: "border-l-muted-foreground/40",
  waiting: "border-l-primary",
  in_chair: "border-l-primary",
  late: "border-l-warning",
  complete: "border-l-success"
} as const;

const REVERSE_TARGETS = [
  "in_chair",
  "waiting",
  "confirmed",
  "pending_review"
] as const satisfies readonly VisitStatus[];

const TodayHuddleCard = ({
  row,
  onMark,
  showStatus = false,
  isDragging = false,
  overlay = false,
  draggable = false,
  dragRef,
  dragProps
}: Props) => {
  const next = nextVisitStatus(row.status);
  const nextLabel = next ? VISIT_STATUS_LABEL[next] : null;
  const reverseTargets = REVERSE_TARGETS.filter(
    (status) =>
      transitionVisitStatus(row.storedStatus, status) !== null &&
      isReverseVisitStatus(row.storedStatus, status)
  );
  const canCancel = transitionVisitStatus(row.storedStatus, "cancelled") !== null;
  const canNoShow = transitionVisitStatus(row.storedStatus, "no_show") !== null;
  const hasMenu = reverseTargets.length > 0 || canCancel || canNoShow;

  return (
    <li
      className={cn(
        "flex min-w-0 flex-col gap-1.5 rounded-lg border border-border border-l-4 bg-background px-2.5 py-2",
        ACCENT[row.status],
        draggable && "cursor-grab",
        isDragging && "opacity-40",
        overlay && "shadow-md"
      )}
      ref={dragRef}
      {...dragProps}
    >
      <div className="flex min-w-0 items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs tabular-nums text-muted-foreground">
            {formatVisitTime(row.startsAt)}
          </p>
          <p className="truncate font-medium leading-5">{row.name}</p>
          {row.serviceName || row.note ? (
            <p className="truncate text-xs text-muted-foreground">
              {[row.serviceName, row.note].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>
        {hasMenu ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label={`More actions for ${row.name}`}
                className="h-8 min-h-8 w-8 max-h-8 shrink-0 px-0 hover:scale-100 [&_svg]:size-3.5"
                onPointerDown={(event) => event.stopPropagation()}
                type="button"
                variant="ghost"
              >
                <EllipsisVertical className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" collisionPadding={8}>
              {reverseTargets.map((status) => (
                <DropdownMenuItem
                  key={status}
                  onSelect={() => onMark(row.visitId, status)}
                >
                  Move to {VISIT_STATUS_LABEL[status].toLowerCase()}
                </DropdownMenuItem>
              ))}
              {canCancel ? (
                <DropdownMenuItem onSelect={() => onMark(row.visitId, "cancelled")}>
                  Cancel
                </DropdownMenuItem>
              ) : null}
              {canNoShow ? (
                <DropdownMenuItem onSelect={() => onMark(row.visitId, "no_show")}>
                  No-show
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
      {showStatus ? (
        <StatusBadge tone={STATUS_TONE[row.status]}>
          {BOARD_STATUS_LABEL[row.status]}
        </StatusBadge>
      ) : null}
      {row.syncState === "local" ? (
        <p className="text-xs text-info">On this device</p>
      ) : null}
      {next && nextLabel ? (
        <Button
          aria-label={`Mark ${row.name} ${nextLabel.toLowerCase()}`}
          className="h-9 min-h-9 w-full px-2 hover:scale-100"
          onClick={() => onMark(row.visitId, next)}
          onPointerDown={(event) => event.stopPropagation()}
          type="button"
          variant="outline"
        >
          {nextLabel}
        </Button>
      ) : null}
    </li>
  );
};

export default TodayHuddleCard;
