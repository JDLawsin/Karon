"use client";

import { Button } from "@karon/design-system";
import { useState } from "react";

import { BOARD_STATUSES } from "@/features/today-board/project-today-board";
import TodayStatusGroup from "@/features/today-board/today-status-group";
import { useTodayBoard } from "@/features/today-board/use-today-board";
import WalkInForm from "@/features/today-board/walk-in-form";

const TodayBoard = () => {
  const { rows, ready, isDuplicateMobile, addWalkInPatient, markVisit } =
    useTodayBoard();
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="text-2xl font-semibold">Today</h1>
        {adding ? null : (
          <Button onClick={() => setAdding(true)} type="button">
            Add patient
          </Button>
        )}
      </div>
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
