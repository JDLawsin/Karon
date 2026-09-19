"use client";

import { Button, Label, StatusBadge } from "@karon/design-system";
import {
  OdontogramChartSurface,
  OdontogramProvider,
  type OdontogramThemeConfig
} from "react-advanced-odontogram";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type SyntheticEvent
} from "react";

import type { ChartHistoryEntry } from "@/features/odontogram/chart-history";
import {
  chartFindingSchema,
  type AdultFdiToothCode,
  type ChartFinding
} from "@/lib/sync/event-schema";

const FINDINGS = [
  { kind: "condition", code: "caries", label: "Caries" },
  { kind: "condition", code: "missing", label: "Missing tooth" },
  { kind: "condition", code: "impacted", label: "Impacted" },
  { kind: "procedure", code: "filling", label: "Filling" },
  { kind: "procedure", code: "crown", label: "Crown" },
  { kind: "procedure", code: "extraction", label: "Extraction" },
  { kind: "procedure", code: "root_canal", label: "Root canal" },
  { kind: "procedure", code: "implant", label: "Implant" }
] as const satisfies readonly (ChartFinding & { label: string })[];

const ODONTOGRAM_THEME = {
  colors: {
    background: "var(--background)",
    panel: "var(--karon-odontogram-card)",
    card: "var(--karon-odontogram-card)",
    text: "var(--foreground)",
    muted: "var(--muted-foreground)",
    line: "var(--border)",
    accent: "var(--primary)",
    accent2: "var(--info)"
  }
} as const satisfies OdontogramThemeConfig;

const isAdultFdiToothCode = (value: string): value is AdultFdiToothCode =>
  /^[1-4][1-8]$/.test(value);

const selectedToothFromChart = (
  chart: HTMLElement,
  preferredCode: AdultFdiToothCode | null
): AdultFdiToothCode | null => {
  const preferred = preferredCode
    ? chart.querySelector<HTMLElement>(
        `[role="option"][data-tooth="${preferredCode}"][aria-selected="true"]`
      )
    : null;
  const selected =
    preferred ??
    chart.querySelector<HTMLElement>('[role="option"][aria-selected="true"]');
  const code = selected?.dataset.tooth;

  return code && isAdultFdiToothCode(code) ? code : null;
};

type Props = {
  entries: ChartHistoryEntry[];
  visitLabels: Readonly<Record<string, string>>;
  canChart: boolean;
  saving: boolean;
  onAppend: (input: {
    toothCode: AdultFdiToothCode;
    finding: ChartFinding;
    note: string;
  }) => Promise<void>;
};

const findingLabel = (finding: ChartFinding) =>
  FINDINGS.find(
    (option) => option.kind === finding.kind && option.code === finding.code
  )?.label ?? finding.code;

