import { PageHeader } from "@karon/design-system";

import ClinicDetailsForm from "@/features/auth/clinic-details-form";
import ClinicStaff from "@/features/staff/clinic-staff";

export const metadata = {
  title: "Clinic"
};

const OwnerClinicPage = () => (
  <section className="flex min-w-0 flex-col gap-6">
    <PageHeader
      description="Clinic details, staff, and signed-in devices."
      title="Clinic"
    />
    <ClinicDetailsForm />
    <ClinicStaff />
  </section>
);

export default OwnerClinicPage;
