"use client";

import { Button, KaronWordmark } from "@karon/design-system";
import Link from "next/link";
import { useEffect } from "react";

import { clientLog } from "@/lib/logger/client";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

const ErrorPage = ({ error, reset }: Props) => {
  useEffect(() => {
    clientLog
      .withMetadata(error.digest ? { digest: error.digest } : {})
      .error("route.render_failed");
  }, [error]);

  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center gap-6 px-4 py-8 sm:px-6"
      role="alert"
    >
      <title>Something went wrong | Karon</title>
      <KaronWordmark />
      <div className="flex min-w-0 flex-col gap-2">
        <h1 className="text-3xl tracking-(--heading-tracking) font-(--heading-weight)">
          Something went wrong
        </h1>
        <p className="text-muted-foreground">
          Try again. If the problem continues, return to Karon and reopen the page.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={reset} type="button">
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Go to Karon</Link>
        </Button>
      </div>
    </main>
  );
};

export default ErrorPage;
