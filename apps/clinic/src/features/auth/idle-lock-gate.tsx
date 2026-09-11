"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  Button
} from "@karon/design-system";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { idlePhase } from "@/features/auth/idle-lock";
import type { Membership } from "@/features/auth/resolve-auth-destination";
import { writeAuditEvent } from "@/lib/auth/audit";
import { leaveClinicSession } from "@/lib/auth/leave-clinic-session";
import { createBrowserSupabase } from "@/lib/supabase/browser";

type Props = {
  membership: Membership;
  userId: string;
  children: ReactNode;
};

const IdleLockGate = ({ membership, userId, children }: Props) => {
  const lastActiveRef = useRef(0);
  const phaseRef = useRef<"ok" | "warn" | "lock">("ok");
  const [phase, setPhase] = useState<"ok" | "warn" | "lock">("ok");

  useEffect(() => {
    const setNextPhase = (next: "ok" | "warn" | "lock") => {
      phaseRef.current = next;
      setPhase(next);
    };

    const markActive = () => {
      if (phaseRef.current === "lock") {
        return;
      }

      lastActiveRef.current = Date.now();
      setNextPhase("ok");
      void createBrowserSupabase().rpc("touch_my_session");
    };

    lastActiveRef.current = Date.now();
    window.addEventListener("pointerdown", markActive);
    window.addEventListener("keydown", markActive);
    void createBrowserSupabase().rpc("touch_my_session");

    const timer = window.setInterval(() => {
      if (phaseRef.current === "lock") {
        return;
      }

      setNextPhase(idlePhase(Date.now(), lastActiveRef.current));
    }, 1000);

    return () => {
      window.removeEventListener("pointerdown", markActive);
      window.removeEventListener("keydown", markActive);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (phase !== "lock") {
      return;
    }

    const lock = async () => {
      const supabase = createBrowserSupabase();
      await writeAuditEvent(supabase, {
        tenantId: membership.tenantId,
        actorUserId: userId,
        eventType: "auth.idle_lock"
      });
      await leaveClinicSession(supabase);
    };

    void lock();
  }, [membership.tenantId, phase, userId]);

  const staySignedIn = () => {
    lastActiveRef.current = Date.now();
    phaseRef.current = "ok";
    setPhase("ok");
    void createBrowserSupabase().rpc("touch_my_session");
  };

  const stayLocked = (event: { preventDefault: () => void }) => {
    event.preventDefault();
  };

  return (
    <>
      <div inert={phase === "lock"}>{children}</div>
      {phase === "warn" ? (
        <div
          aria-live="polite"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-warning bg-warning-subtle px-4 py-3"
          role="status"
        >
          <div className="mx-auto flex max-w-3xl min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-warning-foreground">
              Your session will lock in 5 minutes. Stay signed in to keep working.
            </p>
            <Button onClick={staySignedIn} type="button">
              Stay signed in
            </Button>
          </div>
        </div>
      ) : null}
      <AlertDialog open={phase === "lock"}>
        <AlertDialogContent onEscapeKeyDown={stayLocked}>
          <AlertDialogTitle>Session locked</AlertDialogTitle>
          <AlertDialogDescription>
            Sign in again to use the clinic. Work saved on this device is still here.
          </AlertDialogDescription>
          <AlertDialogAction asChild className="mt-6 w-full">
            <a href="/login">Log in</a>
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default IdleLockGate;
