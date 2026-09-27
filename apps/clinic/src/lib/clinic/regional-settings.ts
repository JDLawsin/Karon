import { z } from "zod";

const DEFAULT_CLINIC_REGIONAL_SETTINGS = {
  currencyCode: "PHP",
  locale: "en-PH",
  timezone: "Asia/Manila"
} as const;

const supportedCurrencyCodes = new Set(Intl.supportedValuesOf("currency"));

const currencyCodeSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(
    z
      .string()
      .regex(/^[A-Z]{3}$/, "Choose a valid ISO 4217 currency.")
      .refine((value) => supportedCurrencyCodes.has(value), {
        message: "Choose a valid ISO 4217 currency."
      })
  );

const localeSchema = z
  .string()
  .trim()
  .min(1, "Enter a locale.")
  .max(35, "Use a shorter locale tag.")
  .transform((value, ctx) => {
    try {
      return Intl.getCanonicalLocales(value)[0] ?? value;
    } catch {
      ctx.addIssue({ code: "custom", message: "Enter a valid locale tag." });
      return z.NEVER;
    }
  });

const timeZoneSchema = z
  .string()
  .trim()
  .min(1, "Choose a timezone.")
  .max(64, "Use a shorter timezone.")
  .refine(
    (value) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: value }).format();
        return true;
      } catch {
        return false;
      }
    },
    { message: "Choose a valid IANA timezone." }
  );

const clinicRegionalSettingsSchema = z.object({
  currencyCode: currencyCodeSchema,
  locale: localeSchema,
  timezone: timeZoneSchema
});

const clinicRegionalSettingsRowSchema = z
  .object({
    currency_code: currencyCodeSchema,
    locale: localeSchema,
    timezone: timeZoneSchema
  })
  .transform((row) => ({
    currencyCode: row.currency_code,
    locale: row.locale,
    timezone: row.timezone
  }));

type ClinicRegionalSettings = z.infer<typeof clinicRegionalSettingsSchema>;

const clinicDateSchema = z.iso.date();
const clinicTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const clinicLocalDateTimeParts = (instant: Date, timezone: string) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZoneSchema.parse(timezone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    date: `${read("year")}-${read("month")}-${read("day")}`,
    time: `${read("hour")}:${read("minute")}`
  };
};

const clinicDateTimeToUtc = (date: string, time: string, timezone: string) => {
  const parsedDate = clinicDateSchema.parse(date);
  const parsedTime = clinicTimeSchema.parse(time);
  const [year = 0, month = 0, day = 0] = parsedDate.split("-").map(Number);
  const [hour = 0, minute = 0] = parsedTime.split(":").map(Number);
  const target = Date.UTC(year, month - 1, day, hour, minute);
  let instant = target;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const local = clinicLocalDateTimeParts(new Date(instant), timezone);
    const [localYear = 0, localMonth = 0, localDay = 0] = local.date
      .split("-")
      .map(Number);
    const [localHour = 0, localMinute = 0] = local.time.split(":").map(Number);
    const represented = Date.UTC(
      localYear,
      localMonth - 1,
      localDay,
      localHour,
      localMinute
    );
    instant += target - represented;
  }

  const resolved = new Date(instant);
  const local = clinicLocalDateTimeParts(resolved, timezone);

  if (local.date !== parsedDate || local.time !== parsedTime) {
    throw new Error("That clinic time is not available.");
  }

  return resolved.toISOString();
};

const currencyFractionDigits = (currencyCode: string) =>
  new Intl.NumberFormat("en", {
    style: "currency",
    currency: currencyCodeSchema.parse(currencyCode)
  }).resolvedOptions().maximumFractionDigits ?? 2;

const formatClinicMoney = (
  priceMinor: number,
  currencyCode: string,
  locale: string
) => {
  const currency = currencyCodeSchema.parse(currencyCode);
  const resolvedLocale = localeSchema.parse(locale);
  const amount = priceMinor / 10 ** currencyFractionDigits(currency);

  return new Intl.NumberFormat(resolvedLocale, {
    style: "currency",
    currency
  }).format(amount);
};

const formatClinicDateTime = (
  instant: string | Date,
  settings: Pick<ClinicRegionalSettings, "locale" | "timezone">
) =>
  new Intl.DateTimeFormat(localeSchema.parse(settings.locale), {
    timeZone: timeZoneSchema.parse(settings.timezone),
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(typeof instant === "string" ? new Date(instant) : instant);

export {
  DEFAULT_CLINIC_REGIONAL_SETTINGS,
  clinicRegionalSettingsRowSchema,
  clinicRegionalSettingsSchema,
  clinicDateTimeToUtc,
  clinicLocalDateTimeParts,
  currencyCodeSchema,
  currencyFractionDigits,
  formatClinicDateTime,
  formatClinicMoney,
  localeSchema,
  timeZoneSchema
};
export type { ClinicRegionalSettings };
