"use client";

// Deferred: Google Calendar — keep for later reconnect

import {
  Button,
  Input,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  cn,
  showErrorToast,
  showSuccessToast
} from "@karon/design-system";
import { Copy, Trash2 } from "lucide-react";

type Props = {
  name: string;
  url: string;
  disabled?: boolean;
  onRemove: () => void;
};

const iconButtonClass =
  "w-(--control-min-height) shrink-0 px-0 text-muted-foreground hover:bg-muted hover:text-foreground";

const BookingPageLink = ({ name, url, disabled, onRemove }: Props) => {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      showSuccessToast("Link copied.");
    } catch {
      showErrorToast("Could not copy link.");
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-md border-(length:var(--surface-border-width)) border-border p-3">
      <p className="truncate font-medium">{name}</p>
      <div className="flex min-w-0 items-center gap-1">
        <Input
          aria-label={`${name} booking page link`}
          className="min-w-0 flex-1"
          onFocus={(event) => event.currentTarget.select()}
          readOnly
          value={url}
        />
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label="Copy link"
                className={iconButtonClass}
                disabled={disabled}
                onClick={() => {
                  void copy();
                }}
                type="button"
                variant="ghost"
              >
                <Copy />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label={`Remove ${name}`}
                className={cn(
                  iconButtonClass,
                  "hover:bg-destructive-subtle hover:text-destructive"
                )}
                disabled={disabled}
                onClick={onRemove}
                type="button"
                variant="ghost"
              >
                <Trash2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Remove</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

export default BookingPageLink;
