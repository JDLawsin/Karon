import { entitySentence } from "@karon/claims";

export type ClaimStatus =
  | "live"
  | "building"
  | "absent"
  | "exists-not-marketed";

type OracleRef = {
  row: string;
  commit: string;
};

type ArtifactProof = {
  kind: "artifact";
  path: string;
  commit: string;
};

type BaseClaim = {
  text: string;
  oracleRef: OracleRef;
  ticket?: `KR-${number}`;
  unlocks: ReadonlyArray<string>;
  includeInLlms?: boolean;
};

type LiveClaim = BaseClaim & {
  status: "live";
  proof: ArtifactProof;
  lastVerified: `${number}-${number}-${number}`;
};

type DeferredClaim = BaseClaim & {
  status: Exclude<ClaimStatus, "live">;
};

type CompetitorFields = {
  type: "competitor";
  source: string;
  asOf: `${number}-${number}-${number}`;
  approvedBy: ReadonlyArray<string>;
};

type TestimonialFields = {
  type: "testimonial";
  consentRef: string;
};

type ProductFields = {
  type?: "product";
};

export type ClaimEntry = (LiveClaim | DeferredClaim) &
  (ProductFields | CompetitorFields | TestimonialFields);

const seededCommit = "e56899d";
const oracleCommit = "6ff7468";

