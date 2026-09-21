import { Button } from "@karon/design-system";
import Link from "next/link";

export const metadata = {
  title: "Offline"
};

const OfflinePage = () => (
  <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 px-6">
    <p className="text-sm font-medium text-primary">Offline</p>
    <h1 className="text-3xl font-semibold tracking-tight">
      The clinic is still available.
    </h1>
    <p className="text-muted-foreground">
      Reconnect to load pages that have not been saved on this device yet.
    </p>
    <Button asChild className="self-start">
      <Link href="/login">Log in</Link>
    </Button>
  </main>
);

export default OfflinePage;
