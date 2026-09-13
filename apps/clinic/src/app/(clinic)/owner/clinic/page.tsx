import { redirect } from "next/navigation";

export const metadata = {
  title: "Clinic"
};

const OwnerClinicPage = () => {
  redirect("/settings?tab=clinic");
};

export default OwnerClinicPage;
