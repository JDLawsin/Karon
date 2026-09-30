import { pageMetadata } from "@/lib/page-metadata";
import SwitchingPage from "@/features/switching/switching-page";
import { switchingMetadata } from "../../../content/switching";

export const dynamic = "force-static";
export const metadata = pageMetadata(
  "/switching",
  switchingMetadata.title,
  switchingMetadata.description
);

const Page = () => <SwitchingPage />;

export default Page;
