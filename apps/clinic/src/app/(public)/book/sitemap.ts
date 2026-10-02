import type { MetadataRoute } from "next";

import { loadIndexableBookingPages } from "@/features/booking/public-booking";
import { clinicAppUrl } from "@/lib/server-env";

export const dynamic = "force-dynamic";

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const pages = await loadIndexableBookingPages();

  return pages.map(({ slug, updatedAt }) => ({
    url: clinicAppUrl(`/book/${encodeURIComponent(slug)}`).toString(),
    lastModified: updatedAt
  }));
};

export default sitemap;
