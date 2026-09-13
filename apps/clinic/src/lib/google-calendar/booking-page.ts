import { z } from "zod";

import { guestAttendees, type GoogleBookingEvent } from "./google-booking-event";

const bookingPageSchema = z.object({
  name: z.string(),
  url: z.string(),
  scheduleKey: z.string().min(1)
});
const bookingPagesSchema = z.array(bookingPageSchema);

type BookingPage = z.infer<typeof bookingPageSchema>;
type ParsedBookingPage = {
  url: string;
  scheduleKey: string;
};

const SCHEDULE_PATH =
  /^\/calendar(?:\/u\/\d+)?\/appointments\/schedules\/([^/?#]+)$/;

const parseBookingPageUrl = (raw: string): ParsedBookingPage | null => {
  let parsed: URL;

  try {
    parsed = new URL(raw.trim());
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:" || parsed.hostname !== "calendar.google.com") {
    return null;
  }

  const match = SCHEDULE_PATH.exec(parsed.pathname);

  if (!match?.[1]) {
    return null;
  }

  return { url: raw.trim(), scheduleKey: match[1] };
};

const shouldImportGoogleEvent = (event: GoogleBookingEvent, pages: BookingPage[]) => {
  if (pages.length === 0) {
    return false;
  }

  const description = event.description ?? "";
  const matchesPage = pages.some((page) => description.includes(page.scheduleKey));

  if (!matchesPage) {
    return false;
  }

  if (event.status === "cancelled") {
    return true;
  }

  if (event.eventType && event.eventType !== "default") {
    return false;
  }

  return guestAttendees(event).length > 0;
};

const parseBookingPages = (value: unknown): BookingPage[] => {
  const parsed = bookingPagesSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
};

export { parseBookingPageUrl, parseBookingPages, shouldImportGoogleEvent };
export type { BookingPage, ParsedBookingPage };
