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

import {
  activityResetsIdle,
  clearStoredLastActive,
  idlePhase,
  readStoredLastActive,
  writeStoredLastActive
} from "@/features/auth/idle-lock";
import type { Membership } from "@/features/auth/resolve-auth-destination";
import { writeAuditEvent } from "@/lib/auth/audit";
import { leaveClinicSession } from "@/lib/auth/leave-clinic-session";
import { createBrowserSupabase } from "@/lib/supabase/browser";

type Props = {
  membership: Membership;
  userId: string;
  sessionActive: boolean;
  children: ReactNode;
};

const IdleLockGate = ({
  membership,
  userId,
  sessionActive,
  children
}: Props) => {
  const lastActiveRef = useRef(0);
  const phaseRef = useRef<"ok" | "warn" | "lock">(sessionActive ? "ok" : "lock");
  const [phase, setPhase] = useState<"ok" | "warn" | "lock">(
    sessionActive ? "ok" : "lock"
  );

  useEffect(() => {
    const setNextPhase = (next: "ok" | "warn" | "lock") => {
      phaseRef.current = next;
      setPhase(next);
    };

    if (!sessionActive) {
      setNextPhase("lock");
    } else {
      const stored = readStoredLastActive(userId);
      lastActiveRef.current = stored ?? Date.now();
      if (stored == null) {
        writeStoredLastActive(userId, lastActiveRef.current);
      }
      setNextPhase(idlePhase(Date.now(), lastActiveRef.current));
    }

    const markActive = () => {
      if (!sessionActive || !activityResetsIdle(phaseRef.current)) {
        return;
      }

      lastActiveRef.current = Date.now();
      writeStoredLastActive(userId, lastActiveRef.current);
      setNextPhase("ok");
      void createBrowserSupabase().rpc("touch_my_session");
    };

    window.addEventListener("pointerdown", markActive);
    window.addEventListener("keydown", markActive);

    const onVisibility = () => {
      if (!sessionActive || phaseRef.current === "lock") {
        return;
      }

      setNextPhase(idlePhase(Date.now(), lastActiveRef.current));
    };

    document.addEventListener("visibilitychange", onVisibility);

    const timer = window.setInterval(() => {
      if (phaseRef.current === "lock" || !sessionActive) {
        return;
      }

      setNextPhase(idlePhase(Date.now(), lastActiveRef.current));
    }, 1000);

    return () => {
      window.removeEventListener("pointerdown", markActive);
      window.removeEventListener("keydown", markActive);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(timer);
    };
  }, [sessionActive, userId]);

  useEffect(() => {
    if (phase !== "lock") {
      return;
    }

    const lock = async () => {
      clearStoredLastActive(userId);
      const supabase = createBrowserSupabase();
      await writeAuditEvent(supabase, {
        tenantId: membership.tenantId,
        actorUserId: userId,
        eventType: "auth.idle_lock"
      });
      await leaveClinicSession(supabase);
    };

    void lock();
  }, [membership.tenantId, phase, sessionActive, userId]);

  const staySignedIn = () => {
    lastActiveRef.current = Date.now();
    writeStoredLastActive(userId, lastActiveRef.current);
    phaseRef.current = "ok";
    setPhase("ok");
    void createBrowserSupabase().rpc("touch_my_session");
  };

  const stayOpen = (event: { preventDefault: () => void }) => {
    event.preventDefault();
  };

  return (
    <>
      <div inert={phase === "lock"}>{children}</div>
      <AlertDialog open={phase === "warn"}>
        <AlertDialogContent onEscapeKeyDown={stayOpen}>
          <AlertDialogTitle>Stay signed in?</AlertDialogTitle>
          <AlertDialogDescription>
            Your session will lock in 5 minutes. Stay signed in to keep working.
          </AlertDialogDescription>
          <Button className="mt-6 w-full" onClick={staySignedIn} type="button">
            Stay signed in
          </Button>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={phase === "lock"}>
        <AlertDialogContent onEscapeKeyDown={stayOpen}>
          <AlertDialogTitle>Session locked</AlertDialogTitle>
          <AlertDialogDescription>
            Sign in again to use the clinic.
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
