export const LEGAL_NOTICE_VERSION = "2026-10-01-draft";

type LegalApproval =
  | { status: "pending"; approvedAt: null; approvedBy: null }
  | {
      status: "approved";
      approvedAt: `${number}-${number}-${number}`;
      approvedBy: string;
    };

type LegalLaunchConfig = {
  approval: LegalApproval;
  noticeVersion: string;
  retentionDays: string | undefined;
};

export const legalApproval = {
  status: "pending",
  approvedAt: null,
  approvedBy: null
} as const satisfies LegalApproval;

export const parseLeadRetentionDays = (value: string | undefined) => {
  const days = Number(value);
  return Number.isInteger(days) && days >= 1 && days <= 3_650 ? days : null;
};

const currentLegalLaunchConfig = (): LegalLaunchConfig => ({
  approval: legalApproval,
  noticeVersion: LEGAL_NOTICE_VERSION,
  retentionDays: process.env.LEAD_RETENTION_DAYS
});

const isIsoDate = (value: string) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export const legalLaunchReady = (
  config: LegalLaunchConfig = currentLegalLaunchConfig()
) => config.approval.status === "approved"
  && isIsoDate(config.approval.approvedAt)
  && config.approval.approvedBy.trim().length > 0
  && !config.noticeVersion.endsWith("-draft")
  && parseLeadRetentionDays(config.retentionDays) !== null;

export const assertLegalLeadCapture = (
  environment: string | undefined,
  leadFormEnabled: boolean,
  config: LegalLaunchConfig = currentLegalLaunchConfig()
) => {
  if (environment === "production" && leadFormEnabled && !legalLaunchReady(config)) {
    throw new Error(
      "Lead capture requires final counsel-approved notices, recorded approval, and an approved retention period."
    );
  }
};

export const readLegalContactEmail = (
  value: string | undefined,
  environment = process.env.NODE_ENV
) => {
  const email = value?.trim();
  if (email && /^[^\s@]+@[^\s@]+$/u.test(email)) return email;
  if (environment === "production") {
    throw new Error("LEGAL_CONTACT_EMAIL is required for the production privacy notice.");
  }
  return "privacy@example.test";
};
