import AuthShell from "@/features/auth/auth-shell";
import MfaForm from "@/features/auth/mfa-form";
import { redirectForPath } from "@/lib/auth/redirect-for-path";

export const metadata = {
  title: "Authenticator"
};

const MfaPage = async () => {
  await redirectForPath("/mfa");

  return (
    <AuthShell title="Confirm it is you">
      <MfaForm />
    </AuthShell>
  );
};

export default MfaPage;
