"use client";

import { Button, Input, cn } from "@karon/design-system";
import { useEffect, useId, useRef, useState } from "react";

import {
  filterDentalServiceSuggestions,
  type DentalServiceSuggestion
} from "@/features/services/service-catalog";
import { SERVICE_ICON_OPTIONS } from "@/features/services/service-icons";

type Props = {
  id: string;
  value: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  onChange: (value: string) => void;
  onSelectSuggestion: (suggestion: DentalServiceSuggestion) => void;
};

const ServiceNameField = ({
  id,
  value,
  disabled = false,
  invalid = false,
  describedBy,
  onChange,
  onSelectSuggestion
}: Props) => {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const suggestions = filterDentalServiceSuggestions(value);
  const showList = open && !disabled && suggestions.length > 0;
  const safeActiveIndex =
    suggestions.length === 0
      ? 0
      : Math.min(activeIndex, suggestions.length - 1);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const pick = (suggestion: DentalServiceSuggestion) => {
    onSelectSuggestion(suggestion);
    setOpen(false);
  };

  return (
    <div className="relative flex min-w-0 flex-col gap-2" ref={rootRef}>
      <Input
        aria-activedescendant={
          showList ? `${listId}-option-${safeActiveIndex}` : undefined
        }
        aria-autocomplete="list"
        aria-controls={listId}
        aria-describedby={describedBy}
        aria-expanded={showList}
        aria-invalid={invalid}
        autoComplete="off"
        disabled={disabled}
        id={id}
        onChange={(event) => {
          onChange(event.target.value);
          setActiveIndex(0);
          setOpen(true);
        }}
        onFocus={() => {
          setActiveIndex(0);
          setOpen(true);
        }}
        onBlur={() => {
          // Delay so option click (mousedown → blur → click) still registers.
          window.setTimeout(() => {
            if (!rootRef.current?.contains(document.activeElement)) {
              setOpen(false);
            }
          }, 0);
        }}
        onKeyDown={(event) => {
          if (!showList) {
            if (event.key === "ArrowDown") {
              setOpen(true);
            }
            return;
          }

          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((index) => (index + 1) % suggestions.length);
            return;
          }

          if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex(
              (index) => (index - 1 + suggestions.length) % suggestions.length
            );
            return;
          }

          if (event.key === "Enter" && suggestions[safeActiveIndex]) {
            event.preventDefault();
            pick(suggestions[safeActiveIndex]!);
            return;
          }

          if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder="Search common services or type your own"
        role="combobox"
        value={value}
      />

      {showList ? (
        <ul
          className={cn(
            "karon-scroll-region-y absolute top-full z-10 mt-1 max-h-64 w-full min-w-0 overflow-y-auto rounded-md border-(length:var(--surface-border-width)) border-border bg-popover p-1 shadow-md"
          )}
          id={listId}
          role="listbox"
        >
          {suggestions.map((suggestion, index) => {
            const Icon = SERVICE_ICON_OPTIONS[suggestion.icon];
            const active = index === safeActiveIndex;

            return (
              <li key={suggestion.name} role="presentation">
                <Button
                  aria-selected={active}
                  className={cn(
                    "h-auto min-h-11 w-full justify-start gap-3 px-3 py-2 text-left font-normal hover:scale-100",
                    active && "bg-accent text-accent-foreground"
                  )}
                  id={`${listId}-option-${index}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => pick(suggestion)}
                  role="option"
                  type="button"
                  variant="ghost"
                >
                  <Icon aria-hidden className="size-5 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block wrap-anywhere font-medium">
                      {suggestion.name}
                    </span>
                    <span className="mt-0.5 block line-clamp-2 text-xs text-muted-foreground">
                      {suggestion.description}
                    </span>
                  </span>
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
};

export default ServiceNameField;
