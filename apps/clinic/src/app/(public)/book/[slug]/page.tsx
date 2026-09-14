import type { Metadata } from "next";

import {
  loadPublicBooking,
  toPublicBookingPayload
} from "@/features/booking/public-booking";
import PublicBookingPage from "@/features/booking/public-booking-page";

type Props = {
  params: Promise<{ slug: string }>;
};

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { slug } = await params;
  const result = await loadPublicBooking(slug, null);

  if (!result.ok) {
    return { title: { absolute: "Booking unavailable" } };
  }

  return { title: { absolute: `${result.page.clinicName} · Book a visit` } };
};

const BookPage = async ({ params }: Props) => {
  const { slug } = await params;
  const result = await loadPublicBooking(slug, null);

  return (
    <PublicBookingPage
      initialPage={result.ok ? toPublicBookingPayload(result.page) : null}
      slug={slug}
    />
  );
};

export default BookPage;
