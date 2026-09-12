"use client";

import {
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  KaronMark,
  KaronWordmark,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  ThemeToggle,
  useSidebar,
  useTheme,
  type ThemePreference
} from "@karon/design-system";
import {
  Building2,
  CalendarDays,
  ChevronRight,
  LogOut,
  Monitor,
  Moon,
  Settings,
  Sun,
  Wallet
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import ClinicStaffAvatar from "@/features/auth/clinic-staff-avatar";
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

const nextTheme: Record<ThemePreference, ThemePreference> = {
  system: "light",
  light: "dark",
  dark: "system"
};

const themeLabel: Record<ThemePreference, string> = {
  system: "System theme",
  light: "Light theme",
  dark: "Dark theme"
};

const themeIcon: Record<ThemePreference, ReactNode> = {
  system: <Monitor aria-hidden className="size-5" />,
  light: <Sun aria-hidden className="size-5" />,
  dark: <Moon aria-hidden className="size-5" />
};

const jobsFor = (role: ClinicRole): JobItem[] =>
  role === "owner"
    ? [JOBS["/today"], JOBS["/owner/today"], JOBS["/owner/clinic"]]
    : [JOBS["/today"]];

const isCurrentPath = (pathname: string, href: string) => pathname === href;

type JobNavProps = {
  role: ClinicRole;
};

const ClinicJobNav = ({ role }: JobNavProps) => {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const jobs = jobsFor(role);

  return (
    <SidebarMenu>
      {jobs.map((job) => {
        const Icon = job.icon;
        const active = isCurrentPath(pathname, job.href);

        return (
          <SidebarMenuItem key={job.href}>
            <SidebarMenuButton asChild isActive={active} tooltip={job.name}>
              <Link
                aria-current={active ? "page" : undefined}
                aria-label={job.name}
                href={job.href}
                onClick={() => {
                  if (isMobile) {
                    setOpenMobile(false);
                  }
                }}
              >
                <Icon aria-hidden />
                <span className="group-data-[collapsible=icon]:hidden">
                  {job.label}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
};

const ClinicAccountNav = () => {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const active = isCurrentPath(pathname, "/settings");

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={active} tooltip="Settings">
          <Link
            aria-current={active ? "page" : undefined}
            aria-label="Settings"
            href="/settings"
            onClick={() => {
              if (isMobile) {
                setOpenMobile(false);
              }
            }}
          >
            <Settings aria-hidden />
            <span className="group-data-[collapsible=icon]:hidden">Settings</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};

type UtilityNavProps = {
  onSignOut: () => void;
};

const ClinicUtilityNav = ({ onSignOut }: UtilityNavProps) => (
  <div className="flex min-w-0 flex-wrap items-center gap-1">
    <ThemeToggle />
    <SidebarMenuButton asChild className="w-auto" tooltip="Settings">
      <Link aria-label="Settings" href="/settings">
        <Settings aria-hidden />
        <span>Settings</span>
      </Link>
    </SidebarMenuButton>
    <SidebarMenuButton
      aria-label="Sign out"
      className="w-auto"
      tooltip="Sign out"
      type="button"
      onClick={onSignOut}
    >
      <LogOut aria-hidden />
      <span>Sign out</span>
    </SidebarMenuButton>
  </div>
);

type ClinicBrandLinkProps = {
  className?: string;
};

const ClinicBrandLink = ({ className }: ClinicBrandLinkProps) => {
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <Link
      aria-label="Karon"
      className={cn(
        "inline-flex min-h-(--control-min-height) min-w-0 items-center justify-start overflow-hidden rounded-md px-2 group-data-[collapsible=icon]:w-(--control-min-height) group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        className
      )}
      href="/today"
      onClick={() => {
        if (isMobile) {
          setOpenMobile(false);
        }
      }}
    >
      <KaronWordmark className="group-data-[collapsible=icon]:hidden" />
      <KaronMark
        aria-hidden
        className="hidden size-8 text-primary group-data-[collapsible=icon]:block"
      />
    </Link>
  );
};

type AccountMenuProps = {
  role: ClinicRole;
  userId: string;
  onSignOut: () => void;
};

const ClinicAccountMenu = ({ role, userId, onSignOut }: AccountMenuProps) => {
  const { state } = useSidebar();
  const { preference, setPreference } = useTheme();
  const next = nextTheme[preference];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Account menu"
          className="flex min-h-(--control-min-height) w-full min-w-0 items-center gap-2 overflow-hidden rounded-lg px-2 ring-1 ring-border group-data-[collapsible=icon]:size-(--control-min-height)! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:ring-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          type="button"
        >
          <ClinicStaffAvatar bare role={role} userId={userId} />
          <ChevronRight
            aria-hidden
            className="ml-auto size-5 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className={
          state === "collapsed"
            ? "w-48"
            : "w-[calc(var(--sidebar-width)-1rem)] min-w-[calc(var(--sidebar-width)-1rem)]"
        }
        side={state === "collapsed" ? "right" : "top"}
      >
        <DropdownMenuItem
          onSelect={() => {
            setPreference(next);
          }}
        >
          {themeIcon[preference]}
          <span>{themeLabel[preference]}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            void onSignOut();
          }}
        >
          <LogOut aria-hidden />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export {
  ClinicAccountMenu,
  ClinicAccountNav,
  ClinicBrandLink,
  ClinicJobNav,
  ClinicUtilityNav
};
export type { AccountMenuProps, JobNavProps, UtilityNavProps };
