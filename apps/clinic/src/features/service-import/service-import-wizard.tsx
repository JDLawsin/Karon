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
import { ArrowLeft, FileSpreadsheet, LoaderCircle, ShieldCheck, Upload } from "lucide-react";
import Link from "next/link";
import { useState, type DragEvent } from "react";

import { MAX_IMPORT_FILE_BYTES } from "@/features/patient-import/patient-import";
import { formatServicePrice } from "@/features/services/service-money";
import {
  type PublicServiceImportJob,
  type ServiceImportMapping
} from "@/features/service-import/service-import";
import { useServiceImport } from "@/features/service-import/use-service-import";

type Step = 1 | 2 | 3 | 4;
const emptyMapping: ServiceImportMapping = {
  name: null,
  price: null,
  duration: null,
  code: null,
  currency: null
};
const selectClassName =
  "min-h-(--control-min-height) w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50";

const statusFor = (status: PublicServiceImportJob["status"]) => {
  if (status === "completed") return { label: "Complete", tone: "success" as const };
  if (status === "failed") return { label: "Needs attention", tone: "danger" as const };
  if (status === "committing") return { label: "Importing", tone: "info" as const };
  return { label: "Ready to resume", tone: "warning" as const };
};

const ServiceImportWizard = () => {
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [mapping, setMapping] = useState<ServiceImportMapping>(emptyMapping);
  const [mappingDirty, setMappingDirty] = useState(false);
  const [removeUnmapped, setRemoveUnmapped] = useState(false);
  const { commit, create, job, jobs, map } = useServiceImport(selectedJobId);
  const activeJob = job.data;
  const error = create.error ?? map.error ?? commit.error ?? job.error ?? jobs.error;
  const unmappedCount = activeJob
    ? activeJob.existingServiceIds.filter(
        (id) => !activeJob.rows.some((row) => row.existingServiceId === id)
      ).length
    : 0;

  const upload = async () => {
    if (!file) return;
    const next = await create.mutateAsync(file);
    setRemoveUnmapped(false);
    setSelectedJobId(next.id);
    setMapping(next.mapping);
    setMappingDirty(false);
    setStep(3);
  };
  const applyMapping = async () => {
    if (!activeJob) return;
    await map.mutateAsync({ id: activeJob.id, mapping });
    setMappingDirty(false);
  };
  const confirm = async () => {
    if (!activeJob) return;
    setStep(4);
    await commit.mutateAsync({ id: activeJob.id, removeUnmapped });
  };
  const resume = (recent: PublicServiceImportJob) => {
    setSelectedJobId(recent.id);
    setMapping(recent.mapping);
    setRemoveUnmapped(false);
    setMappingDirty(false);
    setStep(
      recent.status === "failed" && recent.rows.length === 0
        ? 2
        : recent.status === "preview_ready"
          ? 3
          : 4
    );
  };
  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setFile(event.dataTransfer.files[0] ?? null);
  };

  return (
    <section className="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-5">
      <PageHeader
        description="Align service names, prices, and durations with the clinic catalog after a review."
        title="Import services"
      >
        <Button asChild variant="outline">
          <Link href="/settings"><ArrowLeft aria-hidden />Settings</Link>
        </Button>
      </PageHeader>

      <div className="flex min-w-0 items-center gap-3" aria-label="Import progress">
        <StatusBadge tone="info">{`Step ${step} of 4`}</StatusBadge>
        <ol className="grid min-w-0 flex-1 grid-cols-4 gap-1" aria-hidden>
          {[1, 2, 3, 4].map((item) => (
            <li className={`h-1.5 rounded-sm ${item <= step ? "bg-primary" : "bg-muted"}`} key={item} />
          ))}
        </ol>
      </div>

      {error ? (
        <Alert title={error instanceof Error ? error.message : "Import failed."} variant="danger">
          The job record remains available, so confirmation can be resumed safely.
        </Alert>
      ) : null}

      {step === 1 ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Choose what to import</CardTitle>
              <CardDescription>Each migration job stays separate so its changes can be checked.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Button asChild className="min-h-24 justify-start whitespace-normal p-4 text-left" variant="outline">
                  <Link href="/settings/import">Patients · name, mobile, optional email</Link>
                </Button>
                <Button className="min-h-24 justify-start whitespace-normal p-4 text-left" onClick={() => setStep(2)} type="button">
                  Services · name, price, duration, optional code
                </Button>
              </div>
              <Alert title="Online owner task" variant="info">
                The existing catalog stays available while the file is reviewed.
              </Alert>
            </CardContent>
          </Card>
          {(jobs.data?.length ?? 0) > 0 ? (
            <Card>
              <CardHeader><CardTitle>Recent service imports</CardTitle></CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2">
                  {jobs.data?.map((recent) => {
                    const status = statusFor(recent.status);
                    return (
                      <li className="flex min-w-0 flex-col gap-3 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between" key={recent.id}>
                        <div className="min-w-0"><p className="truncate font-medium">{recent.fileName}</p><p className="text-sm text-muted-foreground tabular-nums">{recent.importedRows} imported · {recent.failedRows} failed</p></div>
                        <div className="flex items-center gap-2"><StatusBadge tone={status.tone}>{status.label}</StatusBadge><Button onClick={() => resume(recent)} type="button" variant="outline">Open</Button></div>
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
          <CardHeader><CardTitle>Upload CSV or Excel</CardTitle><CardDescription>First row: column names. Up to 2,000 services and {MAX_IMPORT_FILE_BYTES / 1_000_000} MB.</CardDescription></CardHeader>
          <CardContent>
            <label className="flex min-h-48 cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-input bg-muted p-5 text-center focus-within:ring-2 focus-within:ring-ring" htmlFor="service-import-file" onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
              <Upload aria-hidden className="size-8 text-primary" />
              <span className="font-medium">{file ? file.name : "Drop a file here or choose from this device"}</span>
              <span className="text-sm text-muted-foreground">.csv or .xlsx</span>
              <input accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" id="service-import-file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} type="file" />
            </label>
            <Alert title="Private, short-lived staging" variant="info">Karon deletes the raw upload after parsing. Abandoned uploads expire within 24 hours and cleanup retries deletion.</Alert>
          </CardContent>
          <CardFooter className="flex-col-reverse sm:flex-row">
            <Button className="w-full sm:w-auto" onClick={() => setStep(1)} type="button" variant="outline">Back</Button>
            <Button aria-busy={create.isPending} className="w-full sm:w-auto" disabled={!file || create.isPending} onClick={() => void upload()} type="button">{create.isPending ? <LoaderCircle aria-hidden className="animate-spin" /> : null}{create.isPending ? "Uploading and checking..." : "Continue · Preview"}</Button>
          </CardFooter>
        </Card>
      ) : null}

      {step === 3 && activeJob ? (
        <Card>
          <CardHeader><CardTitle>Preview and map services</CardTitle><CardDescription>Required: name, price, and duration. Currency, when present, must match the clinic.</CardDescription></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {(["name", "price", "duration", "code", "currency"] as const).map((field) => (
                <div className="flex flex-col gap-2" key={field}>
                  <Label htmlFor={`service-map-${field}`}>{field === "code" || field === "currency" ? `${field[0]!.toUpperCase()}${field.slice(1)} (optional)` : `${field[0]!.toUpperCase()}${field.slice(1)}`}</Label>
                  <select className={selectClassName} id={`service-map-${field}`} onChange={(event) => { setMapping((current) => ({ ...current, [field]: event.target.value || null })); setMappingDirty(true); }} value={mapping[field] ?? ""}>
                    <option value="">{field === "code" || field === "currency" ? "Not imported" : "Choose column"}</option>
                    {activeJob.columns.map((column) => <option key={column} value={column}>{column}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-180 border-collapse text-left text-sm">
                <caption className="sr-only">First 50 service import rows</caption>
                <thead className="bg-muted text-muted-foreground"><tr><th className="px-3 py-3" scope="col">Row</th><th className="px-3 py-3" scope="col">Service</th><th className="px-3 py-3" scope="col">Price</th><th className="px-3 py-3" scope="col">Duration</th><th className="px-3 py-3" scope="col">Result</th></tr></thead>
                <tbody>{activeJob.rows.slice(0, 50).map((row) => <tr className="border-t border-border" key={row.rowNumber}><td className="px-3 py-3 tabular-nums">{row.rowNumber}</td><td className="max-w-56 px-3 py-3 wrap-anywhere">{row.name || "—"}{row.code ? <span className="block text-xs text-muted-foreground">{row.code}</span> : null}</td><td className="px-3 py-3 tabular-nums">{row.priceMinor === undefined || !row.currencyCode ? "—" : formatServicePrice(row.priceMinor, row.currencyCode, "en")}</td><td className="px-3 py-3 tabular-nums">{row.durationMinutes ?? "—"}</td><td className="max-w-64 px-3 py-3 wrap-anywhere">{row.error ? <span className="text-destructive">{row.error}</span> : <StatusBadge tone={row.action === "update" ? "info" : "success"}>{row.action === "update" ? "Update" : "Create"}</StatusBadge>}</td></tr>)}</tbody>
              </table>
            </div>
            <Alert title={`${unmappedCount} existing ${unmappedCount === 1 ? "service" : "services"} not mapped`} variant="info">They are preserved by default. Removing them requires a separate confirmation on the next step.</Alert>
          </CardContent>
          <CardFooter className="flex-col-reverse sm:flex-row">
            <Button className="w-full sm:w-auto" onClick={() => setStep(2)} type="button" variant="outline">Back</Button>
            {mappingDirty ? <Button className="w-full sm:w-auto" disabled={!mapping.name || !mapping.price || !mapping.duration || map.isPending} onClick={() => void applyMapping()} type="button">Preview mapped rows</Button> : <Button className="w-full sm:w-auto" disabled={!mapping.name || !mapping.price || !mapping.duration} onClick={() => setStep(4)} type="button">Continue · Confirm</Button>}
          </CardFooter>
        </Card>
      ) : null}

      {step === 4 && activeJob ? (
        <Card>
          <CardHeader><CardTitle>{activeJob.status === "completed" ? "Service import complete" : "Confirm service import"}</CardTitle><CardDescription>Job {activeJob.id.slice(0, 8)} · {activeJob.fileName}</CardDescription></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Rows", activeJob.totalRows], ["Imported", activeJob.importedRows], ["Errors", activeJob.failedRows], ["Removed", activeJob.removedRows]].map(([label, value]) => <div className="rounded-md border border-border p-3" key={label}><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-semibold tabular-nums">{value}</p></div>)}</div>
            {activeJob.status === "preview_ready" && unmappedCount > 0 ? <label className="flex min-h-12 items-start gap-3 rounded-md border border-destructive/40 p-3"><input checked={removeUnmapped} className="mt-1 size-5" onChange={(event) => setRemoveUnmapped(event.target.checked)} type="checkbox" /><span><span className="block font-medium">Remove {unmappedCount} unmapped existing {unmappedCount === 1 ? "service" : "services"}</span><span className="block text-sm text-muted-foreground">Leave unchecked to keep every existing service that is absent from this file.</span></span></label> : null}
            {activeJob.status === "committing" || commit.isPending ? <Alert title={`Importing services… ${activeJob.importedRows} / ${activeJob.totalRows}`} variant="info">Keep this page open. The job can resume safely after a connection drop.</Alert> : null}
            {activeJob.status === "completed" ? <Alert title={activeJob.objectDeletedAt ? "Raw upload deleted from secure staging" : "Secure staging deletion is pending"} variant={activeJob.objectDeletedAt ? "success" : "info"}>Audit keeps counts and timing, not file contents. Cleanup retries any pending deletion.</Alert> : <Alert title="No silent catalog wipe" variant="info">Valid rows create or update services. Existing services remain unless the removal checkbox above is explicitly selected.</Alert>}
            {activeJob.failedRows > 0 && !activeJob.dataPurgedAt ? <Button asChild variant="outline"><a href={`/api/service-imports/${encodeURIComponent(activeJob.id)}?download=errors`}>Download {activeJob.failedRows} error {activeJob.failedRows === 1 ? "row" : "rows"}</a></Button> : null}
            <div className="flex items-start gap-3 rounded-md border border-border p-3 text-sm"><ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-info" /><p className="text-muted-foreground">Prices are stored only in the clinic currency. Karon never converts a row from another currency.</p></div>
          </CardContent>
          <CardFooter className="flex-col-reverse sm:flex-row">
            {activeJob.status === "completed" ? <><Button asChild className="w-full sm:w-auto"><Link href="/services">Finish · Go to Services</Link></Button><Button className="w-full sm:w-auto" onClick={() => setStep(1)} type="button" variant="outline">Import another file</Button></> : <><Button className="w-full sm:w-auto" disabled={commit.isPending || activeJob.status === "committing"} onClick={() => void confirm()} type="button">{commit.isPending ? <LoaderCircle aria-hidden className="animate-spin" /> : <FileSpreadsheet aria-hidden />}{activeJob.status === "failed" ? "Resume import" : "Confirm import"}</Button>{activeJob.status === "preview_ready" ? <Button className="w-full sm:w-auto" onClick={() => setStep(3)} type="button" variant="outline">Back to preview</Button> : null}</>}
          </CardFooter>
        </Card>
      ) : null}
    </section>
  );
};

export default ServiceImportWizard;
