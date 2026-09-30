import { claimText, type ClaimId } from "./claims";

export const homepageLiveSteps = [
  {
    id: "booking-link",
    title: "Share your booking link"
  },
  {
    id: "booking-inbox",
    title: "Review every request"
  },
  {
    id: "today-board",
    title: "Run today from one screen"
  }
] as const satisfies ReadonlyArray<{
  id: ClaimId;
  title: string;
}>;

export const homepageRoadmap = [
  {
    id: "dental-chart",
    title: "Finish the patient"
  },
  {
    id: "import",
    title: "Bring your list in"
  },
  {
    id: "owner-collections",
    title: "Know tonight's money"
  }
] as const satisfies ReadonlyArray<{
  id: ClaimId;
  title: string;
}>;

export const homepageTrustClaimIds = [
  "owner-two-step",
  "secure-staff-access",
  "tenant-isolation",
  "idle-lock"
] as const satisfies ReadonlyArray<ClaimId>;

export const homepageFaqs = [
  {
    question: "What can my clinic use today?",
    answer: [
      claimText("booking-link"),
      claimText("booking-inbox"),
      claimText("today-board"),
      claimText("secure-staff-access"),
      claimText("clinic-profile"),
      claimText("services-catalog"),
      "The roadmap stays separately labeled so clinics can distinguish what works now from what comes next."
    ].join(" ")
  },
  {
    question: "Can Karon keep every change without a connection?",
    answer: `${claimText("offline-durable")} The complete visit promise is still being finished and verified. Karon will not market it until release evidence passes. Founding clinics receive a clear walkthrough of current limits during setup, so teams do not have to assume unfinished behavior is available.`
  },
  {
    question: "Who is Karon built for?",
    answer: `${claimText("entity-sentence")} The owner chooses the software while an assistant may use it throughout the day. The product stays focused on that small team instead of becoming a broad hospital or multi-branch system.`
  },
  {
    question: "How do founding clinics take part?",
    answer: "Apply through the short clinic form or book a demo. We will learn how your team handles bookings and the daily chair workflow, then explain what is live and what is still being shaped. There is no public self-serve signup while founding clinics are testing the full visit."
  }
] as const;
