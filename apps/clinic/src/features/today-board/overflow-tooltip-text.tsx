"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn
} from "@karon/design-system";
import { useEffect, useRef, useState } from "react";

type Props = {
  children: string;
  className?: string;
};

const OverflowTooltipText = ({ children, className }: Props) => {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const text = textRef.current;

    if (!text) {
      return;
    }

    const updateOverflow = () => {
      setIsOverflowing(
        text.scrollHeight > text.clientHeight || text.scrollWidth > text.clientWidth
      );
    };

    updateOverflow();

    if (typeof ResizeObserver !== "function") {
      return;
    }

    const observer = new ResizeObserver(updateOverflow);
    observer.observe(text);

    return () => observer.disconnect();
  }, [children]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <p
          className={cn(
            "min-w-0 break-words focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className
          )}
          ref={textRef}
          tabIndex={isOverflowing ? 0 : undefined}
        >
          {children}
        </p>
      </TooltipTrigger>
      {isOverflowing ? (
        <TooltipContent
          className="max-w-sm whitespace-normal"
          collisionPadding={8}
        >
          {children}
        </TooltipContent>
      ) : null}
    </Tooltip>
  );
};

export default OverflowTooltipText;
