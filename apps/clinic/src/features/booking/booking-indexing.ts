import { formatClinicAddress } from "./booking-clinic-display";
import { clinicHoursOf } from "./booking-slots";

type BookingIndexingProfile = {
  name?: unknown;
  phone?: unknown;
  address?: unknown;
  hours?: unknown;
};

type MissingItem = {
  label: string;
  href: string;
};

const minutesFromClock = (clock: string) => {
  const [hour, minute] = clock.split(":").map(Number);
  return hour * 60 + minute;
};

const clinicCityOf = (address: unknown) => {
  if (!address || typeof address !== "object" || !("city" in address)) {
    return null;
  }

  const city = address.city;
  return typeof city === "string" && city.trim() ? city.trim() : null;
};

const bookingIndexingMissingItems = (
  profile: BookingIndexingProfile,
  serviceCount: number
): MissingItem[] => {
  const hours = clinicHoursOf(profile.hours);
  const hasSlot = hours
    ? minutesFromClock(hours.close) - minutesFromClock(hours.open) >= 30
    : false;
  const items: Array<MissingItem | null> = [
    typeof profile.name === "string" && profile.name.trim()
      ? null
      : { label: "clinic name", href: "/settings?tab=clinic#clinic-name" },
    formatClinicAddress(profile.address)
      ? null
      : { label: "address", href: "/settings?tab=clinic#clinic-line1" },
    clinicCityOf(profile.address)
      ? null
      : { label: "city", href: "/settings?tab=clinic#clinic-city" },
    typeof profile.phone === "string" && profile.phone.trim()
      ? null
      : { label: "phone", href: "/settings?tab=clinic#clinic-phone" },
    hours
      ? null
      : { label: "opening hours", href: "/settings?tab=clinic#clinic-open" },
    hasSlot
      ? null
      : { label: "bookable slot hours", href: "/settings?tab=clinic#clinic-open" },
    serviceCount > 0 ? null : { label: "services", href: "/services" }
  ];

  return items.filter((item): item is MissingItem => item !== null);
};

const isBookingPageComplete = (
  profile: BookingIndexingProfile,
  serviceCount: number
) => bookingIndexingMissingItems(profile, serviceCount).length === 0;

export { bookingIndexingMissingItems, clinicCityOf, isBookingPageComplete };
export type { BookingIndexingProfile, MissingItem };
