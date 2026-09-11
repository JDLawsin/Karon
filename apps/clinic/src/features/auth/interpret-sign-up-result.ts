type SignUpUser = {
  identities?: { id: string }[] | null;
};

type SignUpSession = object;

type SignUpError = object;

type SignUpPayload = {
  user: SignUpUser | null;
  session: SignUpSession | null;
  error: SignUpError | null;
};

type SignUpOutcome =
  | { kind: "failed" }
  | { kind: "alreadyRegistered" }
  | { kind: "needsConfirm" }
  | { kind: "signedIn" };

const interpretSignUpResult = ({
  user,
  session,
  error
}: SignUpPayload): SignUpOutcome => {
  if (error) {
    return { kind: "failed" };
  }

  if (session) {
    return { kind: "signedIn" };
  }

  if (Array.isArray(user?.identities) && user.identities.length === 0) {
    return { kind: "alreadyRegistered" };
  }

  if (user) {
    return { kind: "needsConfirm" };
  }

  return { kind: "failed" };
};

export { interpretSignUpResult };
export type { SignUpOutcome, SignUpPayload };
