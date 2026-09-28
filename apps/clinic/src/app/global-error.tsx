"use client";

import { Button, KaronWordmark } from "@karon/design-system";
import { useEffect } from "react";

import { clientLog } from "@/lib/logger/client";

import "./globals.css";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

const GlobalError = ({ error, reset }: Props) => {
  useEffect(() => {
    clientLog
      .withMetadata(error.digest ? { digest: error.digest } : {})
      .error("root.render_failed");
  }, [error]);

  return (
    <html data-theme="light" lang="en-PH">
      <head>
        <title>Something went wrong | Karon</title>
      </head>
      <body data-density="clinic">
        <main
          className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center gap-6 px-4 py-8 sm:px-6"
          role="alert"
        >
          <KaronWordmark />
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="text-3xl tracking-(--heading-tracking) font-(--heading-weight)">
              Something went wrong
            </h1>
            <p className="text-muted-foreground">
              Karon could not finish opening. Try again to reload the application.
            </p>
          </div>
          <Button className="self-start" onClick={reset} type="button">
            Try again
          </Button>
        </main>
      </body>
    </html>
  );
};

export default GlobalError;
