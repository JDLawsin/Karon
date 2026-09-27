const DATE = /^\d{4}-\d{2}-\d{2}$/;
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

type ClinicHoursLabel = {
  days: number[];
  open: string;
  close: string;
};

const formatClinicAddress = (value: unknown): string | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const parts = ["line1", "barangay", "city", "province", "postalCode"].flatMap(
    (key) => {
      const raw = row[key];

      return typeof raw === "string" && raw.trim() ? [raw.trim()] : [];
    }
  );

  return parts.length > 0 ? parts.join(", ") : null;
};

const clinicPhoneOf = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
};

const formatHourClock = (
  clock: string,
  locale: string = DEFAULT_CLINIC_REGIONAL_SETTINGS.locale
) => {
  if (!CLOCK.test(clock)) {
    return clock;
  }

  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC"
  }).format(new Date(`2026-01-01T${clock}:00Z`));
};

const formatDayRange = (
  days: number[],
  locale: string = DEFAULT_CLINIC_REGIONAL_SETTINGS.locale
) => {
  const labels = days.flatMap((day) => {
    const label =
      day >= 0 && day <= 6
        ? new Intl.DateTimeFormat(locale, {
            weekday: "short",
            timeZone: "UTC"
          }).format(new Date(Date.UTC(2026, 8, 6 + day)))
        : undefined;

    return label ? [label] : [];
  });

  if (labels.length === 0) {
    return "";
  }

  const consecutive = days.every(
    (day, index) => index === 0 || day === (days[index - 1] ?? 0) + 1
  );

  if (consecutive && labels.length > 1) {
    return `${labels[0]}–${labels[labels.length - 1]}`;
  }

  return labels.join(", ");
};

const formatClinicHours = (
  hours: ClinicHoursLabel,
  locale: string = DEFAULT_CLINIC_REGIONAL_SETTINGS.locale
) => {
  const days = formatDayRange(hours.days, locale);
  const window = `${formatHourClock(hours.open, locale)} – ${formatHourClock(hours.close, locale)}`;

  return days ? `${days}, ${window}` : window;
};

const formatBookingDateChip = (
  date: string,
  locale: string = DEFAULT_CLINIC_REGIONAL_SETTINGS.locale
) => {
  if (!DATE.test(date)) {
    return date;
  }

  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC"
  }).format(new Date(`${date}T12:00:00Z`));
};

const formatClinicTimezone = (timeZone: string) => {
  const zone = timeZone.trim();

  if (zone === "Asia/Manila") {
    return "Times in Philippine time";
  }

  return `Times in ${zone.replaceAll("_", " ")}`;
};

const clinicInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

export {
  clinicInitials,
  clinicPhoneOf,
  formatBookingDateChip,
  formatClinicAddress,
  formatClinicHours,
  formatClinicTimezone
};
export type { ClinicHoursLabel };
import { DEFAULT_CLINIC_REGIONAL_SETTINGS } from "@/lib/clinic/regional-settings";
