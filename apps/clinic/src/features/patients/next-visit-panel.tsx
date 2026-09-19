"use client";

import {
  Alert,
  Button,
  Input,
  Label,
  showErrorToast,
  showSuccessToast
} from "@karon/design-system";
import { useState, type FormEvent } from "react";

import { buildReminderText } from "@/features/patients/next-visit";
import {
  useNextVisit,
  type ScheduleDraft
} from "@/features/patients/use-next-visit";

type Props = {
  patientId: string;
};

const clinicDate = (timeZone: string, daysFromNow = 0) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromNow);

  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
};

const selectClassName =
  "h-(--control-min-height) min-h-(--control-min-height) w-full min-w-0 rounded-md border-0 bg-(--input-fill) px-3 text-base text-foreground outline-none focus-visible:border-2 focus-visible:border-primary focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const NextVisitPanel = ({ patientId }: Props) => {
  const { clinic, services, loading, loadError, schedule } =
    useNextVisit(patientId);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [serviceName, setServiceName] = useState("");
  const [lastDraft, setLastDraft] = useState<ScheduleDraft | null>(null);
  const [reminder, setReminder] = useState("");
  const resolvedDate = date || (clinic ? clinicDate(clinic.timezone, 1) : "");
  const resolvedService = serviceName || services[0]?.name || "";
  const conflict =
    schedule.data?.status === "conflict" &&
    lastDraft?.date === resolvedDate &&
    lastDraft.time === time &&
    lastDraft.serviceName === resolvedService;

  const save = async (draft: ScheduleDraft) => {
    setLastDraft(draft);
    setReminder("");

    const result = await schedule.mutateAsync(draft);

    if (result.status === "saved" && clinic) {
      setReminder(
        buildReminderText({
          clinicName: clinic.name,
          startsAt: result.startsAt,
          timeZone: clinic.timezone
        })
      );
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void save({
      date: resolvedDate,
      time,
      serviceName: resolvedService
    }).catch(() => undefined);
  };

  const copyReminder = async () => {
    try {
      await navigator.clipboard.writeText(reminder);
      showSuccessToast("Reminder copied.");
    } catch {
      showErrorToast("Could not copy the reminder.");
    }
  };

  return (
    <section
      aria-labelledby="next-visit-heading"
      className="flex min-w-0 max-w-2xl flex-col gap-4 rounded-lg bg-card p-4 sm:p-6"
    >
      <div>
        <h2 className="text-lg font-semibold" id="next-visit-heading">
          Next visit
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Schedule before the patient leaves.
        </p>
      </div>

      <Alert title="Internet connection required" variant="info">
        Next-visit scheduling is online only until protected offline sync ships.
      </Alert>

      <form className="flex min-w-0 flex-col gap-4" onSubmit={handleSubmit}>
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-2">
            <Label htmlFor="next-visit-date">Date</Label>
            <Input
              disabled={loading}
              id="next-visit-date"
              min={clinic ? clinicDate(clinic.timezone) : undefined}
              onChange={(event) => setDate(event.target.value)}
              required
              type="date"
              value={resolvedDate}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <Label htmlFor="next-visit-time">Time (clinic timezone)</Label>
            <Input
              disabled={loading}
              id="next-visit-time"
              onChange={(event) => setTime(event.target.value)}
              required
              type="time"
              value={time}
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="next-visit-service">Service</Label>
          {services.length > 0 ? (
            <select
              className={selectClassName}
              disabled={loading}
              id="next-visit-service"
              onChange={(event) => setServiceName(event.target.value)}
              required
              value={resolvedService}
            >
              {services.map((service) => (
                <option key={service.id} value={service.name}>
                  {service.name}
                </option>
              ))}
            </select>
          ) : (
            <Input
              disabled={loading}
              id="next-visit-service"
              maxLength={80}
              onChange={(event) => setServiceName(event.target.value)}
              placeholder="Follow-up check"
              required
              value={serviceName}
            />
          )}
        </div>

        {loadError ? <Alert title={loadError} variant="danger" /> : null}
        {schedule.error instanceof Error ? (
          <Alert title={schedule.error.message} variant="danger" />
        ) : null}
        {conflict ? (
          <div
            className="flex min-w-0 flex-col gap-3 rounded-md bg-warning-subtle p-4 text-warning-foreground"
            role="status"
          >
            <p className="font-medium">This time already has an appointment.</p>
            <p className="text-sm">
              Choose another time or save it as an overbooked slot.
            </p>
            <Button
              className="self-start"
              disabled={schedule.isPending || !lastDraft}
              onClick={() => {
                if (lastDraft) {
                  void save({ ...lastDraft, allowOverbook: true }).catch(
                    () => undefined
                  );
                }
              }}
              type="button"
              variant="outline"
            >
              Save as overbooked
            </Button>
          </div>
        ) : null}

        <Button
          className="w-full sm:w-auto sm:self-start"
          disabled={loading || schedule.isPending || !resolvedService}
          type="submit"
        >
          {schedule.isPending ? "Saving..." : "Save next visit"}
        </Button>
      </form>

      {reminder ? (
        <div className="flex min-w-0 flex-col gap-3 rounded-lg bg-surface p-4">
          <div>
            <h3 className="font-medium">Messenger-safe reminder</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Clinic name and appointment time only.
            </p>
          </div>
          <p className="wrap-anywhere rounded-md bg-background p-3 text-sm tabular-nums">
            {reminder}
          </p>
          <Button onClick={copyReminder} type="button" variant="outline">
            Copy reminder
          </Button>
        </div>
      ) : null}
    </section>
  );
};

export default NextVisitPanel;
