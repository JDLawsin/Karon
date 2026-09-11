import type { ReactNode } from "react";

import { redirectForPath } from "@/lib/auth/redirect-for-path";

type Props = {
  children: ReactNode;
};

const OwnerLayout = async ({ children }: Props) => {
  await redirectForPath("/owner/today");
  return children;
};

export default OwnerLayout;
