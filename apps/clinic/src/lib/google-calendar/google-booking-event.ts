type GoogleBookingEvent = {
  eventType?: string;
  status?: string;
  description?: string;
  attendees?: {
    email?: string;
    displayName?: string;
    organizer?: boolean;
    self?: boolean;
  }[];
};

const guestAttendees = (event: GoogleBookingEvent) =>
  (event.attendees ?? []).filter((row) => row.email && !row.organizer && !row.self);

const isGoogleBookingEvent = (event: GoogleBookingEvent) => {
  if (event.eventType && event.eventType !== "default") {
    return false;
  }

  if (guestAttendees(event).length > 0) {
    return true;
  }

  const description = event.description?.toLowerCase() ?? "";

  return (
    description.includes("appointment schedule") ||
    description.includes("booked appointment") ||
    description.includes("booking page")
  );
};

export { guestAttendees, isGoogleBookingEvent };
export type { GoogleBookingEvent };
