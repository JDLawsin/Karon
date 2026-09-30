import type { ClaimId } from "./claims";

export const switchingMetadata = {
  title: "Switching to Karon",
  description: "Compare Karon with a notebook and Messenger, then preview a careful move for your clinic."
} as const;

export const switchingComparison: ReadonlyArray<{
  task: string;
  notebook: string;
  karonClaimId: ClaimId;
}> = [
  {
    task: "A patient asks for a slot",
    notebook: "Replies depend on who is holding the phone and can check the notebook.",
    karonClaimId: "booking-link"
  },
  {
    task: "The team reviews new requests",
    notebook: "Messages are opened one conversation at a time.",
    karonClaimId: "booking-inbox"
  },
  {
    task: "The clinic starts the day",
    notebook: "The team reads the appointment page and talks through changes.",
    karonClaimId: "today-board"
  },
  {
    task: "Someone looks up a patient",
    notebook: "The team searches paper records and recent message threads.",
    karonClaimId: "patient-records"
  },
  {
    task: "The dentist records treatment",
    notebook: "Notes and tooth markings stay on the patient record.",
    karonClaimId: "dental-chart"
  },
  {
    task: "The clinic prepares a treatment estimate",
    notebook: "The team writes the items and totals into a separate note.",
    karonClaimId: "quotes"
  },
  {
    task: "The clinic records a payment",
    notebook: "The amount is copied into the clinic's payment log.",
    karonClaimId: "collect-payment"
  }
];

export const switchingChecklist = [
  "Choose the active patient records your team needs first.",
  "Review names and phone numbers in the source records.",
  "List the services, prices, and visit durations your clinic uses.",
  "Keep the current notebook nearby while the team checks its first days in Karon."
] as const;
