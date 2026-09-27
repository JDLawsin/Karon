"use client";

import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Label,
  PageHeader,
  StatusBadge
} from "@karon/design-system";
import {
  ArrowLeft,
  Check,
  FileSpreadsheet,
  LoaderCircle,
  ShieldCheck,
  Upload
} from "lucide-react";
import Link from "next/link";
import { useState, type DragEvent } from "react";

import MigrationChecklistCard from "@/features/patient-import/migration-checklist-card";
import {
  MAX_IMPORT_FILE_BYTES,
  type ImportDecision,
  type ImportMapping,
  type PatientImportRow,
  type PublicPatientImportJob
} from "@/features/patient-import/patient-import";
import { usePatientImport } from "@/features/patient-import/use-patient-import";

type Step = 1 | 2 | 3 | 4;

const emptyMapping: ImportMapping = { name: null, mobile: null, email: null };
const selectClassName =
  "min-h-(--control-min-height) w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50";

const decisionsFor = (rows: PatientImportRow[]) =>
  Object.fromEntries(rows.map((row) => [row.rowNumber, row.decision]));

const statusFor = (status: PublicPatientImportJob["status"]) => {
  if (status === "completed") {
    return { label: "Complete", tone: "success" as const };
  }

  if (status === "failed") {
    return { label: "Needs attention", tone: "danger" as const };
  }

  if (status === "committing") {
    return { label: "Importing", tone: "info" as const };
  }

  return { label: "Ready to resume", tone: "warning" as const };
};

