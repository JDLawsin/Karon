"use client";

import { Button, PageHeader } from "@karon/design-system";
import { useMemo, useState } from "react";

import {
  BOARD_STATUSES,
  BOARD_STATUS_LABEL,
  countByBoardStatus,
  formatClinicDate
} from "@/features/today-board/project-today-board";
import TodayStatusGroup from "@/features/today-board/today-status-group";
import { useTodayBoard } from "@/features/today-board/use-today-board";
import WalkInForm from "@/features/today-board/walk-in-form";

const TodayBoard = () => {
  const { rows, ready, now, isDuplicateMobile, addWalkInPatient, markVisit } =
    useTodayBoard();
  const [adding, setAdding] = useState(false);
  const counts = useMemo(() => countByBoardStatus(rows), [rows]);
  const todayLabel = formatClinicDate(now);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        description={todayLabel}
        title="Today"
      >
        {adding ? null : (
          <Button onClick={() => setAdding(true)} type="button">
            Add patient
          </Button>
        )}
      </PageHeader>
      {adding ? (
        <WalkInForm
          isDuplicateMobile={isDuplicateMobile}
          onCancel={() => setAdding(false)}
          onSave={async (draft) => {
            await addWalkInPatient(draft);
            setAdding(false);
          }}
        />
      ) : null}
      {rows.length > 0 ? (
        <ul className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">
          {BOARD_STATUSES.map((status) => (
            <li
              className="min-w-0 rounded-lg border-(length:var(--surface-border-width)) border-border bg-card px-3 py-3 transition-transform duration-(--motion-duration) hover:scale-(--surface-hover-scale)"
              key={status}
            >
              <p className="text-sm text-muted-foreground">
                {BOARD_STATUS_LABEL[status]}
              </p>
              <p className="text-2xl font-semibold tabular-nums">
                {counts[status]}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
      {ready && !adding && rows.length === 0 ? (
        <p className="text-muted-foreground">No patients today</p>
      ) : null}
      {rows.length > 0 ? (
        <div className="flex min-w-0 flex-col gap-6 md:grid md:grid-cols-4 md:gap-3">
          {BOARD_STATUSES.map((status) => (
            <TodayStatusGroup
              key={status}
              onMark={markVisit}
              rows={rows.filter((row) => row.status === status)}
              status={status}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default TodayBoard;
