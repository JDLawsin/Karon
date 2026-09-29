import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { loadPublicBooking } from "@/features/booking/public-booking";
import PrivacyNotice from "@/features/privacy/privacy-notice";

type Props = {
  params: Promise<{ slug: string }>;
};

export const metadata: Metadata = {
  title: "Booking privacy notice"
};

const BookingPrivacyPage = async ({ params }: Props) => {
  const { slug } = await params;
  const result = await loadPublicBooking(slug, null);

  if (!result.ok) {
    notFound();
  }

  return (
    <PrivacyNotice
      clinicName={result.page.clinicName}
      clinicPhone={result.page.phone}
      returnHref={`/book/${encodeURIComponent(slug)}`}
    />
  );
};

export default BookingPrivacyPage;
