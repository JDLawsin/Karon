"use client";

import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@karon/design-system";
import { Armchair, Check, Clock3, type LucideIcon } from "lucide-react";

import { VISIT_STATUS_LABEL } from "@/features/today-board/project-today-board";
import type { VisitStatus } from "@/lib/sync/event-schema";

type Props = {
  name: string;
  next: VisitStatus;
  onPress: () => void;
};

const PROCESS_ICON: Partial<Record<VisitStatus, LucideIcon>> = {
  waiting: Clock3,
  in_chair: Armchair,
  complete: Check
};

const VisitProcessAction = ({ name, next, onPress }: Props) => {
  const Icon = PROCESS_ICON[next];

  if (!Icon) {
    return null;
  }

  const label = `Mark ${name} ${VISIT_STATUS_LABEL[next].toLowerCase()}`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-label={label}
          className="size-11 min-h-11 shrink-0 bg-primary/10 px-0 text-primary hover:scale-100 hover:bg-primary hover:text-primary-foreground [&_svg]:size-5"
          onClick={onPress}
          onPointerDown={(event) => event.stopPropagation()}
          type="button"
          variant="ghost"
        >
          <Icon aria-hidden />
        </Button>
      </TooltipTrigger>
      <TooltipContent collisionPadding={8} side="top">
        {label}
      </TooltipContent>
    </Tooltip>
  );
};

export default VisitProcessAction;
