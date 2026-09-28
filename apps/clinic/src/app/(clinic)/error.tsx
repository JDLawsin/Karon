"use client";

import { Button, EmptyState, PageHeader } from "@karon/design-system";
import Link from "next/link";
import { useEffect } from "react";

import { clientLog } from "@/lib/logger/client";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

const ClinicError = ({ error, reset }: Props) => {
  useEffect(() => {
    clientLog
      .withMetadata(error.digest ? { digest: error.digest } : {})
      .error("clinic.render_failed");
  }, [error]);

  return (
    <div className="flex min-w-0 flex-col gap-4" role="alert">
      <title>Something went wrong | Karon</title>
      <PageHeader title="Something went wrong">
        <Button onClick={reset} type="button">
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/today">Return to Today</Link>
        </Button>
      </PageHeader>
      <EmptyState title="This page could not open">
        Try again. If the problem continues, return to Today and reopen the page.
      </EmptyState>
    </div>
  );
};

export default ClinicError;
