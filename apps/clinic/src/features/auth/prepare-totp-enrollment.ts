type TotpFactor = {
  id: string;
  factor_type: string;
  status: string;
};

type FactorList = {
  all?: TotpFactor[] | null;
  totp?: TotpFactor[] | null;
};

type TotpEnrollmentPlan =
  | { kind: "challenge"; factorId: string }
  | { kind: "enroll"; dropIds: string[] };

const prepareTotpEnrollment = (factors: FactorList): TotpEnrollmentPlan => {
  const verified = (factors.totp ?? []).find(
    (factor) => factor.status === "verified"
  );

  if (verified) {
    return { kind: "challenge", factorId: verified.id };
  }

  const dropIds = (factors.all ?? [])
    .filter(
      (factor) =>
        factor.factor_type === "totp" && factor.status === "unverified"
    )
    .map((factor) => factor.id);

  return { kind: "enroll", dropIds };
};

export { prepareTotpEnrollment };
export type { FactorList, TotpEnrollmentPlan, TotpFactor };
