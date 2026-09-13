// Deferred: Google Calendar — keep for later reconnect

import type { BookingPage } from "./booking-page";

type ExistingConnection = {
  calendar_id: string;
  booking_pages: BookingPage[];
} | null;

type ConnectionWrite = {
  calendar_id: string;
  booking_pages: BookingPage[];
  connected_by: string;
  encrypted_refresh_token: string;
  updated_at: string;
};

const nextConnectionRow = (
  existing: ExistingConnection,
  input: { refreshToken: string; userId: string; updatedAt: string }
): ConnectionWrite => ({
  calendar_id: existing?.calendar_id ?? "primary",
  booking_pages: existing?.booking_pages ?? [],
  connected_by: input.userId,
  encrypted_refresh_token: input.refreshToken,
  updated_at: input.updatedAt
});

export { nextConnectionRow };
export type { ConnectionWrite, ExistingConnection };
