"use client";

import {
  Card,
  Label,
  showErrorToast,
  showSuccessToast,
  Switch
} from "@karon/design-system";
import { useEffect, useState } from "react";

import {
  notifyIdleLockEnabled,
  parseIdleLockEnabled
} from "@/features/auth/idle-lock";
import { createBrowserSupabase } from "@/lib/supabase/browser";

const IdleLockSettings = () => {
  const [enabled, setEnabled] = useState(true);
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void createBrowserSupabase()
      .auth.getUser()
      .then(({ data }) => {
        if (!cancelled) {
          setEnabled(
            parseIdleLockEnabled(data.user?.user_metadata?.idle_lock_enabled)
          );
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) {
          setReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const save = async (next: boolean) => {
    setPending(true);
    const { error } = await createBrowserSupabase().auth.updateUser({
      data: { idle_lock_enabled: next }
    });

    if (error) {
      showErrorToast("Could not save session lock.");
      setPending(false);
      return;
    }

    setEnabled(next);
    notifyIdleLockEnabled(next);
    showSuccessToast("Session lock saved.");
    setPending(false);
  };

  return (
    <Card className="gap-3">
      <h2 className="text-lg font-semibold">Session lock</h2>
      <div className="flex min-h-(--control-min-height) items-center gap-3">
        <Switch
          checked={enabled}
          disabled={!ready || pending}
          id="idle-lock-enabled"
          onCheckedChange={(next) => {
            void save(next);
          }}
        />
        <Label className="min-w-0" htmlFor="idle-lock-enabled">
          Lock after 30 minutes idle
        </Label>
      </div>
      <p className="text-sm text-muted-foreground">
        When on, you are signed out after 30 minutes with no activity. When off,
        stay signed in while Karon is open.
      </p>
    </Card>
  );
};

export default IdleLockSettings;
