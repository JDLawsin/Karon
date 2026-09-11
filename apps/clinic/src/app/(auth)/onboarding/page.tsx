import AuthShell from "@/features/auth/auth-shell";
import OnboardingForm from "@/features/auth/onboarding-form";
import { redirectForPath } from "@/lib/auth/redirect-for-path";

export const metadata = {
  title: "Create clinic"
};

const OnboardingPage = async () => {
  await redirectForPath("/onboarding");

  return (
    <AuthShell title="Create clinic">
      <OnboardingForm />
    </AuthShell>
  );
};

export default OnboardingPage;
