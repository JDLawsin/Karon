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
import Link from "next/link";
import type { ComponentProps } from "react";

import {
  BOARD_STATUS_LABEL,
  VISIT_STATUS_LABEL,
  formatVisitTime,
  nextVisitStatus,
  type TodayBoardRow
} from "@/features/today-board/project-today-board";
import OverflowTooltipText from "@/features/today-board/overflow-tooltip-text";
import VisitProcessAction from "@/features/today-board/visit-process-action";
import {
  isReverseVisitStatus,
  transitionVisitStatus
} from "@/features/today-board/visit-status";
import type { VisitStatus } from "@/lib/sync/event-schema";

type Props = {
  locale: string;
  row: TodayBoardRow;
  timezone: string;
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

const REVERSE_TARGETS = [
  "in_chair",
  "waiting",
  "confirmed",
  "pending_review"
] as const satisfies readonly VisitStatus[];

const TodayHuddleCard = ({
  locale,
  row,
  timezone,
  onMark,
  showStatus = false,
  isDragging = false,
  overlay = false,
  draggable = false,
  dragRef,
  dragProps
}: Props) => {
  const next = nextVisitStatus(row.status);
  const reverseTargets = REVERSE_TARGETS.filter(
    (status) =>
      transitionVisitStatus(row.storedStatus, status) !== null &&
      isReverseVisitStatus(row.storedStatus, status)
  );
  const canCancel = transitionVisitStatus(row.storedStatus, "cancelled") !== null;
  const canNoShow = transitionVisitStatus(row.storedStatus, "no_show") !== null;
  const hasMenu = reverseTargets.length > 0 || canCancel || canNoShow;
  const isInChair = row.status === "in_chair";

  return (
    <li
      {...dragProps}
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-lg bg-background p-3",
        draggable && "cursor-grab",
        isDragging && "opacity-40",
        overlay && "ring-2 ring-primary"
      )}
      ref={dragRef}
      role="listitem"
    >
      <div className="flex min-w-0 items-center gap-2">
        <p className="min-w-0 flex-1 text-sm font-medium tabular-nums text-muted-foreground">
          {formatVisitTime(row.startsAt, timezone, locale)}
        </p>
        {hasMenu ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label={`More actions for ${row.name}`}
                className="size-11 min-h-11 shrink-0 px-0 hover:scale-100 [&_svg]:size-5"
                onPointerDown={(event) => event.stopPropagation()}
                type="button"
                variant="ghost"
              >
                <EllipsisVertical aria-hidden />
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
      <div className="flex min-w-0 flex-col gap-1.5">
        <OverflowTooltipText className="line-clamp-2 text-base font-semibold leading-5">
          {row.name}
        </OverflowTooltipText>
        {row.serviceName ? (
          <OverflowTooltipText className="line-clamp-2 text-sm font-medium leading-5">
            {row.serviceName}
          </OverflowTooltipText>
        ) : (
          <p className="text-sm text-muted-foreground">Service not set</p>
        )}
        {row.note ? (
          <OverflowTooltipText className="line-clamp-2 text-sm leading-5 text-muted-foreground">
            {row.note}
          </OverflowTooltipText>
        ) : null}
      </div>
      {showStatus || row.syncState === "local" || next ? (
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            {showStatus ? (
              <StatusBadge tone={STATUS_TONE[row.status]}>
                {BOARD_STATUS_LABEL[row.status]}
              </StatusBadge>
            ) : null}
            {row.syncState === "local" ? (
              <span className="text-xs text-info">On this device</span>
            ) : null}
          </div>
          {next ? (
            <VisitProcessAction
              name={row.name}
              next={next}
              onPress={() => onMark(row.visitId, next)}
            />
          ) : null}
        </div>
      ) : null}
      {isInChair ? (
        <Button asChild className="w-full px-2 hover:scale-100">
          <Link
            href={`/patients/${encodeURIComponent(row.patientId)}?visit=${encodeURIComponent(row.visitId)}`}
            onPointerDown={(event) => event.stopPropagation()}
          >
            Open visit
          </Link>
        </Button>
      ) : null}
    </li>
  );
};

export default TodayHuddleCard;
