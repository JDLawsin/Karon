import { pendingClinicEvents } from "@/lib/db/clinic-db";

const exportPendingClinicWork = async (tenantId: string) => {
  const events = await pendingClinicEvents(tenantId);
  const blob = new Blob(
    [
      JSON.stringify(
        {
          format: "karon-pending-clinic-events",
          version: 1,
          exportedAt: new Date().toISOString(),
          events
        },
        null,
        2
      )
    ],
    { type: "application/json" }
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = `karon-pending-work-${new Date().toISOString().slice(0, 10)}.json`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
};

export { exportPendingClinicWork };
