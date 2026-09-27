"use client";

import {
  Alert,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  StatusBadge
} from "@karon/design-system";
import { Check, ShieldCheck } from "lucide-react";

import { MIGRATION_CHECKLIST_ITEMS } from "@/features/patient-import/migration-checklist";
import { useMigrationChecklist } from "@/features/patient-import/use-migration-checklist";

const MigrationChecklistCard = () => {
  const { query, save, toggle } = useMigrationChecklist();
  const completedItems = query.data?.completedItems ?? [];
  const complete = completedItems.length === MIGRATION_CHECKLIST_ITEMS.length;
  const error = query.error ?? save.error;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Saturday migration checklist</CardTitle>
            <CardDescription>
              Saved for this clinic so the owner can leave and resume the cutover.
            </CardDescription>
          </div>
          <StatusBadge tone={complete ? "success" : "info"}>
            {`${completedItems.length} of ${MIGRATION_CHECKLIST_ITEMS.length} complete`}
          </StatusBadge>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <Alert title={error instanceof Error ? error.message : "Checklist unavailable."} variant="danger">
            No checklist change was accepted. Try again when the connection is stable.
          </Alert>
        ) : null}

        <fieldset disabled={query.isPending || save.isPending}>
          <legend className="sr-only">Weekend cutover tasks</legend>
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            {MIGRATION_CHECKLIST_ITEMS.map((item) => {
              const checked = completedItems.includes(item.id);

              return (
                <label
                  className="flex min-h-14 cursor-pointer items-start gap-3 rounded-md bg-muted p-3 has-checked:bg-success-subtle"
                  key={item.id}
                >
                  <input
                    checked={checked}
                    className="mt-0.5 size-5 shrink-0 accent-primary"
                    onChange={() => toggle(item.id)}
                    type="checkbox"
                  />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 font-medium">
                      {checked ? <Check aria-hidden className="size-4 shrink-0 text-success" /> : null}
                      {item.title}
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="flex items-start gap-3 rounded-md bg-muted p-3 text-sm">
          <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-info" />
          <p className="text-muted-foreground">
            Owner access is enforced on the server. Uploads use private staging, are audited without file contents, and are deleted after parsing or by the 24-hour cleanup retry. Re-import only after reviewing the earlier job and its duplicate decisions.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default MigrationChecklistCard;
