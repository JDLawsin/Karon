import { redirect } from "next/navigation";

import {
  CollectionsDayOutOfRangeError,
  getOwnerCollections,
  parseCollectionsDay,
  type CollectionsReport
} from "@/features/owner-collections/owner-collections";
import OwnerCollectionsScreen from "@/features/owner-collections/owner-collections-screen";
import { redirectForPath } from "@/lib/auth/redirect-for-path";

type Props = {
  searchParams: Promise<{ day?: string | string[] }>;
};

const OwnerCollectionsPage = async ({ searchParams }: Props) => {
  const access = await redirectForPath("/owner/today");

  if (!access.membership || access.membership.role !== "owner") {
    redirect("/today");
  }

  const rawDay = (await searchParams).day;
  const day = parseCollectionsDay(rawDay);

  if (rawDay !== undefined && !day) {
    redirect("/owner/today");
  }

  let report: CollectionsReport;

  try {
    report = await getOwnerCollections(
      access.supabase,
      access.membership.tenantId,
      day
    );
  } catch (error) {
    if (error instanceof CollectionsDayOutOfRangeError) {
      redirect("/owner/today");
    }

    throw error;
  }

  return <OwnerCollectionsScreen report={report} />;
};

export default OwnerCollectionsPage;
