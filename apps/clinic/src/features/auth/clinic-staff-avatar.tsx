"use client";

import { Avatar, Skeleton } from "@karon/design-system";
import { useEffect, useMemo, useState } from "react";

import type { ClinicRole } from "@/features/auth/resolve-auth-destination";
import {
  staffAvatarDataUri,
  staffRoleLabel,
  type StaffAvatarStyleId
} from "@/features/auth/staff-avatar";
import StaffAvatarMenu from "@/features/auth/staff-avatar-menu";
import { useStaffAvatarPreference } from "@/features/auth/staff-avatar-preference";
import { createBrowserSupabase } from "@/lib/supabase/browser";

type StaffAvatarProps = {
  userId: string;
  role: ClinicRole;
  seed?: string;
  style?: StaffAvatarStyleId;
};

const StaffAvatar = ({ userId, role, seed, style }: StaffAvatarProps) => {
  const avatarSeed = seed ?? userId;
  const src = useMemo(
    () => staffAvatarDataUri(avatarSeed, style),
    [avatarSeed, style]
  );
  const label = staffRoleLabel(role);

  return (
    <Avatar>
      {/* eslint-disable-next-line @next/next/no-img-element -- DiceBear SVG data URI */}
      <img
        alt={`${label} avatar`}
        className="size-full object-cover"
        src={src}
      />
    </Avatar>
  );
};

type Props = StaffAvatarProps & {
  bare?: boolean;
  inlineEmail?: boolean;
  editable?: boolean;
};

const ClinicStaffAvatar = ({
  userId,
  role,
  bare = false,
  inlineEmail = false,
  editable = false
}: Props) => {
  const { resolvedSeed, resolvedStyle, ready } = useStaffAvatarPreference();
  const [email, setEmail] = useState<string | null>(null);
  const label = staffRoleLabel(role);
  const avatar = ready ? (
    <StaffAvatar
      role={role}
      seed={resolvedSeed}
      style={resolvedStyle}
      userId={userId}
    />
  ) : (
    <Skeleton
      aria-busy
      aria-label={`Loading ${label.toLowerCase()} avatar`}
      className="size-10 shrink-0 rounded-full"
    />
  );

  useEffect(() => {
    let cancelled = false;
    const supabase = createBrowserSupabase();

    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!cancelled) {
          setEmail(data.session?.user.email ?? null);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className={
        bare
          ? "flex min-w-0 items-center gap-2 overflow-hidden group-data-[collapsible=icon]:justify-center"
          : "flex min-w-0 items-center gap-2 overflow-hidden px-2 py-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
      }
    >
      {editable && ready ? <StaffAvatarMenu>{avatar}</StaffAvatarMenu> : avatar}
      <div className="min-w-0 group-data-[collapsible=icon]:hidden">
        {inlineEmail && email ? (
          <p className="truncate text-sm font-medium">
            {label}
            <span aria-hidden className="text-muted-foreground"> · </span>
            <span className="font-normal text-muted-foreground">{email}</span>
          </p>
        ) : (
          <>
            <p className="truncate text-sm font-medium">{label}</p>
            {email ? (
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};

export { StaffAvatar };
export default ClinicStaffAvatar;
