"use client";

import {
  Alert,
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  Button
} from "@karon/design-system";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

import {
  activityResetsIdle,
  clearStoredLastActive,
  IDLE_HEARTBEAT_MS,
  IDLE_LAST_ACTIVE_KEY,
  IDLE_LOCK_ENABLED_EVENT,
  idlePhase,
  parseIdleLockEnabled,
  readStoredLastActive,
  writeStoredLastActive,
  type IdlePhase
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
  const phaseRef = useRef<IdlePhase>(sessionActive ? "ok" : "lock");
  const wasDisabledRef = useRef(false);
  const [phase, setPhase] = useState<IdlePhase>(sessionActive ? "ok" : "lock");
  const [idleLockEnabled, setIdleLockEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    void createBrowserSupabase()
      .auth.getUser()
      .then(({ data }) => {
        if (cancelled) {
          return;
        }

        setIdleLockEnabled(
          parseIdleLockEnabled(data.user?.user_metadata?.idle_lock_enabled)
        );
      })
      .catch(() => {
        if (!cancelled) {
          setIdleLockEnabled(true);
        }
      });

    const onPref = (event: Event) => {
      if (!(event instanceof CustomEvent) || typeof event.detail !== "boolean") {
        return;
      }

      setIdleLockEnabled(event.detail);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== IDLE_LOCK_ENABLED_EVENT || event.newValue == null) {
        return;
      }

      setIdleLockEnabled(event.newValue === "1");
    };

    window.addEventListener(IDLE_LOCK_ENABLED_EVENT, onPref);
    window.addEventListener("storage", onStorage);

    return () => {
      cancelled = true;
      window.removeEventListener(IDLE_LOCK_ENABLED_EVENT, onPref);
      window.removeEventListener("storage", onStorage);
    };
  }, [userId]);

  useEffect(() => {
    const setNextPhase = (next: IdlePhase) => {
      phaseRef.current = next;
      setPhase(next);
    };

    if (!sessionActive) {
      setNextPhase("lock");
      return;
    }

    const touchSession = () => {
      void createBrowserSupabase().rpc("touch_my_session");
    };

    const markActive = () => {
      if (!sessionActive || !activityResetsIdle(phaseRef.current)) {
        return;
      }

      lastActiveRef.current = Date.now();
      writeStoredLastActive(userId, lastActiveRef.current);
      if (idleLockEnabled === true) {
        setNextPhase("ok");
      }
      touchSession();
    };

    if (idleLockEnabled == null) {
      const stored = readStoredLastActive(userId);
      lastActiveRef.current = stored ?? Date.now();
      if (stored == null) {
        writeStoredLastActive(userId, lastActiveRef.current);
      }

      window.addEventListener("pointerdown", markActive);
      window.addEventListener("keydown", markActive);
      touchSession();
      const heartbeat = window.setInterval(touchSession, IDLE_HEARTBEAT_MS);

      return () => {
        window.removeEventListener("pointerdown", markActive);
        window.removeEventListener("keydown", markActive);
        window.clearInterval(heartbeat);
      };
    }

    if (!idleLockEnabled) {
      wasDisabledRef.current = true;
      lastActiveRef.current = Date.now();
      writeStoredLastActive(userId, lastActiveRef.current);
      setNextPhase("ok");
      touchSession();
      const heartbeat = window.setInterval(touchSession, IDLE_HEARTBEAT_MS);

      return () => {
        window.clearInterval(heartbeat);
      };
    }

    if (wasDisabledRef.current) {
      lastActiveRef.current = Date.now();
      writeStoredLastActive(userId, lastActiveRef.current);
      wasDisabledRef.current = false;
    } else {
      const stored = readStoredLastActive(userId);
      lastActiveRef.current = stored ?? Date.now();
      if (stored == null) {
        writeStoredLastActive(userId, lastActiveRef.current);
      }
    }

    setNextPhase(idlePhase(Date.now(), lastActiveRef.current));

    window.addEventListener("pointerdown", markActive);
    window.addEventListener("keydown", markActive);

    const onVisibility = () => {
      if (!sessionActive || phaseRef.current === "lock") {
        return;
      }

      setNextPhase(idlePhase(Date.now(), lastActiveRef.current));
    };

    const onActivityInAnotherTab = (event: StorageEvent) => {
      if (
        event.key !== `${IDLE_LAST_ACTIVE_KEY}:${userId}` ||
        event.newValue == null ||
        !activityResetsIdle(phaseRef.current)
      ) {
        return;
      }

      const activeAt = Number(event.newValue);
      if (!Number.isFinite(activeAt) || activeAt <= lastActiveRef.current) {
        return;
      }

      lastActiveRef.current = activeAt;
      setNextPhase(idlePhase(Date.now(), activeAt));
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("storage", onActivityInAnotherTab);
    touchSession();
    const heartbeat = window.setInterval(() => {
      if (phaseRef.current === "lock" || !sessionActive) {
        return;
      }

      touchSession();
    }, IDLE_HEARTBEAT_MS);

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
      window.removeEventListener("storage", onActivityInAnotherTab);
      window.clearInterval(heartbeat);
      window.clearInterval(timer);
    };
  }, [idleLockEnabled, sessionActive, userId]);

  useEffect(() => {
    if (phase !== "lock") {
      return;
    }

    if (idleLockEnabled === false && sessionActive) {
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
  }, [idleLockEnabled, membership.tenantId, phase, sessionActive, userId]);

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
          <Alert className="mt-4" title="Don't want this security feature?" variant="info">
            You can turn it off in{" "}
            <Link
              className="text-primary underline-offset-4 hover:underline"
              href="/settings"
            >
              Settings
            </Link>
            , on the Account tab.
          </Alert>
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