const Odontogram = ({ entries, visitLabels, canChart, saving, onAppend }: Props) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [toothCode, setToothCode] = useState<AdultFdiToothCode | null>(null);
  const [findingValue, setFindingValue] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const chart = chartRef.current;

    if (!chart) return;

    const observer = new MutationObserver(() => {
      setToothCode((current) => selectedToothFromChart(chart, current));
    });
    observer.observe(chart, {
      attributeFilter: ["aria-selected"],
      attributes: true,
      subtree: true
    });

    return () => observer.disconnect();
  }, []);

  const syncSelectedTooth = (event: SyntheticEvent<HTMLElement>) => {
    const target = event.target;

    if (!(target instanceof Element)) return;

    const rawCode = target.closest<HTMLElement>("[data-tooth]")?.dataset.tooth;

    if (!rawCode || !isAdultFdiToothCode(rawCode)) return;

    setToothCode(selectedToothFromChart(event.currentTarget, rawCode));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const finding = FINDINGS.find(
      (option) => `${option.kind}:${option.code}` === findingValue
    );

    if (!toothCode || !finding || !note.trim()) {
      setError("Choose a tooth and finding, then add a note.");
      return;
    }

    try {
      setError(null);
      await onAppend({
        toothCode,
        finding: chartFindingSchema.parse({ kind: finding.kind, code: finding.code }),
        note: note.trim()
      });
      setFindingValue("");
      setNote("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save chart entry.");
    }
  };

  return (
    <section
      aria-labelledby="odontogram-heading"
      className="flex min-w-0 flex-col gap-5 rounded-lg border border-border bg-card p-4 sm:p-5"
    >
      <header className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold" id="odontogram-heading">
            Odontogram
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Permanent teeth · FDI numbering
          </p>
        </div>
        <StatusBadge tone={canChart ? "primary" : "neutral"}>
          {canChart ? "In chair" : "View only"}
        </StatusBadge>
      </header>

      <div
        aria-label="Adult teeth"
        className="karon-odontogram min-w-0 overflow-x-auto rounded-lg"
        onClick={syncSelectedTooth}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") syncSelectedTooth(event);
        }}
        ref={chartRef}
      >
        <OdontogramProvider
          language="en"
          numberingSystem="FDI"
          readOnly={!canChart || saving}
          themeConfig={ODONTOGRAM_THEME}
        >
          <OdontogramChartSurface />
        </OdontogramProvider>
      </div>

      {canChart ? (
        <form className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2" onSubmit={submit}>
          <div className="flex min-w-0 flex-col gap-2">
            <Label htmlFor="chart-finding">Condition or procedure</Label>
            <select
              className="min-h-(--control-min-height) w-full min-w-0 rounded-md border border-input bg-background px-3 text-base text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
              disabled={saving}
              id="chart-finding"
              onChange={(event) => setFindingValue(event.target.value)}
              value={findingValue}
            >
              <option value="">Choose one</option>
              <optgroup label="Conditions">
                {FINDINGS.filter((finding) => finding.kind === "condition").map(
                  (finding) => (
                    <option
                      key={finding.code}
                      value={`${finding.kind}:${finding.code}`}
                    >
                      {finding.label}
                    </option>
                  )
                )}
              </optgroup>
              <optgroup label="Procedures">
                {FINDINGS.filter((finding) => finding.kind === "procedure").map(
                  (finding) => (
                    <option
                      key={finding.code}
                      value={`${finding.kind}:${finding.code}`}
                    >
                      {finding.label}
                    </option>
                  )
                )}
              </optgroup>
            </select>
          </div>

          <div className="flex min-w-0 flex-col gap-2 lg:row-span-2">
            <Label htmlFor="chart-note">Visit note</Label>
            <textarea
              className="min-h-28 w-full min-w-0 resize-y rounded-md border border-input bg-background px-3 py-3 text-base text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
              disabled={saving}
              id="chart-note"
              maxLength={500}
              onChange={(event) => setNote(event.target.value)}
              placeholder="What was observed or completed?"
              value={note}
            />
            <p className="text-xs tabular-nums text-muted-foreground">
              {note.length}/500
            </p>
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button disabled={saving} type="submit">
              {saving ? "Saving..." : "Add chart entry"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Charting needs a connection until protected offline sync ships.
            </p>
          </div>
        </form>
      ) : (
        <p className="rounded-md bg-muted px-3 py-3 text-sm text-muted-foreground">
          Move the visit to In chair to add a chart entry.
        </p>
      )}

      <section aria-labelledby="chart-history-heading" className="flex min-w-0 flex-col gap-3">
        <h3 className="font-semibold" id="chart-history-heading">
          Chart history
        </h3>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No chart entries yet.</p>
        ) : (
          <ol className="flex min-w-0 flex-col divide-y divide-border">
            {entries.map((entry) => (
              <li className="flex min-w-0 flex-col gap-1.5 py-3 first:pt-0 last:pb-0" key={entry.id}>
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="font-medium tabular-nums">Tooth {entry.toothCode}</span>
                  <StatusBadge tone={entry.finding.kind === "condition" ? "warning" : "info"}>
                    {findingLabel(entry.finding)}
                  </StatusBadge>
                </div>
                <p className="wrap-anywhere text-sm">{entry.note}</p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {visitLabels[entry.visitId] ?? "Visit"}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </section>
  );
};

export default Odontogram;
