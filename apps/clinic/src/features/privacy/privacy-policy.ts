const BOOKING_PRIVACY_NOTICE = {
  version: "2026-09-29-design-partner-v1",
  summary: (clinicName: string) =>
    `${clinicName} uses your name, mobile number, chosen service, requested time, and optional note to handle this booking request. Karon stores this information for the clinic and does not sell it.`,
  acknowledgment: "I acknowledge this privacy notice before requesting a booking.",
  counselNotice:
    "This founder-drafted notice supports invited design-partner use. It is not legal advice or open-production approval. Karon remains blocked from open self-serve production until counsel approves the privacy pack.",
  controller: (clinicName: string) =>
    `${clinicName} decides why patient and booking information is collected and is responsible for your care record. Karon stores and processes that information for the clinic to operate the booking service.`,
  collected: [
    "Your name and mobile number.",
    "The service, date, and time you request.",
    "Any optional note you enter. Please do not use the note for emergencies or include more health detail than the clinic needs to arrange the visit.",
    "A privacy-notice version and acknowledgment time when you send the request.",
    "Limited technical information used by Cloudflare Turnstile to prevent abuse."
  ],
  use: "The clinic and Karon use the information to receive your request, check the requested slot, contact you, arrange the visit, keep the clinic schedule, and protect the public form from spam. A request is not a confirmed appointment until the clinic accepts it.",
  recipients:
    "Authorized clinic staff can receive the request. Karon and the infrastructure providers needed to host, secure, and deliver the service process only what is needed for those jobs. Karon does not sell patient lists or use clinic records to train public AI models.",
  retention:
    "Import source files are deleted after processing, with a 24-hour cleanup path for abandoned uploads. The clinic controls treatment-record retention. Karon does not yet have a counsel-approved automatic deletion period for booking requests; they currently remain with the clinic record while its account is active. Open production is blocked until that schedule is approved and published.",
  rights:
    "You may ask the clinic to explain, access, or correct your information, and to assess an objection or deletion request. Some records may need to be retained for care or legal reasons. Acknowledging this notice does not waive your rights.",
  clinicContactFallback:
    "Contact the clinic that invited you or provided its booking link.",
  clinicAgreement:
    "Clinic Owners can download the design-partner processing-agreement template. The clinic and Karon must complete it for the actual deployment, and counsel approval is still required before open production.",
  processingAgreementDownload:
    "/legal/karon-processing-agreement-design-partner-template.md"
} as const;

export { BOOKING_PRIVACY_NOTICE };
