"use client";

import {
  Alert,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  Button,
  Card,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Label,
  Skeleton,
  PageHeader,
  StatusBadge,
  cn,
  useDebouncedValue,
  useIsMobile
} from "@karon/design-system";
import {
  Clock3,
  EllipsisVertical,
  Globe,
  Plus,
  Search,
  Stethoscope
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import ServiceForm from "@/features/services/service-form";
import { isServiceIconKey } from "@/features/services/service-icons";
import { formatServicePrice } from "@/features/services/service-money";
import type { ClinicServiceRow } from "@/features/services/service-schemas";
import { ServiceIconBadge } from "@/features/services/service-visual";
import { useClinicServices } from "@/features/services/use-clinic-services";

type ServiceListItemProps = {
  canEdit: boolean;
  service: ClinicServiceRow;
  onEdit: (service: ClinicServiceRow) => void;
  onDelete: (service: ClinicServiceRow) => void;
};

const ServiceListItem = ({
  canEdit,
  service,
  onEdit,
  onDelete
}: ServiceListItemProps) => {
  const description = service.description?.trim();
  const iconKey =
    service.icon && isServiceIconKey(service.icon) ? service.icon : null;
  const formattedPrice =
    service.price_minor === null || service.currency_code === null
      ? null
      : formatServicePrice(service.price_minor, service.currency_code);

  return (
    <li className="min-w-0">
      <div
        className={cn(
          "group flex min-w-0 items-stretch gap-2 rounded-lg border-(length:var(--surface-border-width)) border-border bg-background",
          "transition-[background-color,border-color] duration-(--motion-duration)",
          "hover:border-primary/20 hover:bg-muted/30"
        )}
      >
        <button
          className="flex min-w-0 flex-1 items-start gap-3 rounded-lg px-3 py-3 text-left sm:items-center sm:py-4"
          onClick={() => onEdit(service)}
          type="button"
        >
          <ServiceIconBadge iconKey={iconKey} />
          <span className="min-w-0 flex-1">
            <span className="block wrap-anywhere font-medium text-foreground">
              {service.name}
            </span>
            <span
              className={cn(
                "mt-1 block line-clamp-2 text-sm",
                description ? "text-muted-foreground" : "text-muted-foreground/80 italic"
              )}
            >
              {description || "No description yet"}
            </span>
            <span className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              {formattedPrice ? (
                <span className="font-semibold text-foreground tabular-nums">
                  {formattedPrice}
                </span>
              ) : (
                <StatusBadge tone="warning">Needs price</StatusBadge>
              )}
              {service.duration_minutes === null ? null : (
                <span className="inline-flex items-center gap-1 text-muted-foreground tabular-nums">
                  <Clock3 aria-hidden className="size-3.5" />
                  {service.duration_minutes} min
                </span>
              )}
            </span>
            <span
              className="mt-2 inline-flex max-w-full items-center gap-1.5"
              title="Clients can choose this service on your public booking page."
            >
              <Globe aria-hidden className="size-3.5 shrink-0 text-info" />
              <StatusBadge tone="info">Shown on booking</StatusBadge>
              <span className="sr-only">
                Visible to clients on your public booking page.
              </span>
            </span>
          </span>
        </button>
        {canEdit ? (
          <div className="flex shrink-0 items-start py-2 pr-2 sm:items-center sm:py-0 sm:pr-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label={`Actions for ${service.name}`}
                  className="h-10 min-h-10 w-10 max-h-10 px-0 hover:scale-100 [&_svg]:size-4"
                  type="button"
                  variant="ghost"
                >
                  <EllipsisVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" collisionPadding={8}>
                <DropdownMenuItem onSelect={() => onEdit(service)}>Edit</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onDelete(service)}>
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}
      </div>
    </li>
  );
};

const ServiceListSkeleton = () => (
  <ul aria-busy aria-label="Loading services" className="flex flex-col gap-2">
    {Array.from({ length: 4 }, (_, index) => (
      <li key={index}>
        <div className="flex items-center gap-3 rounded-lg border-(length:var(--surface-border-width)) border-border px-3 py-4">
          <Skeleton className="size-11 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-2/5 max-w-48" />
            <Skeleton className="h-4 w-4/5 max-w-md" />
          </div>
        </div>
      </li>
    ))}
  </ul>
);

const ServicesEmptyHero = () => (
  <Card className="items-center gap-4 px-4 py-10 text-center sm:px-8 sm:py-14">
    <div
      aria-hidden
      className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"
    >
      <Stethoscope className="size-8" />
    </div>
    <div className="flex max-w-md flex-col gap-2">
      <h2 className="text-lg font-semibold">No services yet</h2>
      <p className="text-sm text-muted-foreground">
        Services appear on public booking and help staff pick the right visit type.
        Add your first one with the button above.
      </p>
    </div>
  </Card>
);

const ServicesPage = () => {
  const isMobile = useIsMobile();
  const {
    services,
    currencyCode,
    canEdit,
    loading,
    error,
    createService,
    updateService,
    deleteService
  } = useClinicServices();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ClinicServiceRow | null>(null);
  const [deleting, setDeleting] = useState<ClinicServiceRow | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  const openCreate = useCallback(() => {
    setEditing(null);
    setDrawerOpen(true);
  }, []);

  const openEdit = useCallback((service: ClinicServiceRow) => {
    setEditing(service);
    setDrawerOpen(true);
  }, []);

  const filteredServices = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();

    const sorted = [...services].sort((left, right) =>
      left.name.localeCompare(right.name)
    );

    if (!query) {
      return sorted;
    }

    return sorted.filter((service) => {
      const haystack = [service.name, service.description ?? ""]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [debouncedSearch, services]);

  const serviceCountLabel =
    services.length === 1 ? "1 service" : `${services.length} services`;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <PageHeader
        description={
          loading
            ? "Loading your clinic catalog…"
            : services.length === 0
              ? "Build the list patients see when they book online."
              : `${serviceCountLabel} for booking and chair time.`
        }
        title="Services"
      >
        {canEdit && currencyCode ? (
          <Button onClick={openCreate} type="button">
            <Plus aria-hidden className="size-4" />
            Add service
          </Button>
        ) : null}
      </PageHeader>

      {error ? <Alert title={error} variant="danger" /> : null}

      {loading ? (
        <Card className="gap-3">
          <Skeleton className="h-10 w-full max-w-md rounded-md" />
          <ServiceListSkeleton />
        </Card>
      ) : services.length === 0 ? (
        <ServicesEmptyHero />
      ) : (
        <Card className="gap-4">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="relative min-w-0 flex-1 sm:max-w-md">
              <Label className="sr-only" htmlFor="services-search">
                Search services
              </Label>
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                aria-label="Search services"
                className="pl-9"
                id="services-search"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or description"
                value={search}
              />
            </div>
            <p className="text-sm text-muted-foreground tabular-nums">
              {filteredServices.length === services.length
                ? serviceCountLabel
                : `${filteredServices.length} of ${services.length}`}
            </p>
          </div>

          {filteredServices.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No services match &ldquo;{search.trim()}&rdquo;.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {filteredServices.map((service) => (
                <ServiceListItem
                  canEdit={canEdit}
                  key={service.id}
                  onDelete={setDeleting}
                  onEdit={openEdit}
                  service={service}
                />
              ))}
            </ul>
          )}
        </Card>
      )}

      <Drawer
        onOpenChange={(open) => {
          setDrawerOpen(open);

          if (!open) {
            setEditing(null);
          }
        }}
        open={drawerOpen}
        showSwipeHandle={isMobile}
        swipeDirection={isMobile ? "down" : "right"}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              {editing ? (canEdit ? "Edit service" : "Service details") : "Add service"}
            </DrawerTitle>
            <DrawerDescription>
              {editing
                ? canEdit
                  ? "Update the service, chair price, and default appointment time."
                  : "Service pricing is read-only for assistants."
                : "Set the service details, chair price, and default appointment time."}
            </DrawerDescription>
          </DrawerHeader>
          {currencyCode ? (
            <ServiceForm
              currencyCode={currencyCode}
              onSave={async (values) => {
                if (editing) {
                  await updateService.mutateAsync({ service: editing, values });
                } else {
                  await createService.mutateAsync(values);
                }

                setDrawerOpen(false);
                setEditing(null);
              }}
              readOnly={!canEdit}
              service={editing}
            />
          ) : (
            <div className="px-6 pb-6">
              <Alert title="Clinic currency is unavailable." variant="danger" />
            </div>
          )}
        </DrawerContent>
      </Drawer>

      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null);
          }
        }}
        open={deleting !== null}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the service. Past bookings keep the saved service
            name.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleting) {
                  return;
                }

                void deleteService.mutateAsync(deleting).finally(() => {
                  setDeleting(null);
                });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ServicesPage;
