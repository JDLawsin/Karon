const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
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

const formatHourClock = (clock: string) => {
  if (!CLOCK.test(clock)) {
    return clock;
  }

  const [hours, minutes] = clock.split(":").map(Number);
  const suffix = hours >= 12 ? "pm" : "am";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;

  return `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
};

const formatDayRange = (days: number[]) => {
  const labels = days.flatMap((day) => {
    const label = WEEKDAYS[day];

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

const formatClinicHours = (hours: ClinicHoursLabel) => {
  const days = formatDayRange(hours.days);
  const window = `${formatHourClock(hours.open)} – ${formatHourClock(hours.close)}`;

  return days ? `${days}, ${window}` : window;
};

const formatBookingDateChip = (date: string) => {
  if (!DATE.test(date)) {
    return date;
  }

  return new Intl.DateTimeFormat("en-PH", {
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
