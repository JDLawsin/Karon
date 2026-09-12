"use client";

import { Avatar } from "@karon/design-system";
import { useEffect, useMemo, useState } from "react";

import type { ClinicRole } from "@/features/auth/resolve-auth-destination";
import {
  staffAvatarDataUri,
  staffRoleLabel
} from "@/features/auth/staff-avatar";
import { createBrowserSupabase } from "@/lib/supabase/browser";

type Props = {
  userId: string;
  role: ClinicRole;
  bare?: boolean;
};

const ClinicStaffAvatar = ({
  userId,
  role,
  bare = false
}: Props) => {
  const src = useMemo(() => staffAvatarDataUri(userId), [userId]);
  const [email, setEmail] = useState<string | null>(null);
  const label = staffRoleLabel(role);
  const avatar = (
    <Avatar>
      {/* eslint-disable-next-line @next/next/no-img-element -- DiceBear SVG data URI */}
      <img
        alt={`${label} avatar`}
        className="size-full object-cover"
        src={src}
      />
    </Avatar>
  );

  useEffect(() => {
    let cancelled = false;
    const getSession = createBrowserSupabase()?.auth?.getSession;

    if (!getSession) {
      return;
    }

    void getSession()
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
      {avatar}
      <div className="min-w-0 group-data-[collapsible=icon]:hidden">
        <p className="truncate text-sm font-medium">{label}</p>
        {email ? (
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        ) : null}
      </div>
    </div>
  );
};

export default ClinicStaffAvatar;