export const claims = {
  "category-small-dental": {
    text: "Dental clinic software for 1 to 2 chair clinics",
    status: "live",
    oracleRef: { row: "Create clinic; profile, hours, phone, address, logo", commit: oracleCommit },
    proof: { kind: "artifact", path: "apps/clinic/src/app/(auth)/onboarding/page.tsx", commit: seededCommit },
    lastVerified: "2026-09-30",
    unlocks: []
  },
  "entity-sentence": {
    text: entitySentence,
    status: "live",
    oracleRef: { row: "Create clinic; profile, hours, phone, address, logo", commit: oracleCommit },
    proof: { kind: "artifact", path: "apps/clinic/src/app/(auth)/onboarding/page.tsx", commit: seededCommit },
    lastVerified: "2026-09-30",
    unlocks: []
  },
  "booking-link": {
    text: "Share a booking link for patient requests.",
    status: "live",
    oracleRef: { row: "Public /book/[slug] requests + accept/decline", commit: oracleCommit },
    proof: { kind: "artifact", path: "apps/clinic/src/features/booking/public-booking.ts", commit: "4d84ff6" },
    lastVerified: "2026-10-05",
    unlocks: ["booking link"],
    includeInLlms: true
  },
  "booking-inbox": {
    text: "Review booking requests in one inbox.",
    status: "live",
    oracleRef: { row: "Booking inbox UI", commit: oracleCommit },
    proof: { kind: "artifact", path: "apps/clinic/src/features/booking/booking-inbox-live.test.ts", commit: seededCommit },
    lastVerified: "2026-09-30",
    unlocks: ["booking inbox"],
    includeInLlms: true
  },
  "today-board": {
    text: "Run today's visits from one screen.",
    status: "live",
    oracleRef: { row: "Today board: walk-ins + visit status pipeline", commit: oracleCommit },
    proof: { kind: "artifact", path: "apps/clinic/src/features/today-board/project-today-board.test.ts", commit: "0d5fede" },
    lastVerified: "2026-10-05",
    unlocks: ["today board", "today screen"],
    includeInLlms: true
  },
  "secure-staff-access": {
    text: "Staff get role-based access as Owner or Assistant.",
    status: "live",
    oracleRef: { row: "Roles Owner vs Assistant in UI + server", commit: oracleCommit },
    proof: { kind: "artifact", path: "apps/clinic/src/features/staff/authorize-owner.test.ts", commit: seededCommit },
    lastVerified: "2026-09-30",
    unlocks: ["staff access"],
    includeInLlms: true
  },
  "owner-two-step": {
    text: "Owners sign in with two-step verification.",
    status: "live",
    oracleRef: { row: "Owner MFA (TOTP) + trusted devices", commit: oracleCommit },
    proof: { kind: "artifact", path: "apps/clinic/src/features/auth/mfa-form.test.tsx", commit: seededCommit },
    lastVerified: "2026-09-30",
    unlocks: []
  },
  "tenant-isolation": {
    text: "Each clinic's data is kept separate from every other clinic's.",
    status: "live",
    oracleRef: { row: "Tenant isolation (RLS)", commit: oracleCommit },
    proof: { kind: "artifact", path: "packages/db/src/rls-isolation.rls.test.ts", commit: "4d84ff6" },
    lastVerified: "2026-10-05",
    unlocks: []
  },
  "idle-lock": {
    text: "Idle screens lock automatically.",
    status: "live",
    oracleRef: { row: "Assistant invite/remove; session revoke; idle lock", commit: oracleCommit },
    proof: { kind: "artifact", path: "apps/clinic/src/features/auth/idle-lock.test.ts", commit: seededCommit },
    lastVerified: "2026-09-30",
    unlocks: []
  },
  "services-catalog": {
    text: "Keep services, prices, and visit durations together.",
    status: "live",
    oracleRef: { row: "Service catalog CRUD (names/icons)", commit: oracleCommit },
    proof: { kind: "artifact", path: "packages/db/drizzle/0019_service_prices_durations.sql", commit: seededCommit },
    lastVerified: "2026-09-30",
    unlocks: ["service prices", "visit durations"],
    includeInLlms: true
  },
  "clinic-profile": {
    text: "Manage clinic details and timezone.",
    status: "live",
    oracleRef: { row: "Create clinic; profile, hours, phone, address, logo", commit: oracleCommit },
    proof: { kind: "artifact", path: "apps/clinic/src/features/auth/clinic-settings.test.tsx", commit: "4d84ff6" },
    lastVerified: "2026-10-05",
    unlocks: ["clinic profile", "timezone"],
    includeInLlms: true
  },
  "clinic-data-export": {
    text: "Clinic owners can export patients, appointments, and payments as CSV files.",
    status: "live",
    oracleRef: { row: "Export patients, appointments, payments (CSV)", commit: oracleCommit },
    proof: { kind: "artifact", path: "apps/clinic/src/features/clinic-export/clinic-data-export.tsx", commit: "9d6ca2d" },
    lastVerified: "2026-09-30",
    unlocks: ["export clinic data"]
  },
  "clinicph-patient-staff-cap": {
    text: "ClinicPH, a multi-specialty tool rather than dental-only, lists a plan capped at 200 patients per month and 2 staff.",
    status: "live",
    oracleRef: { row: "ClinicPH pricing comparison", commit: oracleCommit },
    proof: { kind: "artifact", path: "apps/www/content/claims.ts", commit: "875321d" },
    lastVerified: "2026-10-05",
    unlocks: [],
    type: "competitor",
    source: "https://www.clinicph.health/pricing",
    asOf: "2026-10-05",
    approvedBy: ["James", "Counsel"]
  },
  "pricing-page-title": {
    text: "Pricing for small dental clinics",
    status: "live",
    oracleRef: { row: "Pricing page title", commit: oracleCommit },
    proof: { kind: "artifact", path: "apps/www/content/claims.ts", commit: "875321d" },
    lastVerified: "2026-10-05",
    unlocks: []
  },
  "pricing-page-description": {
    text: "See Karon's Philippines launch pricing band and founding-clinic program for small dental clinics.",
    status: "live",
    oracleRef: { row: "Pricing page description", commit: oracleCommit },
    proof: { kind: "artifact", path: "apps/www/content/claims.ts", commit: "875321d" },
    lastVerified: "2026-10-05",
    unlocks: []
  },
  "demo-page-title": {
    text: "Work with us as a founding clinic",
    status: "building",
    oracleRef: { row: "KR-030 approved demo heading", commit: oracleCommit },
    ticket: "KR-030",
    unlocks: []
  },
  "demo-page-description": {
    text: "Tell us about your clinic, or ask for a short demo of what Karon can do today.",
    status: "building",
    oracleRef: { row: "KR-030 approved demo description", commit: oracleCommit },
    ticket: "KR-030",
    unlocks: []
  },
  "headline-today-screen": {
    text: "Bookings land on your Today screen, not in your Messenger chats.",
    status: "exists-not-marketed",
    oracleRef: { row: "Public /book/[slug] requests + accept/decline", commit: oracleCommit },
    ticket: "KR-024",
    unlocks: []
  },
  "headline-one-inbox": {
    text: "Every booking lands in one inbox, not in your Messenger chats.",
    status: "live",
    oracleRef: { row: "Booking inbox UI", commit: oracleCommit },
    proof: { kind: "artifact", path: "apps/clinic/src/features/booking/booking-inbox-live.test.ts", commit: seededCommit },
    lastVerified: "2026-09-30",
    unlocks: ["one inbox"]
  },
  "subhead-founding": {
    text: "Built at the chair with founding clinics.",
    status: "live",
    oracleRef: { row: "Today board: walk-ins + visit status pipeline", commit: oracleCommit },
    proof: { kind: "artifact", path: "apps/clinic/src/features/today-board/today-board.tsx", commit: "0d5fede" },
    lastVerified: "2026-10-05",
    unlocks: []
  },
  "patient-records": {
    text: "Patient records",
    status: "building",
    oracleRef: { row: "Patient search + workspace", commit: oracleCommit },
    ticket: "KR-003",
    unlocks: []
  },
  "dental-chart": {
    text: "Dental chart",
    status: "building",
    oracleRef: { row: "Odontogram / quote / collect writers", commit: oracleCommit },
    ticket: "KR-004",
    unlocks: []
  },
  quotes: {
    text: "Treatment quotes",
    status: "building",
    oracleRef: { row: "Odontogram / quote / collect writers", commit: oracleCommit },
    ticket: "KR-005",
    unlocks: []
  },
  "collect-payment": {
    text: "Record patient payments",
    status: "building",
    oracleRef: { row: "Odontogram / quote / collect writers", commit: oracleCommit },
    ticket: "KR-006",
    unlocks: []
  },
  "owner-collections": {
    text: "Owner collections view",
    status: "building",
    oracleRef: { row: "Owner Collections", commit: oracleCommit },
    ticket: "KR-007",
    unlocks: []
  },
  "unsaved-work-protected": {
    text: "Protect pending chair work before sign-out.",
    status: "building",
    oracleRef: { row: "Outbox survives idle lock / sign-out", commit: oracleCommit },
    ticket: "KR-010",
    unlocks: []
  },
  "google-calendar": {
    text: "Deferred calendar connection",
    status: "exists-not-marketed",
    oracleRef: { row: "Stack / deferred", commit: oracleCommit },
    unlocks: []
  },
  "offline-durable": {
    text: "Working without a connection while keeping every pending change is not ready for public use yet.",
    status: "absent",
    oracleRef: { row: "Outbox survives idle lock / sign-out", commit: oracleCommit },
    ticket: "KR-011",
    unlocks: ["offline-first", "offline durable"]
  },
  import: {
    text: "Bringing existing records into Karon is planned before public launch.",
    status: "absent",
    oracleRef: { row: "Import / Migrate SPI", commit: oracleCommit },
    ticket: "KR-012",
    unlocks: ["import"]
  },
  "online-billing": {
    text: "Online billing is not yet open.",
    status: "absent",
    oracleRef: { row: "Trial clock / PayMongo / entitlement", commit: oracleCommit },
    ticket: "KR-018",
    unlocks: ["online billing"]
  },
  "sound-alerts": {
    text: "Sound alerts are not available.",
    status: "absent",
    oracleRef: { row: "Live inbox + soft sound", commit: oracleCommit },
    unlocks: ["sound alert", "soft sound"]
  },
  "multi-currency-locale": {
    text: "Multiple currencies and locales are not available.",
    status: "absent",
    oracleRef: { row: "Locale / currency on clinic (beyond TZ default)", commit: oracleCommit },
    ticket: "KR-016",
    unlocks: ["multi-currency", "multiple currencies"]
  },
  compliance: {
    text: "No regulatory compliance claim is made.",
    status: "absent",
    oracleRef: { row: "Trust & access", commit: oracleCommit },
    unlocks: []
  },
  "no-show-outcome": {
    text: "No no-show outcome claim is made.",
    status: "absent",
    oracleRef: { row: "Run the day / booking", commit: oracleCommit },
    unlocks: []
  }
} as const satisfies Record<string, ClaimEntry>;

export type ClaimId = keyof typeof claims;

export const claimText = (id: ClaimId) => claims[id].text;

export const liveLlmsClaims = () => Object.values(claims)
  .filter((claim) =>
    claim.status === "live" &&
    "includeInLlms" in claim &&
    claim.includeInLlms === true
  )
  .map(({ text }) => text);
