import ClinicStaff from "@/features/staff/clinic-staff";

export const metadata = {
  title: "Clinic"
};

const OwnerClinicPage = () => (
  <section className="flex flex-col gap-6">
    <h1 className="text-2xl font-semibold">Clinic</h1>
    <ClinicStaff />
  </section>
);

export default OwnerClinicPage;
