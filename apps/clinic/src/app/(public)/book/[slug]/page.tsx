import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  loadPublicBooking,
  toPublicBookingPayload
} from "@/features/booking/public-booking";
import PublicBookingPage from "@/features/booking/public-booking-page";
import { clinicAppUrl } from "@/lib/server-env";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const hasQuery = (searchParams: Record<string, string | string[] | undefined>) =>
  Object.keys(searchParams).length > 0;

export const generateMetadata = async ({
  params,
  searchParams
}: Props): Promise<Metadata> => {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const result = await loadPublicBooking(slug, null);

  if (!result.ok) {
    return {
      title: { absolute: "Booking unavailable" },
      robots: { index: false, follow: false }
    };
  }

  const canonical = clinicAppUrl(`/book/${encodeURIComponent(slug)}`);
  const indexable = result.page.indexable && !hasQuery(query);
  const title = indexable && result.page.addressData
    ? `${result.page.clinicName}, Dentist in ${result.page.addressData.addressLocality} | Book online`
    : `${result.page.clinicName} | Book a visit`;

  return {
    title: { absolute: title },
    description: `Request a dental visit with ${result.page.clinicName}. View services and available times online.`,
    alternates: { canonical },
    robots: { index: indexable, follow: indexable }
  };
};

const BookPage = async ({ params, searchParams }: Props) => {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const result = await loadPublicBooking(slug, null);

  if (!result.ok) {
    notFound();
  }

  const showStructuredData = result.page.indexable && !hasQuery(query);
  const dentist = showStructuredData && result.page.addressData
    ? {
        "@context": "https://schema.org",
        "@type": "Dentist",
        name: result.page.clinicName,
        url: clinicAppUrl(`/book/${encodeURIComponent(slug)}`).toString(),
        telephone: result.page.phone,
        address: {
          "@type": "PostalAddress",
          ...result.page.addressData
        },
        openingHoursSpecification: result.page.hours.days.map((day) => ({
          "@type": "OpeningHoursSpecification",
          dayOfWeek: [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday"
          ][day],
          opens: result.page.hours.open,
          closes: result.page.hours.close
        }))
      }
    : null;

  return (
    <>
      {dentist ? (
        <script
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(dentist).replaceAll("<", "\\u003c")
          }}
          type="application/ld+json"
        />
      ) : null}
      <PublicBookingPage
        initialPage={toPublicBookingPayload(result.page)}
        slug={slug}
      />
    </>
  );
};

export default BookPage;
