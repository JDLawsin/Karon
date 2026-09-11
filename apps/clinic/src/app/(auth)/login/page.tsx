import AuthShell from "@/features/auth/auth-shell";
import LoginForm from "@/features/auth/login-form";
import { redirectForPath } from "@/lib/auth/redirect-for-path";

export const metadata = {
  title: "Log in"
};

const LoginPage = async () => {
  await redirectForPath("/login");

  return (
    <AuthShell title="Log in">
      <LoginForm />
    </AuthShell>
  );
};

export default LoginPage;
