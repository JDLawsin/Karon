"use client";

import { Button, Label, cn } from "@karon/design-system";
import { ImagePlus } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";

import FieldError from "@/lib/forms/field-error";
import {
  DEFAULT_IMAGE_OPTIONS,
  IMAGE_ACCEPT,
  prepareImageFile,
  type PrepareImageOptions
} from "@/lib/images/prepare-image";

type Props = {
  id: string;
  label: string;
  optional?: boolean;
  hint?: string;
  previewAlt: string;
  emptyLabel: string;
  chooseLabel?: string;
  removeLabel?: string;
  file: File | null;
  remoteUrl: string | null;
  error: string | null;
  onFileChange: (file: File | null, error: string | null) => void;
  options?: PrepareImageOptions;
};

const isFileDrag = (event: DragEvent) =>
  Array.from(event.dataTransfer.types).includes("Files");

const ImageUploadField = ({
  id,
  label,
  optional = false,
  hint,
  previewAlt,
  emptyLabel,
  chooseLabel = "Choose image",
  removeLabel = "Remove image",
  file,
  remoteUrl,
  error,
  onFileChange,
  options = DEFAULT_IMAGE_OPTIONS
}: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const generation = useRef(0);
  const [pending, setPending] = useState(false);
  const [dragging, setDragging] = useState(false);
  const localUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(
    () => () => {
      if (localUrl) {
        URL.revokeObjectURL(localUrl);
      }
    },
    [localUrl]
  );

  const preview = localUrl ?? remoteUrl;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = `${id}-error`;
  const describedBy = [hintId, error ? errorId : undefined].filter(Boolean).join(" ") || undefined;

  const openPicker = () => {
    inputRef.current?.click();
  };

  const applyFile = async (next: File | null) => {
    if (!next) {
      generation.current += 1;
      setPending(false);
      onFileChange(null, null);
      return;
    }

    const token = ++generation.current;
    setPending(true);
    const result = await prepareImageFile(next, options);

    if (token !== generation.current) {
      return;
    }

    setPending(false);

    if (result.ok) {
      onFileChange(result.file, null);
      return;
    }

    onFileChange(file, result.error);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);

    if (pending) {
      return;
    }

    const next = event.dataTransfer.files[0];

    if (next) {
      void applyFile(next);
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Label htmlFor={id}>
        {label}
        {optional ? (
          <span className="font-normal text-muted-foreground"> (optional)</span>
        ) : null}
      </Label>
      <div
        aria-busy={pending}
        className={cn(
          "flex min-w-0 cursor-pointer flex-col gap-3 rounded-lg border-(length:var(--surface-border-width)) border-dashed p-3 sm:flex-row sm:items-center",
          dragging ? "border-primary bg-accent" : "border-border bg-card",
          error ? "border-destructive" : null,
          pending ? "pointer-events-none cursor-wait opacity-80" : null
        )}
        onClick={(event) => {
          const target = event.target;
          const node = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;

          if (pending || node?.closest("button")) {
            return;
          }

          openPicker();
        }}
        onDragEnter={(event) => {
          if (!isFileDrag(event) || pending) {
            return;
          }

          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          if (event.currentTarget.contains(event.relatedTarget as Node)) {
            return;
          }

          setDragging(false);
        }}
        onDragOver={(event) => {
          if (!isFileDrag(event) || pending) {
            return;
          }

          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }}
        onDrop={onDrop}
      >
        <input
          accept={IMAGE_ACCEPT}
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          className="sr-only"
          disabled={pending}
          id={id}
          onChange={(event) => {
            const next = event.target.files?.[0] ?? null;
            event.target.value = "";

            if (next) {
              void applyFile(next);
            }
          }}
          ref={inputRef}
          tabIndex={-1}
          type="file"
        />
        {preview ? (
          // next/image is for known remote hosts; object URLs are local previews.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={previewAlt}
            className="size-24 shrink-0 rounded-md border-(length:var(--surface-border-width)) border-border bg-muted object-contain"
            height={96}
            src={preview}
            width={96}
          />
        ) : (
          <div
            aria-hidden
            className="flex size-24 shrink-0 items-center justify-center rounded-md border-(length:var(--surface-border-width)) border-dashed border-border bg-muted text-muted-foreground"
          >
            <ImagePlus className="size-8" />
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="wrap-anywhere text-sm text-muted-foreground">
            {pending ? "Shrinking image…" : preview ? (file?.name ?? "Image added") : emptyLabel}
          </p>
          <div className="flex min-w-0 flex-wrap gap-2">
            <Button
              disabled={pending}
              onClick={(event) => {
                event.stopPropagation();
                openPicker();
              }}
              type="button"
              variant="outline"
            >
              {chooseLabel}
            </Button>
            {file || remoteUrl ? (
              <Button
                disabled={pending}
                onClick={(event) => {
                  event.stopPropagation();
                  void applyFile(null);
                }}
                type="button"
                variant="ghost"
              >
                {removeLabel}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      {hint ? (
        <p className="text-sm text-muted-foreground" id={hintId}>
          {hint}
        </p>
      ) : null}
      <FieldError id={errorId} message={error ?? undefined} />
    </div>
  );
};

export default ImageUploadField;
export type { Props as ImageUploadFieldProps };
