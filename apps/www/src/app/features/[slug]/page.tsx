import { notFound } from "next/navigation";

import { pageMetadata } from "@/lib/page-metadata";
import FeatureDetailPage from "@/features/features/feature-detail-page";
import { claims } from "../../../../content/claims";
import {
  isPublishedFeatureId,
  publishedFeatureIds
} from "../../../../content/features";

type Props = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-static";
export const dynamicParams = false;

export const generateStaticParams = () => publishedFeatureIds.map((slug) => ({ slug }));

export const generateMetadata = async ({ params }: Props) => {
  const { slug } = await params;
  if (!isPublishedFeatureId(slug)) return {};

  const claim = claims[slug];
  return pageMetadata(`/features/${slug}`, claim.text, claim.text);
};

const FeaturePage = async ({ params }: Props) => {
  const { slug } = await params;
  if (!isPublishedFeatureId(slug)) notFound();

  return <FeatureDetailPage id={slug} />;
};

export default FeaturePage;
