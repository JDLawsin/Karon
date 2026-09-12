"use client";

import {
  Alert,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  Button,
  Input,
  Label
} from "@karon/design-system";
import { useEffect, useState } from "react";

import { deviceLabel, staffMemberLabel } from "@/features/staff/staff-labels";
import {
  apiErrorSchema,
  inviteBodySchema,
  inviteOkSchema,
  memberUserSchema,
  sessionBodySchema,
  staffDirectorySchema,
  type StaffMember,
  type StaffSession
} from "@/features/staff/staff-schemas";
import FieldError from "@/lib/forms/field-error";
import { parseJson } from "@/lib/forms/parse-json";
import { useClinicForm } from "@/lib/forms/use-clinic-form";

type PendingAction =
  | { kind: "remove"; userId: string }
  | { kind: "revoke"; sessionId: string }
  | { kind: "revoke-others" };

const pendingCopy = (pending: PendingAction) => {
  if (pending.kind === "remove") {
    return {
      title: "Remove this assistant?",
      description: "They will lose access to this clinic.",
      action: "Remove"
    };
  }

  if (pending.kind === "revoke") {
    return {
      title: "Revoke this device?",
      description: "That session will have to log in again.",
      action: "Revoke device"
    };
  }

  return {
    title: "Revoke all other devices?",
    description: "You will stay signed in here.",
    action: "Revoke other devices"
  };
};

const ClinicStaff = () => {
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [sessions, setSessions] = useState<StaffSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useClinicForm(inviteBodySchema, {
    defaultValues: { email: "" }
  });

  const load = async () => {
    const response = await fetch("/api/members");
    const json: unknown = await response.json().catch(() => null);
    const directory = staffDirectorySchema.safeParse(json);

    if (!response.ok || !directory.success) {
      const failed = apiErrorSchema.safeParse(json);
      setError(failed.success ? failed.data.error : "Could not load staff.");
      return;
    }

    setMembers(directory.data.members);
    setSessions(directory.data.sessions);
  };

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(id);
  }, []);

  const onInvite = handleSubmit(async ({ email }) => {
    setError(null);
    setInfo(null);
    const response = await fetch("/api/members", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email })
    });
    const json: unknown = await response.json().catch(() => null);
    const ok = inviteOkSchema.safeParse(json);

    if (!response.ok || !ok.success) {
      const failed = apiErrorSchema.safeParse(json);
      setError(failed.success ? failed.data.error : "Could not invite that assistant.");
      return;
    }

    reset({ email: "" });
    setInfo("Invite sent.");
    await load();
  });

  const removeMember = async (userId: string) => {
    setError(null);
    const body = memberUserSchema.parse({ userId });
    const response = await fetch("/api/members", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const failed = await parseJson(response, apiErrorSchema);
      setError(
        failed.success ? failed.data.error : "Could not remove that assistant."
      );
      return;
    }

    await load();
  };

  const revokeSession = async (sessionId: string) => {
    setError(null);
    const body = sessionBodySchema.parse({ sessionId });
    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const failed = await parseJson(response, apiErrorSchema);
      setError(
        failed.success ? failed.data.error : "Could not revoke that device."
      );
      return;
    }

    await load();
  };

  const revokeOthers = async () => {
    setError(null);
    const body = sessionBodySchema.parse({ others: true });
    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const failed = await parseJson(response, apiErrorSchema);
      setError(
        failed.success ? failed.data.error : "Could not revoke other devices."
      );
      return;
    }

    await load();
  };

  const confirmPending = async () => {
    if (!pending) {
      return;
    }

    const action = pending;
    setPending(null);

    if (action.kind === "remove") {
      await removeMember(action.userId);
      return;
    }

    if (action.kind === "revoke") {
      await revokeSession(action.sessionId);
      return;
    }

    await revokeOthers();
  };

  const copy = pending ? pendingCopy(pending) : null;

  return (
    <div className="flex flex-col gap-8">
      <form
        className="flex max-w-xl flex-col gap-4 rounded-lg border-(length:var(--surface-border-width)) border-border bg-card p-4"
        onSubmit={onInvite}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="invite-email">Assistant email</Label>
          <Input
            aria-describedby={errors.email ? "invite-email-error" : undefined}
            aria-invalid={Boolean(errors.email)}
            autoComplete="email"
            id="invite-email"
            type="email"
            {...register("email")}
          />
          <FieldError id="invite-email-error" message={errors.email?.message} />
        </div>
        {error ? <Alert title={error} variant="danger" /> : null}
        {info ? <Alert title={info} variant="info" /> : null}
        <Button disabled={isSubmitting} type="submit">
          Add assistant
        </Button>
      </form>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Staff</h2>
        <ul className="flex flex-col gap-2">
          {members.map((member) => (
            <li
              className="flex min-w-0 flex-col gap-2 rounded-lg border-(length:var(--surface-border-width)) border-border bg-card px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              key={member.userId}
            >
              <p className="min-w-0 break-all text-sm">
                {staffMemberLabel(member.role, member.email)}
              </p>
              {member.role === "assistant" ? (
                <Button
                  onClick={() => setPending({ kind: "remove", userId: member.userId })}
                  type="button"
                  variant="outline"
                >
                  Remove
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Devices</h2>
          <Button
            onClick={() => setPending({ kind: "revoke-others" })}
            type="button"
            variant="outline"
          >
            Revoke all other devices
          </Button>
        </div>
        <ul className="flex flex-col gap-2">
          {sessions.map((session) => (
            <li
              className="flex min-w-0 flex-col gap-2 rounded-lg border-(length:var(--surface-border-width)) border-border bg-card px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              key={session.id}
            >
              <p className="min-w-0 break-all text-sm">
                {deviceLabel(session.revokedAt, session.email, session.lastActiveAt)}
              </p>
              {!session.revokedAt ? (
                <Button
                  onClick={() => setPending({ kind: "revoke", sessionId: session.id })}
                  type="button"
                  variant="outline"
                >
                  Revoke device
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setPending(null);
          }
        }}
        open={pending !== null}
      >
        <AlertDialogContent>
          <AlertDialogTitle>{copy?.title}</AlertDialogTitle>
          <AlertDialogDescription>{copy?.description}</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void confirmPending();
              }}
            >
              {copy?.action}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ClinicStaff;
