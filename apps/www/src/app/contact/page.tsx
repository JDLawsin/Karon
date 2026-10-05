import ContactPage from "@/features/contact/contact-page";
import { pageMetadata } from "@/lib/page-metadata";

const title = "Contact Karon";
const description = "Email Karon about your clinic, ask a product question, or request a guided demo.";

export const dynamic = "force-static";
export const metadata = pageMetadata("/contact", title, description);

const isEmail = (value: string | undefined) => Boolean(
  value && /^[^\s@]+@[^\s@]+$/u.test(value)
);

const ContactRoute = () => {
  const configuredContactEmail = process.env.LEAD_CONTACT_EMAIL?.trim();
  const configuredResponsePromise = process.env.LEAD_RESPONSE_PROMISE?.trim();

  return (
    <ContactPage
      contactEmail={isEmail(configuredContactEmail) ? configuredContactEmail : undefined}
      responsePromise={configuredResponsePromise || undefined}
    />
  );
};

export default ContactRoute;
