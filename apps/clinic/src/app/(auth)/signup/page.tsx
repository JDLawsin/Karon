import AuthShell from "@/features/auth/auth-shell";
import SignupForm from "@/features/auth/signup-form";
import { redirectForPath } from "@/lib/auth/redirect-for-path";

export const metadata = {
  title: "Create account"
};

const SignupPage = async () => {
  await redirectForPath("/signup");

  return (
    <AuthShell title="Create account">
      <SignupForm />
    </AuthShell>
  );
};

export default SignupPage;
