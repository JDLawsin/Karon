"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  Button,
  Card,
  Input,
  Label,
  showErrorToast,
  showSuccessToast,
  Skeleton
} from "@karon/design-system";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { StaffAvatar } from "@/features/auth/clinic-staff-avatar";
import {
  resolveStaffAvatarSeed,
  resolveStaffAvatarStyle
} from "@/features/auth/staff-avatar";
import { useStaffAvatarPreference } from "@/features/auth/staff-avatar-preference";
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
import { useClinicSession } from "@/lib/auth/clinic-session";
import { leaveClinicSession } from "@/lib/auth/leave-clinic-session";
import FieldError from "@/lib/forms/field-error";
import { parseJson } from "@/lib/forms/parse-json";
import { useClinicForm } from "@/lib/forms/use-clinic-form";
import { createBrowserSupabase } from "@/lib/supabase/browser";

type ClinicStaffProps = {
  section: "staff" | "devices";
};

type PendingAction =
  | { kind: "remove"; userId: string }
  | { kind: "revoke"; sessionId: string }
  | { kind: "revoke-others" };

const pendingCopy = (pending: PendingAction, sessions: StaffSession[]) => {
  if (pending.kind === "remove") {
    return {
      title: "Remove this assistant?",
      description: "They will lose access to this clinic.",
      action: "Remove"
    };
  }

  if (pending.kind === "revoke") {
    const isCurrent = sessions.some(
      (session) => session.id === pending.sessionId && session.isCurrent
    );

    if (isCurrent) {
      return {
        title: "Revoke this device?",
        description:
          "This is the browser you are using now. You will be logged out of Karon.",
        action: "Revoke and log out"
      };
    }

    return {
      title: "Revoke this device?",
      description: "That session will have to log in again.",
      action: "Revoke device"
    };
  }

  return {
    title: "Revoke all other devices?",
    description: "You will stay signed in on this browser.",
    action: "Revoke other devices"
  };
};

const ClinicStaff = ({ section }: ClinicStaffProps) => {
  const { userId } = useClinicSession();
  const { resolvedSeed, resolvedStyle, ready } = useStaffAvatarPreference();
  const router = useRouter();
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [sessions, setSessions] = useState<StaffSession[]>([]);
  const [loading, setLoading] = useState(true);
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
    try {
      const response = await fetch("/api/members");
      const json: unknown = await response.json().catch(() => null);
      const directory = staffDirectorySchema.safeParse(json);

      if (!response.ok || !directory.success) {
        const failed = apiErrorSchema.safeParse(json);
        showErrorToast(failed.success ? failed.data.error : "Could not load staff.");
        return;
      }

      setMembers(directory.data.members);
      setSessions(directory.data.sessions);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(id);
  }, []);

  const onInvite = handleSubmit(async ({ email }) => {
    const response = await fetch("/api/members", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email })
    });
    const json: unknown = await response.json().catch(() => null);
    const ok = inviteOkSchema.safeParse(json);

    if (!response.ok || !ok.success) {
      const failed = apiErrorSchema.safeParse(json);
      showErrorToast(
        failed.success ? failed.data.error : "Could not invite that assistant."
      );
      return;
    }

    reset({ email: "" });
    showSuccessToast("Invite sent.");
    await load();
  });

  const removeMember = async (userId: string) => {
    const body = memberUserSchema.parse({ userId });
    const response = await fetch("/api/members", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const failed = await parseJson(response, apiErrorSchema);
      showErrorToast(
        failed.success ? failed.data.error : "Could not remove that assistant."
      );
      return;
    }

    await load();
  };

  const revokeSession = async (sessionId: string, reload = true) => {
    const body = sessionBodySchema.parse({ sessionId });
    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const failed = await parseJson(response, apiErrorSchema);
      showErrorToast(
        failed.success ? failed.data.error : "Could not revoke that device."
      );
      return false;
    }

    if (reload) {
      await load();
    }

    return true;
  };

  const revokeOthers = async () => {
    const body = sessionBodySchema.parse({ others: true });
    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const failed = await parseJson(response, apiErrorSchema);
      showErrorToast(
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
      const isCurrent = sessions.some(
        (session) => session.id === action.sessionId && session.isCurrent
      );

      if (isCurrent) {
        const result = await leaveClinicSession(createBrowserSupabase());

        if (result.status === "blocked") {
          showErrorToast(
            "Unsynced clinic work is protected. Use Sign out to export or discard it."
          );
          return;
        }

        router.push("/login");
        router.refresh();
        return;
      }

      await revokeSession(action.sessionId);
      return;
    }

    await revokeOthers();
  };

  const copy = pending ? pendingCopy(pending, sessions) : null;

  return (
    <div className="flex min-w-0 w-full flex-col gap-3">
      {section === "staff" ? (
        <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start">
          <Card className="min-w-0 gap-3">
            <form className="flex flex-col gap-3" onSubmit={onInvite}>
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
              <Button disabled={isSubmitting} type="submit">
                Add assistant
              </Button>
            </form>
          </Card>

          {loading ? (
            <Skeleton
              aria-busy
              aria-label="Loading staff"
              className="min-h-52 w-full min-w-0 rounded-lg"
            />
          ) : (
            <Card className="min-w-0 gap-3">
              <h2 className="text-lg font-semibold">Staff</h2>
              <ul className="flex flex-col gap-2">
                {members.map((member) => (
                  <li
                    className="flex min-w-0 flex-col gap-2 rounded-lg bg-background px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                    key={member.userId}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <StaffAvatar
                        role={member.role}
                        seed={
                          member.userId === userId && ready
                            ? resolvedSeed
                            : resolveStaffAvatarSeed(
                                member.userId,
                                member.avatarSeed
                              )
                        }
                        style={
                          member.userId === userId && ready
                            ? resolvedStyle
                            : resolveStaffAvatarStyle(member.avatarStyle)
                        }
                        userId={member.userId}
                      />
                      <p className="min-w-0 break-all text-sm">
                        {staffMemberLabel(member.role, member.email)}
                      </p>
                    </div>
                    {member.role === "assistant" ? (
                      <Button
                        onClick={() =>
                          setPending({ kind: "remove", userId: member.userId })
                        }
                        type="button"
                        variant="outline"
                      >
                        Remove
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      ) : loading ? (
        <Skeleton
          aria-busy
          aria-label="Loading devices"
          className="min-h-52 w-full min-w-0 rounded-lg"
        />
      ) : (
        <Card className="min-w-0 gap-3">
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
                className="flex min-w-0 flex-col gap-2 rounded-lg bg-background px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                key={session.id}
              >
                <p className="min-w-0 break-all text-sm">
                  {deviceLabel(
                    session.revokedAt,
                    session.email,
                    session.lastActiveAt,
                    session.isCurrent
                  )}
                </p>
                <Button
                  onClick={() => setPending({ kind: "revoke", sessionId: session.id })}
                  type="button"
                  variant="outline"
                >
                  Revoke device
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

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
