import OwnerCollectionsPage from "@/features/owner-collections/owner-collections-page";

export const metadata = {
  title: "Daily collections"
};

type Props = {
  searchParams: Promise<{ day?: string | string[] }>;
};

const OwnerTodayPage = ({ searchParams }: Props) => (
  <OwnerCollectionsPage searchParams={searchParams} />
);

export default OwnerTodayPage;
