import type { ClaimId } from "./claims";

export const headlineProof = {
  commit: null,
  autoConfirmOff: false,
  autoConfirmOn: false
} as const;

export const headlineClaimId = (): ClaimId =>
  headlineProof.autoConfirmOff && headlineProof.autoConfirmOn
    ? "headline-today-screen"
    : "headline-one-inbox";
