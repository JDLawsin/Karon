import { claims, type ClaimId } from "./claims";

type FeatureGroup = {
  title: string;
  description: string;
  live: ReadonlyArray<ClaimId>;
  building: ReadonlyArray<ClaimId>;
  security?: ClaimId;
};

type ChangelogEntry = {
  date: `${number}-${number}-${number}`;
  claimId: ClaimId;
  detail: string;
};

export const featureGroups = [
  {
    title: "Take bookings",
    description: "Give patients a clear way to request a visit, then review every request in one place.",
    live: ["booking-link", "booking-inbox"],
    building: [],
    security: undefined
  },
  {
    title: "Run the day",
    description: "Keep the team focused on today while clinic details and services stay close at hand.",
    live: ["today-board", "services-catalog", "clinic-profile"],
    building: [],
    security: "secure-staff-access"
  },
  {
    title: "Finish the patient",
    description: "Carry the visit from the patient record through charting and the treatment conversation.",
    live: [],
    building: ["patient-records", "dental-chart", "quotes", "unsaved-work-protected"],
    security: undefined
  },
  {
    title: "Know the money",
    description: "Record what the clinic collected and give the owner a clear daily view.",
    live: [],
    building: ["collect-payment", "owner-collections"],
    security: undefined
  }
] as const satisfies ReadonlyArray<FeatureGroup>;

export const changelog = [
  {
    date: "2026-09-30",
    claimId: "booking-inbox",
    detail: "Booking requests can now be reviewed together instead of being scattered across conversations."
  },
  {
    date: "2026-09-30",
    claimId: "today-board",
    detail: "The clinic team can keep the current day moving from one focused screen."
  },
  {
    date: "2026-09-30",
    claimId: "services-catalog",
    detail: "Service prices and expected visit durations now stay with the clinic's service list."
  }
] as const satisfies ReadonlyArray<ChangelogEntry>;

export const featureFaqs = [
  {
    question: "What can my clinic use today?",
    answer: "Today, Karon supports patient booking requests, a shared booking inbox, the daily visit board, service setup, clinic details, and role-based staff access. Every live item above includes the date when the capability was last checked."
  },
  {
    question: "What does building with founding clinics mean?",
    answer: "It means the capability is not presented as ready for daily clinic use yet. Founding clinics help shape the workflow while the Karon team builds and verifies it, without a promised release date on this page."
  },
  {
    question: "How do I see whether Karon fits my clinic?",
    answer: "Start with the live list above, then review founding clinic pricing or apply for a demo. The conversation covers how your team handles bookings and the day at the chair, including what works now and what is still being shaped."
  }
] as const;

type LiveFeatureId =
  | (typeof featureGroups)[number]["live"][number]
  | Exclude<(typeof featureGroups)[number]["security"], undefined>;

const liveFeatureIds: ReadonlyArray<LiveFeatureId> = featureGroups.flatMap(({ live, security }) =>
  security ? [...live, security] : [...live]
);

export const publishedFeatureIds = liveFeatureIds.filter((id) => {
  const claim = claims[id];
  return claim.status === "live" && "proof" in claim && "lastVerified" in claim;
});

export type PublishedFeatureId = LiveFeatureId;

export const isPublishedFeatureId = (value: string): value is PublishedFeatureId =>
  publishedFeatureIds.some((id) => id === value);

export const featuresLastUpdated = [
  ...publishedFeatureIds.map((id) => claims[id].lastVerified),
  ...changelog.map(({ date }) => date)
].sort().at(-1) ?? "2026-09-30";
