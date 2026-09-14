import { Avatar, AvatarFallback, AvatarImage } from "@karon/design-system";

import { clinicInitials } from "@/features/booking/booking-clinic-display";
import type { PublicBookingPagePayload } from "@/features/booking/booking-schemas";

type Props = {
  page: PublicBookingPagePayload;
};

const PublicBookingClinicCard = ({ page }: Props) => {
  const tel = page.phone?.replace(/[^\d+]/g, "") ?? "";

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <Avatar className="size-16 rounded-md">
          {page.logoUrl ? (
            <AvatarImage alt={page.clinicName} src={page.logoUrl} />
          ) : null}
          <AvatarFallback className="rounded-md text-lg">
            {clinicInitials(page.clinicName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h1 className="text-2xl tracking-(--heading-tracking) font-(--heading-weight)">
            {`Hi! Welcome to ${page.clinicName}.`}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a time that works. The clinic will confirm your visit.
          </p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{page.hoursLabel}</p>
      {page.phone && tel ? (
        <p className="text-sm">
          <a
            className="inline-flex min-h-(--control-min-height) items-center font-medium text-primary"
            href={`tel:${tel}`}
          >
            {page.phone}
          </a>
        </p>
      ) : null}
      {page.address ? (
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-sm font-medium">Address</p>
          <p className="wrap-anywhere text-sm text-muted-foreground">{page.address}</p>
        </div>
      ) : null}
    </section>
  );
};

export default PublicBookingClinicCard;
