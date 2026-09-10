import type { ComponentProps } from "react";

import { cn } from "../lib/cn";
import {
  KARON_MARK_VIEWBOX,
  karonMarkBackrestPath,
  karonMarkLeftRootPath,
  karonMarkNow,
  karonMarkRightRootPath,
  karonMarkSeatPath
} from "./karon-mark-paths";

type Props = {
  className?: string;
  title?: string;
} & Pick<ComponentProps<"svg">, "aria-hidden">;

const KaronMark = ({
  "aria-hidden": ariaHidden,
  className,
  title = "Karon"
}: Props) => {
  const isDecorative = ariaHidden === true || ariaHidden === "true";

  return (
    <svg
      aria-hidden={isDecorative}
      className={cn("size-8", className)}
      fill="currentColor"
      role={isDecorative ? undefined : "img"}
      viewBox={KARON_MARK_VIEWBOX}
      xmlns="http://www.w3.org/2000/svg"
    >
      {isDecorative ? null : <title>{title}</title>}
      <path d={karonMarkBackrestPath} />
      <path d={karonMarkSeatPath} />
      <path d={karonMarkLeftRootPath} />
      <path d={karonMarkRightRootPath} />
      <circle cx={karonMarkNow.cx} cy={karonMarkNow.cy} r={karonMarkNow.r} />
    </svg>
  );
};

export default KaronMark;
