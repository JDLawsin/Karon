import { Button, KaronWordmark } from "@karon/design-system";
import Link from "next/link";

const NotFound = () => (
  <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center gap-6 px-4 py-8 sm:px-6">
    <title>Page not found | Karon</title>
    <KaronWordmark />
    <div className="flex min-w-0 flex-col gap-2">
      <h1 className="text-3xl tracking-(--heading-tracking) font-(--heading-weight)">
        Page not found
      </h1>
      <p className="text-muted-foreground">
        The page may have moved, or the address may be incorrect.
      </p>
    </div>
    <Button asChild className="self-start">
      <Link href="/">Go to Karon</Link>
    </Button>
  </main>
);

export default NotFound;
