import AuthShell from "@/features/auth/auth-shell";
import OnboardingForm from "@/features/auth/onboarding-form";
import { redirectForPath } from "@/lib/auth/redirect-for-path";

export const metadata = {
  title: "Set up your clinic"
};

const OnboardingPage = async () => {
  await redirectForPath("/onboarding");

  return (
    <AuthShell title="Set up your clinic" wide>
      <OnboardingForm />
    </AuthShell>
  );
};

export default OnboardingPage;
