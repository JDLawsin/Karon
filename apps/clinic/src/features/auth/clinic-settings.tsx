"use client";

import {
  Button,
  Card,
  PageHeader,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@karon/design-system";
import { Building2, LoaderCircle, Plug, User, Users } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import ClinicDetailsForm, {
  clinicDetailsFormId,
  type ClinicDetailsSaveState
} from "@/features/auth/clinic-details-form";
import ClinicStaffAvatar from "@/features/auth/clinic-staff-avatar";
import UpdatePasswordForm from "@/features/auth/update-password-form";
import ClinicBookingSettings from "@/features/google-calendar/clinic-booking-settings";
import ClinicStaff from "@/features/staff/clinic-staff";
import { useClinicSession } from "@/lib/auth/clinic-session";

const clinicTab = "clinic";
const integrationsTab = "integrations";
const membersTab = "members";
const ownerTabs = new Set([clinicTab, integrationsTab, membersTab]);

const ClinicSettings = () => {
  const { membership, userId } = useClinicSession();
  const isOwner = membership.role === "owner";
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requested = searchParams.get("tab");
  const tab =
    isOwner && requested && ownerTabs.has(requested) ? requested : "account";
  const [clinicSave, setClinicSave] = useState<ClinicDetailsSaveState>({
    canSave: false,
    saving: false
  });

  const accountLeft = (
    <div className="flex min-w-0 flex-col gap-3">
      <Card className="gap-3">
        <ClinicStaffAvatar bare role={membership.role} userId={userId} />
      </Card>
      <Card className="gap-3">
        <h2 className="text-lg font-semibold">Password</h2>
        <UpdatePasswordForm passwordRecovery={false} />
      </Card>
    </div>
  );

  const accountPanel = isOwner ? (
    <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start">
      {accountLeft}
      <ClinicStaff section="devices" />
    </div>
  ) : (
    accountLeft
  );

  return (
    <section className="flex min-w-0 w-full flex-col gap-3">
      <PageHeader
        description={
          isOwner
            ? "Account, clinic, integrations, and members."
            : "Change the password for this sign-in."
        }
        title="Settings"
      />
      {isOwner ? (
        <Tabs
          className="gap-3"
          onValueChange={(value) => {
            const next = ownerTabs.has(value) ? value : "account";
            const params = new URLSearchParams(searchParams.toString());

            if (next === "account") {
              params.delete("tab");
            } else {
              params.set("tab", next);
            }

            const query = params.toString();
            router.replace(query ? `${pathname}?${query}` : pathname, {
              scroll: false
            });
          }}
          value={tab}
        >
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <TabsList aria-label="Settings">
              <TabsTrigger className="px-3" value="account">
                <User aria-hidden />
                Account
              </TabsTrigger>
              <TabsTrigger className="px-3" value={clinicTab}>
                <Building2 aria-hidden />
                Clinic
              </TabsTrigger>
              <TabsTrigger className="px-3" value={integrationsTab}>
                <Plug aria-hidden />
                Integrations
              </TabsTrigger>
              <TabsTrigger className="px-3" value={membersTab}>
                <Users aria-hidden />
                Members
              </TabsTrigger>
            </TabsList>
            {tab === clinicTab ? (
              <Button
                aria-busy={clinicSave.saving}
                className="w-full shrink-0 sm:w-auto"
                disabled={!clinicSave.canSave || clinicSave.saving}
                form={clinicDetailsFormId}
                type="submit"
              >
                {clinicSave.saving ? (
                  <LoaderCircle aria-hidden className="animate-spin" />
                ) : null}
                Save clinic details
              </Button>
            ) : null}
          </div>
          <TabsContent className="w-full min-w-0" value="account">
            {accountPanel}
          </TabsContent>
          <TabsContent className="w-full min-w-0" value={clinicTab}>
            <ClinicDetailsForm onSaveStateChange={setClinicSave} />
          </TabsContent>
          <TabsContent className="w-full min-w-0" value={integrationsTab}>
            <ClinicBookingSettings />
          </TabsContent>
          <TabsContent className="w-full min-w-0" value={membersTab}>
            <ClinicStaff section="staff" />
          </TabsContent>
        </Tabs>
      ) : (
        accountPanel
      )}
    </section>
  );
};

export default ClinicSettings;
