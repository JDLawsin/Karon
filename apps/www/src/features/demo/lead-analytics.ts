const submittedIds = new Set<string>();

type LeadSubmitted = {
  submissionId: string;
  intent: "application" | "demo";
  clinicSize: "1_chair" | "2_chairs" | "3_plus";
};

const trackLeadSubmitted = (lead: LeadSubmitted) => {
  if (submittedIds.has(lead.submissionId)) return;
  submittedIds.add(lead.submissionId);
  window.dispatchEvent(new CustomEvent("karon:lead_submitted", {
    detail: { intent: lead.intent, clinic_size: lead.clinicSize }
  }));
};

export { trackLeadSubmitted };
export type { LeadSubmitted };
