import AuthShell from "@/features/auth/auth-shell";
import UpdatePasswordForm from "@/features/auth/update-password-form";
import { redirectForPath } from "@/lib/auth/redirect-for-path";

export const metadata = {
  title: "Choose a new password"
};

const UpdatePasswordPage = async () => {
  const access = await redirectForPath("/update-password");

  return (
    <AuthShell title="Choose a new password">
      <UpdatePasswordForm passwordRecovery={access.passwordRecovery} />
    </AuthShell>
  );
};

export default UpdatePasswordPage;