const PatientImportWizard = () => {
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [mapping, setMapping] = useState<ImportMapping>(emptyMapping);
  const [decisions, setDecisions] = useState<Record<number, ImportDecision["decision"]>>(
    {}
  );
  const [mappingDirty, setMappingDirty] = useState(false);
  const { commit, create, job, jobs, map } = usePatientImport(selectedJobId);
  const activeJob = job.data;
  const error = create.error ?? map.error ?? commit.error ?? job.error ?? jobs.error;

  const chooseFile = (next: File | null) => {
    setFile(next);
    create.reset();
  };

  const upload = async () => {
    if (!file) {
      return;
    }

    const next = await create.mutateAsync(file);
    setSelectedJobId(next.id);
    setMapping(next.mapping);
    setDecisions(decisionsFor(next.rows));
    setMappingDirty(false);
    setStep(3);
  };

  const applyMapping = async () => {
    if (!activeJob) {
      return;
    }

    const next = await map.mutateAsync({ id: activeJob.id, mapping });
    setDecisions(decisionsFor(next.rows));
    setMappingDirty(false);
  };

  const confirm = async () => {
    if (!activeJob) {
      return;
    }

    setStep(4);
    const choices = activeJob.rows.map((row) => ({
      rowNumber: row.rowNumber,
      decision: decisions[row.rowNumber] ?? row.decision
    }));
    await commit.mutateAsync({ id: activeJob.id, decisions: choices });
  };

  const resume = (recent: PublicPatientImportJob) => {
    setSelectedJobId(recent.id);
    setMapping(recent.mapping);
    setDecisions(decisionsFor(recent.rows));
    setMappingDirty(false);
    setStep(
      recent.status === "completed" || recent.status === "committing" || recent.rows.length > 0
        ? recent.status === "preview_ready"
          ? 3
          : 4
        : 2
    );
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    chooseFile(event.dataTransfer.files[0] ?? null);
  };

  const stepLabel = `Step ${step} of 4`;

  return (
    <section className="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-5">
      <PageHeader
        description="Move patient names and mobile numbers into Karon with a review before anything is created."
        title="Import patients"
      >
        <Button asChild variant="outline">
          <Link href="/settings">
            <ArrowLeft aria-hidden />
            Settings
          </Link>
        </Button>
      </PageHeader>

      <div className="flex min-w-0 items-center gap-3" aria-label="Import progress">
        <StatusBadge tone="info">{stepLabel}</StatusBadge>
        <ol className="grid min-w-0 flex-1 grid-cols-4 gap-1" aria-hidden>
          {[1, 2, 3, 4].map((item) => (
            <li
              className={`h-1.5 rounded-sm ${item <= step ? "bg-primary" : "bg-muted"}`}
              key={item}
            />
          ))}
        </ol>
      </div>

      {error ? (
        <Alert title={error instanceof Error ? error.message : "Import failed."} variant="danger">
          The job record is kept, so a stopped confirmation can be resumed safely.
        </Alert>
      ) : null}

      {step === 1 ? (
        <>
          <MigrationChecklistCard />

          <Card>
            <CardHeader>
              <CardTitle>Choose what to import</CardTitle>
              <CardDescription>
                Start with patients. Other migration jobs remain separate so each can be checked.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <li className="rounded-md border border-primary bg-accent p-4">
                  <div className="flex items-center gap-2 font-medium">
                    <Check aria-hidden className="size-5 text-primary" />
                    Patients
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Name, mobile, and optional email
                  </p>
                </li>
                <li className="rounded-md border border-border p-4">
                  <p className="font-medium">Services and prices</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Name, price, duration, and optional code.
                  </p>
                  <Button asChild className="mt-3" variant="outline">
                    <Link href="/settings/import/services">Choose Services</Link>
                  </Button>
                </li>
                <li className="rounded-md border border-border p-4">
                  <p className="font-medium">Open balances</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Optional starting notes, not full ageing.
                  </p>
                </li>
              </ul>
              <Alert title="Online owner task" variant="info">
                Keep this page open during the import. Patient search remains available to the clinic.
              </Alert>
            </CardContent>
            <CardFooter>
              <Button className="w-full sm:w-auto" onClick={() => setStep(2)} type="button">
                Continue · Upload
              </Button>
            </CardFooter>
          </Card>

          {(jobs.data?.length ?? 0) > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Recent imports</CardTitle>
                <CardDescription>Resume a stopped job or review its finish record.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2">
                  {jobs.data?.map((recent) => {
                    const status = statusFor(recent.status);

                    return (
                      <li
                        className="flex min-w-0 flex-col gap-3 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                        key={recent.id}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{recent.fileName}</p>
                          <p className="text-sm text-muted-foreground tabular-nums">
                            {recent.importedRows} imported · {recent.failedRows} failed
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                          <Button onClick={() => resume(recent)} type="button" variant="outline">
                            Open
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}

      {step === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV or Excel</CardTitle>
            <CardDescription>
              First row: column names. Up to 2,000 patients and {MAX_IMPORT_FILE_BYTES / 1_000_000} MB.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <label
              className="flex min-h-48 cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-input bg-muted p-5 text-center transition-colors duration-(--motion-duration) hover:border-primary focus-within:border-primary focus-within:ring-2 focus-within:ring-ring"
              htmlFor="patient-import-file"
              onDragOver={(event) => event.preventDefault()}
              onDrop={onDrop}
            >
              <Upload aria-hidden className="size-8 text-primary" />
              <span className="font-medium">
                {file ? file.name : "Drop a file here or choose from this device"}
              </span>
              <span className="text-sm text-muted-foreground">.csv or .xlsx</span>
              <input
                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="sr-only"
                id="patient-import-file"
                onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
                type="file"
              />
            </label>
            <Alert title="Patient information stays in secure staging" variant="info">
              The raw upload is private and audited. Karon deletes it after server parsing;
              abandoned uploads are marked to expire within 24 hours and are removed on the next cleanup run.
            </Alert>
          </CardContent>
          <CardFooter className="flex-col-reverse sm:flex-row">
            <Button className="w-full sm:w-auto" onClick={() => setStep(1)} type="button" variant="outline">
              Back
            </Button>
            <Button
              aria-busy={create.isPending}
              className="w-full sm:w-auto"
              disabled={!file || create.isPending}
              onClick={() => void upload()}
              type="button"
            >
              {create.isPending ? <LoaderCircle aria-hidden className="animate-spin" /> : null}
              {create.isPending ? "Uploading and checking..." : "Continue · Preview"}
            </Button>
          </CardFooter>
        </Card>
      ) : null}

      {step === 3 && activeJob ? (
        <Card>
          <CardHeader>
            <CardTitle>Preview, map, and check duplicates</CardTitle>
            <CardDescription>
              Match the required fields, then choose what to do with each duplicate mobile.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {(["name", "mobile", "email"] as const).map((field) => (
                <div className="flex flex-col gap-2" key={field}>
                  <Label htmlFor={`import-map-${field}`}>
                    {field === "email" ? "Email (optional)" : `${field[0]?.toUpperCase()}${field.slice(1)}`}
                  </Label>
                  <select
                    className={selectClassName}
                    id={`import-map-${field}`}
                    onChange={(event) => {
                      setMapping((current) => ({
                        ...current,
                        [field]: event.target.value || null
                      }));
                      setMappingDirty(true);
                    }}
                    value={mapping[field] ?? ""}
                  >
                    <option value="">{field === "email" ? "Not imported" : "Choose column"}</option>
                    {activeJob.columns.map((column) => (
                      <option key={column} value={column}>
                        {column}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-160 border-collapse text-left text-sm">
                <caption className="sr-only">First 50 patient import rows</caption>
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="px-3 py-3 font-medium" scope="col">Row</th>
                    <th className="px-3 py-3 font-medium" scope="col">Name</th>
                    <th className="px-3 py-3 font-medium" scope="col">Mobile</th>
                    <th className="px-3 py-3 font-medium" scope="col">Result</th>
                    <th className="px-3 py-3 font-medium" scope="col">Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {activeJob.rows.slice(0, 50).map((row) => (
                    <tr className="border-t border-border" key={row.rowNumber}>
                      <td className="px-3 py-3 tabular-nums">{row.rowNumber}</td>
                      <td className="max-w-48 px-3 py-3 wrap-anywhere">{row.name || "—"}</td>
                      <td className="px-3 py-3 tabular-nums">{row.mobile || "—"}</td>
                      <td className="max-w-64 px-3 py-3 wrap-anywhere">
                        {row.error ? (
                          <span className="text-destructive">{row.error}</span>
                        ) : row.duplicateName ? (
                          <span>Matches {row.duplicateName}</span>
                        ) : (
                          <span className="text-success">Ready</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {row.error ? (
                          <StatusBadge tone="danger">Skip · error</StatusBadge>
                        ) : row.duplicatePatientId ? (
                          <select
                            aria-label={`Decision for row ${row.rowNumber}`}
                            className={selectClassName}
                            onChange={(event) =>
                              setDecisions((current) => ({
                                ...current,
                                [row.rowNumber]: event.target.value as ImportDecision["decision"]
                              }))
                            }
                            value={decisions[row.rowNumber] ?? row.decision}
                          >
                            <option value="skip">Skip</option>
                            <option value="merge">Merge</option>
                            <option value="create">Create anyway</option>
                          </select>
                        ) : (
                          <StatusBadge tone="success">Create</StatusBadge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {activeJob.rows.length > 50 ? (
              <p className="text-sm text-muted-foreground">
                Showing the first 50 of {activeJob.rows.length} rows. All rows will be imported.
              </p>
            ) : null}
            <p className="text-sm text-muted-foreground">
              Default for duplicate mobiles is Skip. Your choices are saved when you confirm.
            </p>
          </CardContent>
          <CardFooter className="flex-col-reverse sm:flex-row">
            <Button className="w-full sm:w-auto" onClick={() => setStep(2)} type="button" variant="outline">
              Back
            </Button>
            {mappingDirty ? (
              <Button
                aria-busy={map.isPending}
                className="w-full sm:w-auto"
                disabled={!mapping.name || !mapping.mobile || map.isPending}
                onClick={() => void applyMapping()}
                type="button"
              >
                {map.isPending ? <LoaderCircle aria-hidden className="animate-spin" /> : null}
                Preview mapped rows
              </Button>
            ) : (
              <Button
                className="w-full sm:w-auto"
                disabled={!mapping.name || !mapping.mobile}
                onClick={() => setStep(4)}
                type="button"
              >
                Continue · Confirm
              </Button>
            )}
          </CardFooter>
        </Card>
      ) : null}

      {step === 4 && activeJob ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {activeJob.status === "completed" ? "Import complete" : "Confirm patient import"}
            </CardTitle>
            <CardDescription>
              Job {activeJob.id.slice(0, 8)} · {activeJob.fileName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Rows", activeJob.totalRows],
                ["Imported", activeJob.importedRows],
                ["Errors", activeJob.failedRows],
                ["Skipped", activeJob.skippedRows]
              ].map(([label, value]) => (
                <div className="rounded-md border border-border p-3" key={label}>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-2xl font-semibold tabular-nums">{value}</p>
                </div>
              ))}
            </div>

            {activeJob.status === "committing" || commit.isPending ? (
              <Alert title={`Importing patients… ${activeJob.importedRows} / ${activeJob.totalRows}`} variant="info">
                Keep this page open. If the connection drops, the recorded job can resume safely.
              </Alert>
            ) : null}

            {activeJob.status === "completed" && activeJob.objectDeletedAt ? (
              <Alert title="Raw upload deleted from secure staging" variant="success">
                The audit keeps counts and timing, never the CSV or Excel bytes. Abandoned uploads
                have a 24-hour TTL fallback.
              </Alert>
            ) : activeJob.status === "completed" ? (
              <Alert title="Secure staging deletion is pending" variant="info">
                The import completed, and automatic cleanup will keep retrying the raw upload until
                it is deleted. Retained error rows expire with the job.
              </Alert>
            ) : (
              <Alert title="No silent partial import" variant="info">
                Valid rows commit as idempotent patient events. Invalid rows stay out and appear in
                the downloadable errors CSV.
              </Alert>
            )}

            {activeJob.status === "failed" ? (
              <Alert title={activeJob.lastError ?? "Import stopped."} variant="danger">
                Resume uses the same patient event IDs, so already committed rows are not duplicated.
              </Alert>
            ) : null}

            {activeJob.failedRows > 0 && !activeJob.dataPurgedAt ? (
              <Button asChild variant="outline">
                <a href={`/api/imports/${encodeURIComponent(activeJob.id)}?download=errors`}>
                  Download {activeJob.failedRows} error {activeJob.failedRows === 1 ? "row" : "rows"}
                </a>
              </Button>
            ) : activeJob.failedRows > 0 ? (
              <p className="text-sm text-muted-foreground">
                Error-row details reached their retention limit and were purged.
              </p>
            ) : null}

            <div className="flex items-start gap-3 rounded-md border border-border p-3 text-sm">
              <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-info" />
              <p className="text-muted-foreground">
                SPI retention: parsed raw uploads are purged immediately. If an upload is abandoned
                before parsing, its staging lifetime is at most 24 hours once cleanup runs.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex-col-reverse sm:flex-row">
            {activeJob.status === "completed" ? (
              <>
                <Button asChild className="w-full sm:w-auto">
                  <Link href="/patients">Finish · Go to Patients</Link>
                </Button>
                <Button className="w-full sm:w-auto" onClick={() => setStep(1)} type="button" variant="outline">
                  Import another file
                </Button>
              </>
            ) : (
              <>
                <Button
                  className="w-full sm:w-auto"
                  disabled={commit.isPending || activeJob.status === "committing"}
                  onClick={() => void confirm()}
                  type="button"
                >
                  {commit.isPending ? <LoaderCircle aria-hidden className="animate-spin" /> : <FileSpreadsheet aria-hidden />}
                  {activeJob.status === "failed" ? "Resume import" : "Confirm import"}
                </Button>
                {activeJob.status === "preview_ready" ? (
                  <Button className="w-full sm:w-auto" onClick={() => setStep(3)} type="button" variant="outline">
                    Back to preview
                  </Button>
                ) : null}
              </>
            )}
          </CardFooter>
        </Card>
      ) : null}
    </section>
  );
};

export default PatientImportWizard;
