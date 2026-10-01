import { claims, claimText, type ClaimId } from "./claims";

type SecurityControlDefinition = {
  claimId: ClaimId;
  explanation: string;
};

const securityControlDefinitions = [
  {
    claimId: "owner-two-step",
    explanation: "Owners complete a second sign-in step before entering the clinic."
  },
  {
    claimId: "secure-staff-access",
    explanation: "Each staff account is assigned the Owner or Assistant role."
  },
  {
    claimId: "tenant-isolation",
    explanation: "Access rules keep one clinic's records apart from another clinic's records."
  },
  {
    claimId: "idle-lock",
    explanation: "The screen locks after a period without activity, so staff must unlock it before continuing."
  }
] as const satisfies ReadonlyArray<SecurityControlDefinition>;

const hasLiveProof = (claimId: ClaimId) => {
  const claim = claims[claimId];

  return claim.status === "live" && "proof" in claim && "lastVerified" in claim;
};

export const securityControls = securityControlDefinitions.filter(({ claimId }) => hasLiveProof(claimId));

const securityFaqDefinitions = [
  {
    claimId: "owner-two-step",
    question: "How do clinic owners sign in?"
  },
  {
    claimId: "secure-staff-access",
    question: "What access can staff have?"
  },
  {
    claimId: "tenant-isolation",
    question: "How is each clinic's data separated?"
  },
  {
    claimId: "idle-lock",
    question: "What happens when a screen is left idle?"
  }
] as const satisfies ReadonlyArray<{ claimId: ClaimId; question: string }>;

export const securityFaqs = securityFaqDefinitions
  .filter(({ claimId }) => hasLiveProof(claimId))
  .map(({ claimId, question }) => ({ claimId, question, answer: claimText(claimId) }));

export const securityPageCopy = {
  title: "Security at Karon",
  description: "Plain facts about how Karon controls access to clinic data.",
  controlsHeading: "Controls available today",
  faqHeading: "Security questions, answered",
  disclosure: "Found a security issue? Here's how to report it."
} as const;
