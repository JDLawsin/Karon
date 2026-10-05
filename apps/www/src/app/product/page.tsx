import { pageMetadata } from "@/lib/page-metadata";
import ProductPage from "@/features/product/product-page";

const title = "Product";
const description = "See how Karon carries a patient request from booking to the clinic's Today board.";

export const dynamic = "force-static";
export const metadata = pageMetadata("/product", title, description);

const Page = () => <ProductPage />;

export default Page;
