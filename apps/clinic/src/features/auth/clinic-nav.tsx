"use client";

import { Button, KaronWordmark, ThemeToggle, cn } from "@karon/design-system";
import { Building2, CalendarDays, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { ClinicRole } from "@/features/auth/resolve-auth-destination";

type JobHref = "/today" | "/owner/today" | "/owner/clinic";

type JobItem = {
  href: JobHref;
  label: string;
  name: string;
  icon: typeof CalendarDays;
};

const JOBS: Record<JobHref, JobItem> = {
  "/today": {
    href: "/today",
    label: "Today",
    name: "Today",
    icon: CalendarDays
  },
  "/owner/today": {
    href: "/owner/today",
    label: "Collections",
    name: "Today's collections",
    icon: Wallet
  },
  "/owner/clinic": {
    href: "/owner/clinic",
    label: "Clinic",
    name: "Clinic",
    icon: Building2
  }
};

const jobsFor = (role: ClinicRole): JobItem[] =>
  role === "owner"
    ? [JOBS["/today"], JOBS["/owner/today"], JOBS["/owner/clinic"]]
    : [JOBS["/today"]];

const isCurrentJob = (pathname: string, href: JobHref) => pathname === href;

const jobClass = (active: boolean, stacked: boolean) =>
  cn(
    "inline-flex min-h-(--control-min-height) min-w-0 items-center rounded-md text-sm font-medium whitespace-nowrap transition-colors duration-(--motion-duration)",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    stacked
      ? "w-full flex-col justify-center gap-0.5 px-2 py-1"
      : "gap-2 px-3",
    active
      ? "bg-accent text-foreground"
      : "text-foreground hover:bg-muted active:bg-muted"
  );

type JobNavProps = {
  role: ClinicRole;
  stacked?: boolean;
};

const ClinicJobNav = ({ role, stacked = false }: JobNavProps) => {
  const pathname = usePathname();
  const jobs = jobsFor(role);

  return (
    <ul className={cn("flex min-w-0", stacked ? "w-full" : "flex-col gap-1")}>
      {jobs.map((job) => {
        const Icon = job.icon;
        const active = isCurrentJob(pathname, job.href);

        return (
          <li className={stacked ? "min-w-0 flex-1" : "min-w-0"} key={job.href}>
            <Link
              aria-current={active ? "page" : undefined}
              aria-label={job.name}
              className={jobClass(active, stacked)}
              href={job.href}
            >
              <Icon aria-hidden className="size-5 shrink-0" />
              <span className="min-w-0 truncate">{job.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
};

type UtilityNavProps = {
  onSignOut: () => void;
};

const ClinicUtilityNav = ({ onSignOut }: UtilityNavProps) => (
  <div className="flex min-w-0 flex-wrap items-center gap-1 md:flex-col md:items-stretch">
    <ThemeToggle />
    <Link
      className="inline-flex min-h-(--control-min-height) items-center rounded-md px-3 text-sm font-medium whitespace-nowrap text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      href="/update-password"
    >
      Password
    </Link>
    <Button onClick={onSignOut} type="button" variant="outline">
      Sign out
    </Button>
  </div>
);

const ClinicBrandLink = () => (
  <Link
    className="inline-flex min-h-(--control-min-height) items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    href="/today"
  >
    <KaronWordmark />
  </Link>
);

export { ClinicBrandLink, ClinicJobNav, ClinicUtilityNav };
export type { JobNavProps, UtilityNavProps };
