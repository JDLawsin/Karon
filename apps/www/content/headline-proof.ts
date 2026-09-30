export const headlineProof = {
  commit: null,
  autoConfirmOff: false,
  autoConfirmOn: false
} as const;

export const headlineClaimId = (): "headline-today-screen" | "headline-one-inbox" =>
  headlineProof.autoConfirmOff && headlineProof.autoConfirmOn
    ? "headline-today-screen"
    : "headline-one-inbox";
