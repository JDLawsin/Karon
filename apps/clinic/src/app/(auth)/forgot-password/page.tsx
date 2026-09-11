import AuthShell from "@/features/auth/auth-shell";
import ForgotPasswordForm from "@/features/auth/forgot-password-form";
import { redirectForPath } from "@/lib/auth/redirect-for-path";

export const metadata = {
  title: "Forgot password"
};

const ForgotPasswordPage = async () => {
  await redirectForPath("/forgot-password");

  return (
    <AuthShell title="Forgot password">
      <ForgotPasswordForm />
    </AuthShell>
  );
};

export default ForgotPasswordPage;
