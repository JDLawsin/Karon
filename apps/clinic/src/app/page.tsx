import { redirectForPath } from "@/lib/auth/redirect-for-path";

const HomePage = async () => {
  await redirectForPath("/");
  return null;
};

export default HomePage;
