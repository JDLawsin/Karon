"use client";

import { PageHeader } from "@karon/design-system";

import UpdatePasswordForm from "@/features/auth/update-password-form";
import ClinicStaff from "@/features/staff/clinic-staff";
import { useClinicSession } from "@/lib/auth/clinic-session";

const ClinicSettings = () => {
  const { membership } = useClinicSession();
  const isOwner = membership.role === "owner";

  return (
    <section className="flex min-w-0 flex-col gap-6">
      <PageHeader
        description={
          isOwner
            ? "Password and signed-in devices."
            : "Change the password for this sign-in."
        }
        title="Settings"
      />
      <section className="flex max-w-xl flex-col gap-3">
        <h2 className="text-lg font-semibold">Password</h2>
        <UpdatePasswordForm passwordRecovery={false} />
      </section>
      {isOwner ? <ClinicStaff section="devices" /> : null}
    </section>
  );
};

export default ClinicSettings;
