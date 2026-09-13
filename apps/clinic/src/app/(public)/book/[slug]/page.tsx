import PublicBookingPage from "@/features/booking/public-booking-page";

type Props = {
  params: Promise<{ slug: string }>;
};

export const metadata = {
  title: "Book a visit"
};

const BookPage = async ({ params }: Props) => {
  const { slug } = await params;

  return <PublicBookingPage slug={slug} />;
};

export default BookPage;
