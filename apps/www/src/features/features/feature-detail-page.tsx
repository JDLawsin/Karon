import { Button, StatusBadge } from "@karon/design-system";
import Link from "next/link";

import { claims } from "../../../content/claims";
import type { PublishedFeatureId } from "../../../content/features";
import Claim from "../claim/claim";

type Props = {
  id: PublishedFeatureId;
};

const FeatureDetailPage = ({ id }: Props) => {
  const claim = claims[id];

  return (
    <main data-page="feature-detail">
      <section className="mx-auto flex min-h-[60svh] max-w-5xl flex-col justify-center gap-5 px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <StatusBadge className="self-start" tone="primary">Live now</StatusBadge>
        <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl"><Claim id={id} /></h1>
        <p className="text-sm text-muted-foreground">Checked {claim.lastVerified}</p>
        <p className="max-w-2xl text-lg text-muted-foreground">This capability is available in Karon today. Talk with us to see how it fits your clinic&apos;s current workflow.</p>
        <div className="flex flex-col items-start gap-3 sm:flex-row">
          <Button asChild><Link href="/demo?intent=application">Apply as a founding clinic</Link></Button>
          <Button asChild variant="outline"><Link href="/pricing">See pricing for founding clinics</Link></Button>
        </div>
        <Link className="inline-flex min-h-11 items-center self-start font-semibold text-primary underline-offset-4 hover:underline" href="/features">Back to what works today</Link>
      </section>
    </main>
  );
};

export default FeatureDetailPage;
