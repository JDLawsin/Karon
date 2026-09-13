"use client";

import {
  Alert,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from "@karon/design-system";
import { LoaderCircle, ChevronLeft, ChevronRight, Shuffle } from "lucide-react";
import { useMemo, useRef, useState, type ReactNode } from "react";

import { useStaffAvatarPreference } from "@/features/auth/staff-avatar-preference";
import {
  STAFF_AVATAR_PRESETS,
  STAFF_AVATAR_STYLE_IDS,
  STAFF_AVATAR_STYLES,
  staffAvatarDataUri,
  type StaffAvatarStyleId
} from "@/features/auth/staff-avatar";
import { useClinicSession } from "@/lib/auth/clinic-session";

type Props = {
  children: ReactNode;
};

const menuWidthClass = "w-64 max-w-[calc(100vw-2rem)]";
const styleScrollStepPx = 88;

const styleScrollButtonClass =
  "inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

const styleTabClass = (active: boolean) =>
  cn(
    "inline-flex h-9 shrink-0 items-center justify-center rounded-md px-2.5 text-xs font-medium whitespace-nowrap text-muted-foreground transition-[color,background-color] duration-(--motion-duration) hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
    active && "bg-background text-foreground"
  );

const StaffAvatarMenu = ({ children }: Props) => {
  const { userId } = useClinicSession();
  const { resolvedSeed, resolvedStyle, saving, saveAvatar } =
    useStaffAvatarPreference();
  const [open, setOpen] = useState(false);
  const [styleTab, setStyleTab] = useState<StaffAvatarStyleId>(resolvedStyle);
  const [error, setError] = useState<string | null>(null);
  const styleScrollRef = useRef<HTMLDivElement>(null);

  const options = useMemo(
    () => [userId, ...STAFF_AVATAR_PRESETS.filter((seed) => seed !== userId)],
    [userId]
  );

  const pickAvatar = (seed: string, style: StaffAvatarStyleId) => {
    void (async () => {
      setError(null);
      const ok = await saveAvatar({ seed, style });

      if (!ok) {
        setError("Could not update your avatar.");
        return;
      }

      setOpen(false);
    })();
  };

  const scrollStyleTabs = (direction: "left" | "right") => {
    const node = styleScrollRef.current;

    if (!node) {
      return;
    }

    node.scrollBy({
      left: direction === "left" ? -styleScrollStepPx : styleScrollStepPx,
      behavior: "smooth"
    });
  };

  return (
    <DropdownMenu
      modal={false}
      onOpenChange={(next) => {
        setOpen(next);

        if (next) {
          setStyleTab(resolvedStyle);
          setError(null);
        }
      }}
      open={open}
    >
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Change avatar"
          className="group relative shrink-0 rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          type="button"
        >
          {children}
          <span
            aria-hidden
            className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/55 text-[10px] font-medium text-background opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          >
            Edit
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className={`${menuWidthClass} !max-h-none min-w-0 overflow-x-hidden overflow-y-visible p-2`}
        collisionPadding={8}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
        }}
        side="bottom"
        sideOffset={8}
      >
        <DropdownMenuLabel className="px-1 py-1">Avatar</DropdownMenuLabel>
        <div className="flex w-full min-w-0 flex-col gap-2">
          <div className="flex min-w-0 items-center gap-0.5">
            <button
              aria-label="Scroll styles left"
              className={styleScrollButtonClass}
              onPointerDown={(event) => {
                event.preventDefault();
                scrollStyleTabs("left");
              }}
              type="button"
            >
              <ChevronLeft aria-hidden className="size-4" />
            </button>
            <div
              aria-label="Avatar style"
              className="min-w-0 flex-1 overflow-x-hidden overscroll-x-contain"
              ref={styleScrollRef}
              role="tablist"
            >
              <div className="flex w-max flex-nowrap gap-1">
                {STAFF_AVATAR_STYLE_IDS.map((styleId) => {
                  const active = styleTab === styleId;

                  return (
                    <button
                      aria-selected={active}
                      className={styleTabClass(active)}
                      key={styleId}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        setStyleTab(styleId);
                      }}
                      role="tab"
                      type="button"
                    >
                      {STAFF_AVATAR_STYLES[styleId].label}
                    </button>
                  );
                })}
              </div>
            </div>
            <button
              aria-label="Scroll styles right"
              className={styleScrollButtonClass}
              onPointerDown={(event) => {
                event.preventDefault();
                scrollStyleTabs("right");
              }}
              type="button"
            >
              <ChevronRight aria-hidden className="size-4" />
            </button>
          </div>
          <div className="grid w-full grid-cols-6 gap-1" role="tabpanel">
            {options.map((seed, index) => {
              const selected =
                resolvedSeed === seed && resolvedStyle === styleTab;
              const label =
                seed === userId ? "Default avatar" : `Avatar option ${index}`;

              return (
                <button
                  aria-label={label}
                  aria-pressed={selected}
                  className={`flex min-h-9 min-w-9 items-center justify-center rounded-full ring-1 ring-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                    selected ? "ring-2 ring-primary" : ""
                  }`}
                  disabled={saving}
                  key={`${styleTab}-${seed}`}
                  onClick={() => {
                    pickAvatar(seed, styleTab);
                  }}
                  type="button"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- DiceBear SVG data URI */}
                  <img
                    alt=""
                    className="size-7 rounded-full object-cover"
                    src={staffAvatarDataUri(seed, styleTab)}
                  />
                </button>
              );
            })}
          </div>
        </div>
        <button
          className="mt-2 flex min-h-9 w-full items-center justify-center gap-2 rounded-md px-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
          disabled={saving}
          onClick={() => {
            pickAvatar(crypto.randomUUID(), styleTab);
          }}
          type="button"
        >
          {saving ? (
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
          ) : (
            <Shuffle aria-hidden className="size-4" />
          )}
          Shuffle
        </button>
        {error ? (
          <Alert className="mt-2" title={error} variant="danger" />
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default StaffAvatarMenu;
