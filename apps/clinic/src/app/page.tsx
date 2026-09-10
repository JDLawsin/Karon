import { Button, KaronWordmark, ThemeToggle } from "@karon/design-system";
import Link from "next/link";

const HomePage = () => (
  <main className="mx-auto flex min-h-screen w-full max-w-3xl min-w-0 flex-col gap-8 px-6 py-8 sm:py-16">
    <header className="flex w-full min-w-0 flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
      <Link
        href="/"
        className="inline-flex min-h-11 items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <KaronWordmark />
      </Link>
      <ThemeToggle />
    </header>
    <div className="flex min-w-0 flex-1 flex-col justify-center gap-8">
      <div className="min-w-0 space-y-3">
        <h1 className="text-2xl font-semibold">
          Ready for the first chair workflow.
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          The Yarn workspace, shared design system, PWA shell, logging, and test
          foundations are connected.
        </p>
      </div>

      <Button asChild className="w-fit">
        <Link href="/~offline">Preview the offline fallback</Link>
      </Button>
    </div>
  </main>
);

export default HomePage;
